# 阶段1: 构建
FROM node:20-alpine AS builder

WORKDIR /app

# 复制package文件
COPY package*.json ./

# 安装所有依赖（包括devDependencies用于构建）
RUN npm ci

# 复制源代码和配置
COPY . .

# 构建TypeScript代码
RUN npm run build

# 阶段2: 生产
FROM node:20-alpine

WORKDIR /app

# 复制package文件
COPY package*.json ./

# 只安装生产依赖
RUN npm ci --only=production

# 从构建阶段复制编译后的代码
COPY --from=builder /app/dist ./dist

# 复制配置目录（如果存在）
RUN mkdir -p ./src/config

# 创建日志目录
RUN mkdir -p /app/logs

# 设置时区
ENV TZ=Asia/Shanghai

# 暴露端口
EXPOSE 3001

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s \
  CMD node -e "require('http').get('http://localhost:3001/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# 启动应用
CMD ["npm", "start"]
