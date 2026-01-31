#!/bin/bash
# ATE绩效管理系统 - Mac启动脚本
# 双击此文件即可启动后端服务

cd "$(dirname "$0")/standalone-backend"
echo "正在启动后端服务..."
echo ""
node server.js
