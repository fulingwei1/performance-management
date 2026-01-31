# Mac电脑启动说明

## 📦 文件位置

假设你把项目下载到了 `~/Downloads/performance-system` 目录

## 🚀 启动后端服务

### 方法一：双击启动（最简单）

1. 打开 `Finder`
2. 进入项目文件夹
3. **双击** `start-server.command` 文件
4. 如果提示"无法打开，因为无法验证开发者"，请按下面步骤处理

#### 解决安全提示

如果双击后弹出安全警告：

1. 点击 **"取消"**
2. 打开 **"系统偏好设置"** → **"安全性与隐私"**
3. 点击下方的 **"仍要打开"**
4. 再次双击 `start-server.command`

### 方法二：终端启动

打开 **终端(Terminal)**，执行：

```bash
cd ~/Downloads/performance-system/standalone-backend
node server.js
```

### 方法三：使用 iTerm2（推荐开发者使用）

```bash
cd ~/Downloads/performance-system/standalone-backend
node server.js
```

---

## ✅ 验证后端启动成功

看到以下输出表示启动成功：

```
✅ 内存数据库初始化完成，加载了 43 名员工

🚀 服务器启动成功
📍 地址: http://localhost:3001
📚 API文档: http://localhost:3001/health
```

在浏览器中打开 http://localhost:3001/health 测试

---

## 🌐 启动前端

### 方法一：使用 VS Code

1. 用 VS Code 打开 `app` 文件夹
2. 按 `Ctrl + ~` 打开终端
3. 执行：

```bash
npm install
npm run dev
```

### 方法二：使用终端

打开新的终端窗口（**不要关闭后端窗口**）：

```bash
cd ~/Downloads/performance-system/app
npm install
npm run dev
```

---

## 🔧 常见问题

### 1. 提示 "node: command not found"

说明没有安装 Node.js，请安装：

```bash
# 使用 Homebrew 安装
brew install node

# 或者去官网下载安装包
# https://nodejs.org/zh-cn/download/
```

### 2. 端口被占用

如果提示 `Port 3001 is already in use`，可以修改端口：

```bash
PORT=3002 node server.js
```

然后修改前端配置 `app/.env`：

```env
VITE_API_URL=http://localhost:3002/api
```

### 3. 关闭服务

在终端窗口中按 `Ctrl + C` 即可停止服务

---

## 📱 访问系统

- **前端页面**: http://localhost:5173
- **后端API**: http://localhost:3001

---

## 👤 登录账号

所有账号密码都是 `123456`：

| 角色 | 姓名 | 用途 |
|------|------|------|
| 经理 | 于振华 | 测试部经理 |
| 经理 | 张丙波 | 机械部经理 |
| 经理 | 王俊 | PLC经理 |
| 总经理 | 李总 | 总经理 |
| HR | 王HR | 人力资源 |

---

## 🆘 需要帮助？

如果遇到问题，请截图终端的错误信息
