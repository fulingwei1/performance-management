# Vercel 环境变量配置指南

## 后端环境变量 (performance-management-backend)

### 必需的环境变量
- `NODE_ENV` = production
- `USE_MEMORY_DB` = true (推荐用于Vercel Serverless)
- `JWT_SECRET` = your-jwt-secret-key-here

### 可选的环境变量 (如果要使用MySQL)
- `DB_HOST` = your-mysql-host
- `DB_PORT` = 3306
- `DB_USER` = your-mysql-user
- `DB_PASSWORD` = your-mysql-password
- `DB_NAME` = your-database-name

## 前端环境变量 (performance-management-frontend)

### 必需的环境变量
- `VITE_API_URL` = https://performance-management-backend.vercel.app/api

## 配置步骤

### 1. 登录Vercel
```bash
vercel login
```

### 2. 部署后端
```bash
cd backend
vercel --prod --name performance-management-backend
```

### 3. 配置后端环境变量
在Vercel Dashboard中：
1. 进入 performance-management-backend 项目
2. 点击 Settings → Environment Variables
3. 添加上述必需的环境变量

### 4. 部署前端
```bash
cd ../app
vercel --prod --name performance-management-frontend
```

### 5. 配置前端环境变量
在Vercel Dashboard中：
1. 进入 performance-management-frontend 项目
2. 点击 Settings → Environment Variables  
3. 添加 VITE_API_URL = https://performance-management-backend.vercel.app/api

## 注意事项

1. **内存数据库**: Vercel Serverless推荐使用内存数据库 (USE_MEMORY_DB=true)
2. **JWT密钥**: 确保设置强密码的JWT_SECRET
3. **CORS**: 后端已配置支持前端域名
4. **超时设置**: Vercel函数最大执行时间30秒
5. **冷启动**: 首次访问可能有延迟，这是正常的

## 测试部署

部署完成后，可以通过以下URL测试：
- 后端健康检查: https://performance-management-backend.vercel.app/health
- 前端应用: https://performance-management-frontend.vercel.app
- API文档: https://performance-management-backend.vercel.app/api/health

## 默认登录账户

系统已预置以下测试账户：
- 总经理: 郑汝才 / 123456
- 经理: 骆奕兴 / 123456  
- HR: 林作倩 / 123456
- 员工: 姚洪 / 123456