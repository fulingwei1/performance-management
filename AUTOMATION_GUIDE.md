# 绩效管理系统 - 月度自动化配置指南

## 功能概述

系统已实现完整的月度自动化闭环：

| 时间 | 自动化任务 | 说明 |
|------|-----------|------|
| 每月 1 日 8:00 | 生成上月绩效任务 | 为所有 eligible 员工创建考核记录、通知、待办 |
| 每天 8:00 | 截止期检查 | 检查各阶段截止日期，发送提醒 |
| 每小时 | 过期状态更新 | 自动标记逾期待办 |
| 每月 6 日 2:00 | 生成统计报告 | 生成上月绩效统计 + SVG 图表 |
| 每月 10 日 3:00 | 自动发布 | 兜底自动发布上月结果 |
| 发布后 | 自动归档 | 归档已发布数据到 monthly_archives |

## 邮件服务配置

### 1. 编辑环境变量

```bash
ssh root@8.138.230.46
cd /opt/performance-management
nano .env
```

### 2. 填写 SMTP 信息

**企业邮箱示例（腾讯企业邮）：**
```env
SMTP_HOST=smtp.exmail.qq.com
SMTP_PORT=465
SMTP_USER=noreply@yourcompany.com
SMTP_PASS=your_password
SMTP_FROM=绩效管理系统 <noreply@yourcompany.com>
```

**QQ 邮箱示例：**
```env
SMTP_HOST=smtp.qq.com
SMTP_PORT=465
SMTP_USER=your_qq@qq.com
SMTP_PASS=your_authorization_code  # 需要开启 SMTP 并获取授权码
```

**163 邮箱示例：**
```env
SMTP_HOST=smtp.163.com
SMTP_PORT=465
SMTP_USER=your_email@163.com
SMTP_PASS=your_authorization_code
```

### 3. 重启服务

```bash
docker compose up -d backend
```

### 4. 验证邮件

```bash
# 手动触发任务生成测试
curl -X POST "http://127.0.0.1:3001/api/automation/generate-monthly-tasks?month=2026-05-01" \
  -H "Authorization: Bearer YOUR_TOKEN"

# 查看邮件发送日志
docker logs ate_backend 2>&1 | grep -i 'EmailService\|邮件'
```

## 员工邮箱

系统已为所有 173 名员工自动分配邮箱（格式：`id@jinkaibo.com`）。

如需自定义邮箱，请更新 `employees` 表的 `email` 字段：

```sql
UPDATE employees SET email = 'real@email.com' WHERE id = 'e016';
```

## 手动触发

所有自动化任务均可手动触发：

```bash
# 生成月度任务
POST /api/automation/generate-monthly-tasks?month=2026-05-01

# 生成统计报告
POST /api/automation/generate-monthly-stats?month=2026-05-01

# 自动发布
POST /api/automation/auto-publish?month=2026-05-01

# 催办检查
POST /api/automation/check-reminders

# 查看进度
GET /api/automation/progress/2026-04

# 归档月份
POST /api/automation/archive (body: {"month": "2026-03"})
```

## 考核模板

系统预置 19 个考核模板：

| 部门 | 模板 |
|------|------|
| 工程技术 | 标准模板、高级工程师、中级工程师、初级工程师、项目经理 |
| 销售 | 标准模板、销售经理、高级销售、普通销售 |
| 生产制造 | 标准模板、生产主管、高级技工、普通工人 |
| 支持部门 | 标准模板、主管、高级专员、普通专员 |
| 高管 | 标准模板、GM 考核 |

共 115 个考核指标，支持按角色/层级/岗位自动匹配。

## 问题排查

### 邮件未发送
1. 检查 `.env` 中 SMTP 配置是否正确
2. 查看日志：`docker logs ate_backend | grep EmailService`
3. 测试 SMTP 连接：`telnet smtp.qq.com 465`

### 模板未加载
1. 检查数据库：`SELECT count(*) FROM assessment_templates;`
2. 查看初始化日志：`docker logs ate_backend | grep template`

### 定时任务未执行
1. 检查 SchedulerService.init() 是否被调用
2. 确认 NODE_ENV 不是 'test'
