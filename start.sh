#!/bin/bash

# 家庭应用管理门户启动脚本

echo "🏠 启动家庭应用管理门户..."

# 检查 node_modules
if [ ! -d "node_modules" ]; then
    echo "📦 安装依赖..."
    npm install
fi

# 启动服务
echo "🚀 启动服务..."
npm start
