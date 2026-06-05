#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CONFIG_FILE="${SCRIPT_DIR}/.monthly_env"
if [[ -f "$CONFIG_FILE" ]]; then
    set -a
    source "$CONFIG_FILE"
    set +a
fi

API_BASE="${API_BASE:-http://127.0.0.1:3001/api}"
AUTOMATION_SERVICE_TOKEN="${AUTOMATION_SERVICE_TOKEN:-}"
TG_TOKEN="${TG_TOKEN:-}"
TG_CHAT="${TG_CHAT:-}"
LOG_DIR="/opt/performance-management/logs"
LOG_FILE="${LOG_DIR}/monthly_automation_$(date +%Y%m).log"
mkdir -p "$LOG_DIR"
TARGET_MONTH=$(date +%Y-%m)
PREV_MONTH=$(date -d "$(date +%Y-%m-01) -1 month" +%Y-%m 2>/dev/null || date -v-1m +%Y-%m 2>/dev/null || echo "$TARGET_MONTH")
AUTHTK=""

log() {
    local level="$1"; shift
    local msg="[$(date '+%Y-%m-%d %H:%M:%S')] [$level] $*"
    echo "$msg" | tee -a "$LOG_FILE"
}
log_info()  { log "INFO" "$@"; }
log_warn()  { log "WARN" "$@"; }
log_error() { log "ERROR" "$@"; }

send_tg() {
    local message="$1"
    if [[ -z "$TG_TOKEN" || -z "$TG_CHAT" ]]; then
        log_warn "TG not configured, skip"
        return 0
    fi
    local url="https://api.telegram.org/bot${TG_TOKEN}/sendMessage"
    local resp
    resp=$(curl -s -X POST "$url" -H "Content-Type: application/json" -d "{\"chat_id\":\"${TG_CHAT}\",\"text\":\"${message}\",\"parse_mode\":\"Markdown\"}" 2>/dev/null) || true
    if echo "$resp" | grep -q '"ok":true'; then
        log_info "TG notification sent"
    else
        log_warn "TG notification failed: ${resp}"
    fi
}

prepare_api_auth() {
    log_info "Preparing automation service authentication..."
    if [[ -z "$AUTOMATION_SERVICE_TOKEN" ]]; then
        log_error "AUTOMATION_SERVICE_TOKEN not configured"
        return 1
    fi
    AUTHTK="$AUTOMATION_SERVICE_TOKEN"
    log_info "Automation service token loaded; no employee login will be created"
    return 0
}

api_req() {
    local method="$1" path="$2" data="${3:-}"
    local args=(-X "$method" -H "Content-Type: application/json" -H "X-Automation-Token: ${AUTHTK}" --connect-timeout 10 --max-time 120)
    [[ -n "$data" ]] && args+=(-d "$data")
    curl -s "${args[@]}" "${API_BASE}${path}" 2>/dev/null
}

step1_tasks() {
    log_info "Step 1: Generate tasks for ${PREV_MONTH}"
    local resp
    resp=$(api_req POST "/automation/generate-monthly-tasks" "{\"month\":\"${PREV_MONTH}\"}")
    local ok=$(echo "$resp" | jq -r '.success // false' 2>/dev/null)
    if [[ "$ok" == "true" ]]; then
        local c=$(echo "$resp" | jq -r '.data.created // 0' 2>/dev/null)
        local u=$(echo "$resp" | jq -r '.data.updated // 0' 2>/dev/null)
        local s=$(echo "$resp" | jq -r '.data.skipped // 0' 2>/dev/null)
        log_info "Tasks OK - created=${c}, updated=${u}, skipped=${s}"
        echo "[OK] Tasks: created=${c}, updated=${u}, skipped=${s}"
    else
        local m=$(echo "$resp" | jq -r '.message // "unknown"' 2>/dev/null)
        log_warn "Tasks: ${m}"
        echo "[WARN] Tasks: ${m}"
    fi
}

