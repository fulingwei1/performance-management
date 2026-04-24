#!/usr/bin/env python3
"""
UAT: 10+人绩效打分全流程验证（本地/测试环境）

验证点：
1) 员工提交工作总结（/api/performance/summary）
2) 上级（经理）能看到下属写的工作总结（/api/performance/team-records）
3) 上级给下级打分（/api/performance/score）
4) 员工能看到上级打分结果（/api/performance/my-record/:month）
5)（可选）权限边界：非直属上级/非本人不可看、不可打分

用法示例：
  API_URL=http://localhost:3001 \\
    python backend/scripts/uat_performance_flow.py --month 2026-04 \\
    --out backend/uat_reports/uat_performance_flow_2026-04.md
"""

from __future__ import annotations

import argparse
import datetime as _dt
import os
import sys
import time
from typing import Any, Dict, List, Optional, Tuple

try:
    import requests
except ImportError:
    print("Please install: pip install requests")
    sys.exit(1)


DEFAULT_PARTICIPANTS = [
    # 3个经理 x 5个下属 = 15名员工（“十几个人”）
    {"managerId": "m011", "employees": ["e002", "e006", "e010", "e012", "e013"]},
    {"managerId": "m006", "employees": ["e001", "e021", "e028", "e035", "e047"]},
    {"managerId": "m008", "employees": ["e004", "e009", "e020", "e044", "e065"]},
]


def _now_month() -> str:
    now = _dt.datetime.now()
    return f"{now.year}-{now.month:02d}"


def _http_json(
    method: str,
    url: str,
    token: Optional[str] = None,
    params: Optional[Dict[str, Any]] = None,
    payload: Optional[Dict[str, Any]] = None,
    timeout: int = 15,
    retries: int = 2,
) -> Tuple[int, Dict[str, Any]]:
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    last_status = 0
    last_data: Dict[str, Any] = {}
    for attempt in range(retries + 1):
        resp = requests.request(method, url, headers=headers, params=params, json=payload, timeout=timeout)
        last_status = resp.status_code
        try:
            last_data = resp.json()
        except Exception:
            last_data = {"_raw": (resp.text or "")[:500]}

        if last_status != 429:
            return last_status, last_data
        if attempt < retries:
            # 全局限流 100次/分钟：轻量退避，避免脚本直接失败
            time.sleep(1.2 * (attempt + 1))

    return last_status, last_data


def login(api_base: str, username: str, login_secret: str) -> Tuple[str, Dict[str, Any]]:
    code, data = _http_json(
        "POST",
        f"{api_base}/api/auth/login",
        payload={"username": username, "password": login_secret},
    )
    if code != 200 or not data.get("success"):
        raise RuntimeError(f"login failed: {username} ({code}) {data}")
    token = (data.get("data") or {}).get("token")
    user = (data.get("data") or {}).get("user") or {}
    if not token:
        raise RuntimeError(f"login no token: {username} ({code}) {data}")
    return token, user


def get_my_record(api_base: str, token: str, month: str) -> Optional[Dict[str, Any]]:
    code, data = _http_json("GET", f"{api_base}/api/performance/my-record/{month}", token=token)
    if code != 200 or not data.get("success"):
        raise RuntimeError(f"get my record failed: ({code}) {data}")
    return data.get("data")


def submit_summary(api_base: str, token: str, month: str, self_summary: str, next_month_plan: str) -> Dict[str, Any]:
    code, data = _http_json(
        "POST",
        f"{api_base}/api/performance/summary",
        token=token,
        payload={"month": month, "selfSummary": self_summary, "nextMonthPlan": next_month_plan},
    )
    if code not in (200, 201) or not data.get("success"):
        raise RuntimeError(f"submit summary failed: ({code}) {data}")
    return data.get("data") or {}


def get_team_records(api_base: str, token: str, month: str) -> List[Dict[str, Any]]:
    code, data = _http_json(
        "GET",
        f"{api_base}/api/performance/team-records",
        token=token,
        params={"month": month},
    )
    if code != 200 or not data.get("success"):
        raise RuntimeError(f"get team records failed: ({code}) {data}")
    return data.get("data") or []


def score_record(
    api_base: str,
    token: str,
    record_id: str,
    task_completion: float,
    initiative: float,
    project_feedback: float,
    quality_improvement: float,
    manager_comment: str,
    next_month_work_arrangement: str,
) -> Dict[str, Any]:
    code, data = _http_json(
        "POST",
        f"{api_base}/api/performance/score",
        token=token,
        payload={
            "id": record_id,
            "taskCompletion": task_completion,
            "initiative": initiative,
            "projectFeedback": project_feedback,
            "qualityImprovement": quality_improvement,
            "managerComment": manager_comment,
            "nextMonthWorkArrangement": next_month_work_arrangement,
        },
    )
    if code != 200 or not data.get("success"):
        raise RuntimeError(f"score record failed: {record_id} ({code}) {data}")
    return data.get("data") or {}


