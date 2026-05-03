#!/usr/bin/env bash
# 生成或同步绩效系统 -> 薪资系统的共享推送 token。
# 这个 token 不是薪资系统运行时自动生成的，而是部署/运维时统一写入两个系统 .env。

set -euo pipefail

PERFORMANCE_ENV="${PERFORMANCE_ENV:-/opt/performance-management/.env}"
SALARY_ENV="${SALARY_ENV:-/opt/salary/.env}"
TOKEN_NAME="${TOKEN_NAME:-SALARY_SYSTEM_PUSH_TOKEN}"
ROTATE=false

usage() {
  cat <<'EOF'
用法:
  scripts/sync-salary-token.sh [--rotate]

说明:
  - 默认读取现有 token；如果不存在，则自动生成一个 64 位十六进制 token。
  - 加 --rotate 会强制生成新 token，并同步写入绩效系统和薪资系统的 .env。
  - 也可以通过环境变量 TOKEN 指定固定 token。

可选环境变量:
  PERFORMANCE_ENV=/opt/performance-management/.env
  SALARY_ENV=/opt/salary/.env
  TOKEN=手动指定的共享token
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --rotate)
      ROTATE=true
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "未知参数: $1" >&2
      usage >&2
      exit 2
      ;;
  esac
done

read_env_value() {
  local file="$1"
  local key="$2"
  [[ -f "$file" ]] || return 0
  grep -E "^${key}=" "$file" | tail -1 | cut -d= -f2- || true
}

generate_token() {
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -hex 32
  elif command -v python3 >/dev/null 2>&1; then
    python3 -c 'import secrets; print(secrets.token_hex(32))'
  else
    echo "缺少 openssl 或 python3，无法生成安全 token" >&2
    exit 1
  fi
}

upsert_env_value() {
  local file="$1"
  local key="$2"
  local value="$3"
  mkdir -p "$(dirname "$file")"
  touch "$file"

  if grep -qE "^${key}=" "$file"; then
    local escaped_value
    escaped_value="$(printf '%s' "$value" | sed 's/[\/&]/\\&/g')"
    sed -i.bak "s/^${key}=.*/${key}=${escaped_value}/" "$file"
    rm -f "${file}.bak"
  else
    printf '\n%s=%s\n' "$key" "$value" >> "$file"
  fi
}

TOKEN="${TOKEN:-}"

if [[ -z "$TOKEN" && "$ROTATE" != true ]]; then
  TOKEN="$(read_env_value "$PERFORMANCE_ENV" "$TOKEN_NAME")"
fi

if [[ -z "$TOKEN" && "$ROTATE" != true ]]; then
  TOKEN="$(read_env_value "$SALARY_ENV" "$TOKEN_NAME")"
fi

if [[ -z "$TOKEN" || "$ROTATE" == true ]]; then
  TOKEN="$(generate_token)"
fi

upsert_env_value "$PERFORMANCE_ENV" "$TOKEN_NAME" "$TOKEN"
upsert_env_value "$SALARY_ENV" "$TOKEN_NAME" "$TOKEN"

chmod 600 "$PERFORMANCE_ENV" "$SALARY_ENV" 2>/dev/null || true
chown salary:salary "$SALARY_ENV" 2>/dev/null || true

echo "已同步 ${TOKEN_NAME} 到:"
echo "  - ${PERFORMANCE_ENV}"
echo "  - ${SALARY_ENV}"
echo "token 已生成/同步；为安全起见不在终端显示明文。"
