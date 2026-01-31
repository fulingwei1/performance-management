# 项目优化建议

> 基于当前代码结构与运行方式的改进建议，按优先级与投入产出比排序。

---

## 一、API 与前后端约定

### 1.1 统一错误响应字段（高优先级）

**现状**：后端部分接口用 `message`（如 auth 登录/改密），部分用 `error`（如 performance、errorHandler、auth 中间件）。前端 `api.ts` 仅取 `data.error` 抛错。

**影响**：登录失败等场景下，用户可能看到通用「请求失败」而非后端返回的「用户名或密码错误」。

**建议**：

- **方案 A（推荐）**：后端统一为「业务错误用 `message`，HTTP 层/中间件用 `error`」，并在文档中写清；前端 `request()` 中统一读取：`const msg = data.message ?? data.error ?? '请求失败'`，用 `msg` 抛错或展示。
- **方案 B**：后端全部统一为 `message` 或全部为 `error`，前端只读一个字段。

**涉及**：`backend/src/controllers/*.ts`、`backend/src/middleware/errorHandler.ts`、`app/src/services/api.ts`。

---

### 1.2 统一成功响应结构

**现状**：有的接口返回 `{ success, data, message }`，有的只有 `{ success, data }`。

**建议**：在技术规范或 PRD 中约定「所有 JSON 响应」格式，例如：

- 成功：`{ success: true, data?: T, message?: string }`
- 失败：`{ success: false, message: string, code?: string }`

并在后端封装一个 `res.success(data?, message?)` / `res.fail(message, code?)` 工具，避免各处手写 `res.json(...)` 不一致。

---

## 二、前端

### 2.1 路由懒加载（中优先级，性能）

**现状**：`App.tsx` 中所有页面组件均为静态 `import`，首屏会打包进主 chunk。

**建议**：按角色或模块做懒加载，例如：

```ts
const EmployeeDashboard = lazy(() => import('@/pages/Employee/Dashboard'));
const ManagerDashboard = lazy(() => import('@/pages/Manager/Dashboard'));
// ...
<Route path="/employee/dashboard" element={<Suspense fallback={<PageSkeleton />}><EmployeeDashboard /></Suspense>} />
```

可显著减小首屏体积、加快首屏时间，尤其 HR/经理端页面较多时。

---

### 2.2 API 层类型与错误处理（中优先级）

**现状**：`api.ts` 中 `request()` 返回类型未约束，多处使用 `any`（如 `employeeApi.create(data: any)`）；错误仅 `throw error`，未区分网络错误、4xx/5xx、业务 message。

**建议**：

- 为每个接口定义请求/响应类型（或复用后端类型/生成 OpenAPI 类型），减少 `any`。
- 在 `request()` 内区分：非 2xx 时构造一个 `ApiError`（包含 `statusCode`、`message`/`error` 文案），由调用方或全局 toast 统一展示，便于后续做 401 跳转登录、403 提示无权限等。

---

### 2.3 抽离重复的路由/权限逻辑（低优先级）

**现状**：`ProtectedRoute` / `PublicRoute` 内 `redirectMap` 与角色到首页的映射重复出现。

**建议**：抽成常量或工具，例如：

```ts
const ROLE_HOME: Record<EmployeeRole, string> = {
  employee: '/employee/dashboard',
  manager: '/manager/dashboard',
  gm: '/gm/dashboard',
  hr: '/hr/dashboard',
};
```

路由和重定向逻辑都引用同一份，减少改一处漏一处的风险。

---

### 2.4 Token 与请求刷新（低优先级）

**现状**：Token 存 localStorage，请求头固定带当前 token，无过期续期或 401 统一处理。

**建议**（按需）：

- 在 `request()` 中拦截 401：清除 token、跳转登录页并带上 `returnUrl`。
- 若后续要做「静默刷新」，可在 401 时先调 refresh 接口，再重试原请求；当前无 refresh 则可先只做「401 → 清 token + 跳转登录」。

---

## 三、后端

### 3.1 请求校验与 DTO（中优先级）

**现状**：部分 controller 用 `express-validator`，部分仍直接读 `req.body`，校验与类型分散。

**建议**：