def get_record_by_id(api_base: str, token: str, record_id: str) -> Tuple[int, Dict[str, Any]]:
    return _http_json("GET", f"{api_base}/api/performance/{record_id}", token=token)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--api-url", default=os.environ.get("API_URL", "http://localhost:3001"))
    parser.add_argument("--month", default=_now_month(), help="YYYY-MM")
    parser.add_argument("--password", default=os.environ.get("UAT_LOGIN_SECRET", "123456"))
    parser.add_argument("--out", default="", help="输出 markdown 报告路径（可选）")
    parser.add_argument("--skip-negative", action="store_true", help="跳过权限边界负例测试")
    args = parser.parse_args()

    api_base = str(args.api_url).rstrip("/")
    month = str(args.month).strip()
    login_secret = str(args.password)

    # 展开参与者
    manager_ids = [x["managerId"] for x in DEFAULT_PARTICIPANTS]
    employee_ids: List[str] = []
    for group in DEFAULT_PARTICIPANTS:
        employee_ids.extend(group["employees"])
    employee_ids = sorted(set(employee_ids))

    # 缓存信息
    user_cache: Dict[str, Dict[str, Any]] = {}
    token_cache: Dict[str, str] = {}
    employee_record_ids: Dict[str, str] = {}
    employee_summary_mark: Dict[str, str] = {}

    report: List[str] = []
    report.append(f"# 绩效打分 UAT 报告")
    report.append("")
    report.append(f"- API: `{api_base}`")
    report.append(f"- 月份: `{month}`")
    report.append(f"- 参与人数: 员工 {len(employee_ids)} 人 + 经理 {len(manager_ids)} 人 = {len(employee_ids) + len(manager_ids)} 人")
    report.append("")

    failures: List[str] = []

    def login_cached(user_id: str) -> Tuple[str, Dict[str, Any]]:
        if user_id in token_cache and user_id in user_cache:
            return token_cache[user_id], user_cache[user_id]
        token, user = login(api_base, user_id, login_secret)
        token_cache[user_id] = token
        user_cache[user_id] = user
        return token, user

    # 1) 员工提交总结（如已存在则跳过提交）
    report.append("## 1) 员工提交工作总结")
    submitted_count = 0
    for emp_id in employee_ids:
        try:
            token, user = login_cached(emp_id)

            existing = get_my_record(api_base, token, month)
            if existing and existing.get("id"):
                employee_record_ids[emp_id] = existing["id"]
                employee_summary_mark[emp_id] = (existing.get("selfSummary") or "")[:80]
                report.append(f"- `{emp_id}` {user.get('name','')}：已存在记录 `{existing['id']}`（跳过提交）")
                continue

            mark = f"【UAT】{month} {emp_id}"
            self_summary = (
                f"{mark} 工作总结\n"
                f"- 本月完成：完成日常工作与协作\n"
                f"- 遇到问题：无/待补充\n"
                f"- 需要支持：无/待补充\n"
            )
            next_plan = (
                f"{mark} 下月计划\n"
                f"- 计划1：按期推进任务\n"
                f"- 计划2：提升协作与质量\n"
            )
            rec = submit_summary(api_base, token, month, self_summary, next_plan)
            if not rec.get("id"):
                raise RuntimeError(f"no record id after submit: {rec}")
            employee_record_ids[emp_id] = rec["id"]
            employee_summary_mark[emp_id] = mark
            submitted_count += 1
            report.append(f"- `{emp_id}` {user.get('name','')}：提交成功 `{rec['id']}`")
        except Exception as e:
            msg = f"员工 `{emp_id}` 提交失败：{e}"
            failures.append(msg)
            report.append(f"- ❌ {msg}")

    report.append("")
    report.append(f"- 本轮新提交：{submitted_count} 条")
    report.append("")

    # 2) 经理查看 team-records 并验证能看到下属总结
    report.append("## 2) 上级查看下属总结（team-records）")
    manager_visible_ok = 0
    for group in DEFAULT_PARTICIPANTS:
        m_id = group["managerId"]
        try:
            token, user = login_cached(m_id)
            records = get_team_records(api_base, token, month)
            by_emp = {r.get("employeeId"): r for r in records}
            missing = []
            invisible = []
            for emp_id in group["employees"]:
                r = by_emp.get(emp_id)
                if not r:
                    missing.append(emp_id)
                    continue
                mark = employee_summary_mark.get(emp_id, "")
                summary_text = (r.get("selfSummary") or "") + "\n" + (r.get("nextMonthPlan") or "")
                if mark and mark not in summary_text:
                    invisible.append(emp_id)
            if missing:
                raise RuntimeError(f"缺少下属记录: {missing}")
            if invisible:
                raise RuntimeError(f"看不到/对不上下属总结内容: {invisible}")
            manager_visible_ok += 1
            report.append(f"- `{m_id}` {user.get('name','')}：✅ 能看到 {len(group['employees'])} 名下属总结")
        except Exception as e:
            msg = f"经理 `{m_id}` 查看下属总结失败：{e}"
            failures.append(msg)
            report.append(f"- ❌ {msg}")

    report.append("")
    report.append(f"- 经理验证通过：{manager_visible_ok}/{len(DEFAULT_PARTICIPANTS)}")
    report.append("")

    # 3) 经理给下属打分
    report.append("## 3) 上级给下级打分（score）")
    scored_count = 0
    for group in DEFAULT_PARTICIPANTS:
        m_id = group["managerId"]
        try:
            token, user = login_cached(m_id)
            for idx, emp_id in enumerate(group["employees"], start=1):
                rec_id = employee_record_ids.get(emp_id)
                if not rec_id:
                    raise RuntimeError(f"找不到下属 {emp_id} 的 record id")
                # 做一点差异化，避免全员同分
                base = 1.0 + (0.1 if idx % 5 == 0 else 0.0)
                data = score_record(
                    api_base,
                    token,
                    rec_id,
                    task_completion=min(1.5, base),
                    initiative=1.0,
                    project_feedback=1.0,
                    quality_improvement=1.0,
                    manager_comment=f"【UAT】{month} 评语 - {m_id}",
                    next_month_work_arrangement=f"【UAT】{month} 安排 - 按计划推进",
                )
                if data.get("status") != "completed":
                    raise RuntimeError(f"record status not completed: {rec_id} -> {data.get('status')}")
                scored_count += 1
            report.append(f"- `{m_id}` {user.get('name','')}：✅ 已给 {len(group['employees'])} 人打分")
        except Exception as e:
            msg = f"经理 `{m_id}` 打分失败：{e}"
            failures.append(msg)
            report.append(f"- ❌ {msg}")

    report.append("")
    report.append(f"- 本轮打分记录数：{scored_count}")
    report.append("")

    # 4) 员工查看自己的结果（已完成 + 有评语）
    report.append("## 4) 员工查看结果（my-record）")
    employee_result_ok = 0
    for emp_id in employee_ids:
        try:
            token, user = login_cached(emp_id)
            rec = get_my_record(api_base, token, month)
            if not rec:
                raise RuntimeError("my-record 返回空")
            if rec.get("status") != "completed":
                raise RuntimeError(f"status={rec.get('status')}")
            if not (rec.get("managerComment") or "").strip():
                raise RuntimeError("managerComment 为空")
            employee_result_ok += 1
            report.append(f"- `{emp_id}` {user.get('name','')}：✅ 可看到打分结果（level={rec.get('level')}, score={rec.get('totalScore')})")
        except Exception as e:
            msg = f"员工 `{emp_id}` 查看结果失败：{e}"
            failures.append(msg)
            report.append(f"- ❌ {msg}")

    report.append("")
    report.append(f"- 员工验证通过：{employee_result_ok}/{len(employee_ids)}")
    report.append("")

    # 5) 权限边界负例（非直属上级/非本人）
    if not args.skip_negative:
        report.append("## 5) 权限边界负例（预期 403）")
        try:
            # 取 m006 组的第一个下属记录，让 m011 去访问/打分，应该 403
            victim_emp = DEFAULT_PARTICIPANTS[1]["employees"][0]
            victim_rec = employee_record_ids.get(victim_emp, "")
            if not victim_rec:
                raise RuntimeError("找不到负例 record id")

            token_m011, _ = login_cached("m011")
            status, data = get_record_by_id(api_base, token_m011, victim_rec)
            if status != 403:
                raise RuntimeError(f"经理跨组查看记录预期403，实际 {status}: {data}")

            # 跨组打分
            status2, data2 = _http_json(
                "POST",
                f"{api_base}/api/performance/score",
                token=token_m011,
                payload={
                    "id": victim_rec,
                    "taskCompletion": 1.0,
                    "initiative": 1.0,
                    "projectFeedback": 1.0,
                    "qualityImprovement": 1.0,
                    "managerComment": "x",
                    "nextMonthWorkArrangement": "x",
                },
            )
            if status2 != 403:
                raise RuntimeError(f"经理跨组打分预期403，实际 {status2}: {data2}")

            # 员工跨人查看
            token_emp, _ = login_cached(DEFAULT_PARTICIPANTS[0]["employees"][0])
            status3, data3 = get_record_by_id(api_base, token_emp, victim_rec)
            if status3 != 403:
                raise RuntimeError(f"员工查看他人记录预期403，实际 {status3}: {data3}")

            report.append(f"- ✅ 经理跨组查看/打分、员工查看他人：均返回 403")
        except Exception as e:
            msg = f"权限边界负例未通过：{e}"
            failures.append(msg)
            report.append(f"- ❌ {msg}")

        report.append("")

    # 总结
    report.append("## 总结")
    if failures:
        report.append(f"- ❌ 未通过：{len(failures)} 项")
        for x in failures[:30]:
            report.append(f"  - {x}")
        if len(failures) > 30:
            report.append(f"  - ... 仅展示前30项，共 {len(failures)} 项")
    else:
        report.append("- ✅ 全部通过")

    output = "\n".join(report) + "\n"
    print(output)

    if args.out:
        out_path = os.path.abspath(args.out)
        os.makedirs(os.path.dirname(out_path), exist_ok=True)
        with open(out_path, "w", encoding="utf-8") as f:
            f.write(output)
        print(f"\n[written] {out_path}")

    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
