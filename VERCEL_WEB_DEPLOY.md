# 🚀 Vercel Web 部署完整指南

## 📋 部署准备状态
✅ **已完成**:
- 前端代码已构建 (app/dist/)
- 后端代码已构建 (backend/dist/)
- Vercel配置文件已准备
- 所有依赖已安装

## 🌐 Vercel Web 部署步骤

### 步骤 1: 部署后端服务

1. **访问 Vercel Dashboard**: https://vercel.com
2. **点击 "Add New..." → "Project"**
3. **选择 "Import Git Repository"** 或 **拖拽文件夹**:
   - 如果拖拽: 将 `backend` 文件夹拖拽到页面
   - 如果导入: 选择您的Git仓库中的backend文件夹
4. **配置项目**:
   - **Project Name**: `performance-management-backend`
   - **Framework Preset**: 选择 "Other"
   - **Root Directory**: `./backend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`
5. **添加环境变量** (在Environment Variables部分):
   ```
   NODE_ENV = production
   USE_MEMORY_DB = true
   JWT_SECRET = your-secure-jwt-secret-key-here
   ```
6. **点击 "Deploy"**

### 步骤 2: 部署前端应用

1. **在 Vercel Dashboard 中点击 "Add New..." → "Project"**
2. **拖拽 `app` 文件夹** 或选择Git仓库中的app文件夹
3. **配置前端项目**:
   - **Project Name**: `performance-management-frontend`
   - **Framework Preset**: 选择 "Vite"
   - **Root Directory**: `./app`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`
4. **添加环境变量**:
   ```
   VITE_API_URL = [后端部署后的URL]/api
   ```
5. **点击 "Deploy"**

## 📝 获取部署URL

部署完成后，您会获得：

### 后端URL格式
```
https://performance-management-backend-xxxx.vercel.app
```

### 前端URL格式  
```
https://performance-management-frontend-xxxx.vercel.app
```

## ⚙️ 部署后配置

### 1. 更新前端环境变量
后端部署完成后，获取其后端URL，然后：
1. 进入前端项目的 Vercel Dashboard
2. 点击 "Settings" → "Environment Variables"
3. 更新环境变量:
   ```
   VITE_API_URL = https://performance-management-backend-xxxx.vercel.app/api
   ```
4. 重新部署前端项目

### 2. 测试部署

#### 测试后端
访问: `https://performance-management-backend-xxxx.vercel.app/health`
应返回:
```json
{
  "success": true,
  "message": "服务器运行正常",
  "timestamp": "2025-xx-xx..."
}
```

#### 测试前端  
访问: `https://performance-management-frontend-xxxx.vercel.app`
应该看到登录界面

## 🔐 默认登录账户

使用以下账户测试:

| 角色 | 用户名 | 密码 |
|------|--------|------|
| 总经理 | 郑汝才 | 123456 |
| 经理 | 骆奕兴 | 123456 |
| HR | 林作倩 | 123456 |
| 员工 | 姚洪 | 123456 |

## ⚠️ 重要注意事项

1. **内存数据库**: 使用内存数据库，重启后数据会重置
2. **冷启动**: 首次访问可能有2-5秒延迟，这是正常的
3. **HTTPS**: Vercel自动提供HTTPS
4. **考核关系**: 已配置为高勇和王志红由骆奕兴考核

## 🛠️ 故障排除

如果遇到问题:

### 后端问题
1. 检查 Vercel Dashboard → Functions → Logs
2. 确认环境变量设置正确
3. 验证代码构建成功

### 前端问题
1. 检查 Vercel Dashboard → Build Logs
2. 确认 VITE_API_URL 配置正确
3. 清除浏览器缓存

### 连接问题
1. 检查CORS配置
2. 确认API URL格式正确
3. 检查环境变量是否生效

## 📊 部署验证清单

- [ ] 后端健康检查通过
- [ ] 后端API可访问
- [ ] 前端页面正常加载
- [ ] 登录功能正常
- [ ] 考核数据正常显示
- [ ] 环境变量配置正确
- [ ] 无控制台错误

现在您可以按照上述步骤在Vercel Web界面中完成部署！