- 为每个对外接口定义「入参校验规则 + 类型」（可集中放在 `routes` 或 `validators` 目录），避免漏校验或类型与校验不一致。
- 错误响应格式与 1.1 统一（例如统一用 `message` 或 `error`），便于前端统一处理。

---

### 3.2 日志与可观测性（中优先级）

**现状**：用 `console.log` 打请求、`console.error` 打错误，无结构化、无请求 ID。

**建议**：

- 引入轻量日志库（如 pino），为每个请求生成 `requestId`（或使用中间件从 header 读取），在日志中带上 requestId 和关键字段（method、path、userId、statusCode）。
- 生产环境可关闭或降级请求级 debug 日志，只保留 error 与关键业务日志，便于排查问题与做简单监控。

---

### 3.3 安全与运维（中优先级）

- **CORS**：当前仅配置 `origin: process.env.FRONTEND_URL`，若有多前端或移动端，建议在文档中明确允许的 origin 列表，避免生产误配 `*`。
- **限流**：登录、导入等敏感或耗时接口建议加简单限流（如 express-rate-limit），防止暴力尝试与滥用。
- **环境变量校验**：启动时校验必要变量（如 `JWT_SECRET`、`FRONTEND_URL`），缺失则直接退出并打印说明，避免半吊子启动。

---

### 3.4 依赖与脚本（低优先级）

- 将 `@types/*` 从 `dependencies` 挪到 `devDependencies`（仅影响分类与 CI 安装）。
- Jest 弃用选项（如 `--testPathPattern`）按官方文档替换为推荐写法，避免将来版本不兼容。

---

## 四、工程与协作

### 4.1 类型共享（中优先级）

**现状**：前后端各自维护类型（Employee、PerformanceRecord 等），容易不一致。

**建议**：

- 若保持单体仓库：可建 `shared/types` 或 `backend/src/types` 并让前端通过 path alias 引用，或用脚本从后端生成一份前端用的类型。
- 若后续拆仓库：可发布一个 `@your-org/performance-types` 包，或通过 OpenAPI 生成前后端类型，保证接口与类型一致。

---

### 4.2 单仓库脚本与文档（低优先级）

- 在根目录提供 `package.json` 的 `scripts`：例如 `dev`（同时起 backend + app）、`test`（分别跑 backend 与 app 测试）、`lint`，便于新人一条命令跑通。
- 在 README 或 `docs/` 中写明：本地启动顺序、环境变量示例、测试命令、API 错误字段约定（与 1.1 一致）。

---

## 五、优先级与实施顺序建议

| 优先级 | 项 | 预期收益 | 工作量 |
|--------|----|----------|--------|
| 高 | 1.1 统一错误响应字段 + 前端读取 | 登录等错误提示正确、体验一致 | 小 |
| 中 | 2.1 路由懒加载 | 首屏体积与加载时间 | 小 |
| 中 | 2.2 API 类型与错误封装 | 类型安全、错误处理统一 | 中 |
| 中 | 3.1 校验与 DTO 统一 | 少 bug、易维护 | 中 |
| 中 | 3.2 结构化日志 | 排查问题、简单监控 | 小 |
| 中 | 3.3 安全与限流 | 安全与稳定性 | 小 |
| 中 | 4.1 类型共享 | 前后端一致、少改漏 | 中 |
| 低 | 1.2 / 2.3 / 2.4 / 3.4 / 4.2 | 可维护性、体验 | 各小 |

建议先做 **1.1** 和 **2.1**，再按迭代安排 3.x 与 4.1；类型共享（4.1）可与 1.2、2.2 一起规划，避免重复改类型。

---

## 六、与现有问题的衔接

- **绩效 API 测试失败**（见 `PROJECT_ISSUES.md`）：在修接口/测例时，可一并把该模块的响应格式向「统一错误/成功结构」靠拢，并补充或修正类型。
- **前端测试**：已修复导入路径；后续若增加页面或 API 调用，可优先为 `api.ts` 和关键 store 写单测或集成测，避免改错字段名（如 `error` vs `message`）导致线上才暴露。

以上建议可根据当前迭代与人力择项实施，不必一次全做。
