# Playwright E2E

当前 E2E 先覆盖最小可重复闭环：

1. 未登录访问受保护页面会跳到登录页。
2. 使用内存库启动后端，员工临时密码登录后必须先修改密码，修改后进入员工工作台。

运行：

```bash
cd app
npm run e2e:install
npm run e2e
```

说明：

- Playwright 会自动启动一个隔离后端：`127.0.0.1:3102`。
- 后端使用 `USE_MEMORY_DB=true`，不会写入本地 PostgreSQL。
- Playwright 会自动启动一个隔离前端：`127.0.0.1:5175`。
- 如端口冲突，可设置 `E2E_BACKEND_PORT` 和 `E2E_FRONTEND_PORT`。

后续建议补充：

- 员工填写月度总结。
- 经理评分。
- HR 查看统计与满意度调查。