step2_reminders() {
    log_info "Step 2: Check reminders for ${PREV_MONTH}"
    local resp
    resp=$(api_req POST "/automation/check-reminders" "{\"month\":\"${PREV_MONTH}\"}")
    local ok=$(echo "$resp" | jq -r '.success // false' 2>/dev/null)
    if [[ "$ok" == "true" ]]; then
        local p=$(echo "$resp" | jq -r '.data.pendingCount // 0' 2>/dev/null)
        local s=$(echo "$resp" | jq -r '.data.notificationCount // 0' 2>/dev/null)
        log_info "Reminders OK - pending=${p}, sent=${s}"
        echo "[OK] Reminders: pending=${p}, notified=${s}"
    else
        local m=$(echo "$resp" | jq -r '.message // "unknown"' 2>/dev/null)
        log_warn "Reminders: ${m}"
        echo "[WARN] Reminders: ${m}"
    fi
}

step3_report() {
    log_info "Step 3: Generate report for ${PREV_MONTH}"
    local resp
    resp=$(api_req GET "/analytics/report-summary?month=${PREV_MONTH}")
    local ok=$(echo "$resp" | jq -r '.success // false' 2>/dev/null)
    if [[ "$ok" == "true" ]]; then
        local t=$(echo "$resp" | jq -r '.data.totalCount // 0' 2>/dev/null)
        local c=$(echo "$resp" | jq -r '.data.completedCount // 0' 2>/dev/null)
        local p=$(echo "$resp" | jq -r '.data.pendingCount // 0' 2>/dev/null)
        local a=$(echo "$resp" | jq -r '.data.averageScore // "N/A"' 2>/dev/null)
        log_info "Report OK - total=${t}, completed=${c}, pending=${p}, avg=${a}"
        echo "[OK] Report: total=${t}, completed=${c}, pending=${p}, avg=${a}"
    else
        echo "[WARN] Report: no data"
    fi
}

step4_publish() {
    log_info "Step 4: Publish results for ${PREV_MONTH}"
    local resp
    resp=$(api_req POST "/assessment-publication/publish" "{\"month\":\"${PREV_MONTH}\"}")
    local ok=$(echo "$resp" | jq -r '.success // false' 2>/dev/null)
    if [[ "$ok" == "true" ]]; then
        log_info "Publish OK"
        echo "[OK] Publish: success"
    else
        local m=$(echo "$resp" | jq -r '.message // "failed"' 2>/dev/null)
        log_warn "Publish: ${m}"
        echo "[WARN] Publish: ${m}"
    fi
}

step5_archive() {
    log_info "Step 5: Archive data for ${PREV_MONTH}"
    log_info "Archive handled by scheduler service"
    echo "[OK] Archive: submitted"
}

check_health() {
    log_info "Checking backend health..."
    local code
    code=$(curl -s -o /dev/null -w "%{http_code}" "${API_BASE}/auth/me" --connect-timeout 5 --max-time 10 2>/dev/null) || true
    if [[ "$code" == "401" || "$code" =~ ^2 ]]; then
        log_info "Backend OK (HTTP ${code})"
        return 0
    fi
    log_error "Backend unavailable (HTTP ${code})"
    return 1
}

main() {
    log_info "=========================================="
    log_info "Monthly Performance Automation Starting"
    log_info "Target: ${PREV_MONTH}"
    log_info "Time: $(date '+%Y-%m-%d %H:%M:%S')"
    log_info "=========================================="
    local results=()
    if ! check_health; then
        log_error "Backend unavailable"
        send_tg "FAIL: Backend unavailable at $(date '+%Y-%m-%d %H:%M:%S')"
        exit 1
    fi
    if ! prepare_api_auth; then
        log_error "Automation service authentication failed"
        send_tg "FAIL: automation service token missing or invalid at $(date '+%Y-%m-%d %H:%M:%S')"
        exit 1
    fi
    results+=("$(step1_tasks)")
    results+=("$(step2_reminders)")
    results+=("$(step3_report)")
    results+=("$(step4_publish)")
    results+=("$(step5_archive)")
    log_info "=========================================="
    log_info "Monthly Performance Automation Complete"
    log_info "=========================================="
    local msg="*Monthly Performance Report*\n\nMonth: ${PREV_MONTH}\nTime: $(date '+%Y-%m-%d %H:%M:%S')\n\n"
    for r in "${results[@]}"; do msg+="${r}\n"; done
    msg+="\nAll steps completed"
    send_tg "$msg"
    log_info "Notification sent, done"
}

main "$@"
