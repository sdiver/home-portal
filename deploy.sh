#!/bin/bash
# Portal 项目部署脚本
# 用法: ./deploy.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "🚀 开始部署 Portal..."

# 检查是否有本地冲突
echo "📥 拉取最新代码..."
if ! git pull 2>/dev/null; then
    echo "⚠️  检测到本地有修改冲突，尝试自动解决..."
    git stash
    git pull
    git stash pop || echo "⚠️  恢复本地修改时有冲突，使用远程版本"
fi

# 停止并删除旧容器
echo "🛑 停止旧容器..."
docker-compose down

# 重新构建并启动
echo "🏗️  重新构建并启动..."
docker-compose up -d --build

# 等待服务启动
sleep 3

# 检查状态
if docker ps | grep -q "home-portal"; then
    echo "✅ Portal 部署成功!"
    echo "📍 访问地址: http://$(hostname -I | awk '{print $1}'):8080"
else
    echo "❌ Portal 部署失败，请检查日志:"
    docker-compose logs --tail=50
    exit 1
fi
