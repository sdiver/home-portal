#!/bin/bash

# 家庭应用中心 - 三合一容器启动脚本
# 必须在 homegate 根目录下执行（包含 portal/、parenting/、cello-practise/ 的目录）

set -e

echo "🏠 家庭应用中心 (All-in-One) 启动脚本"
echo "======================================="
echo ""

# 颜色定义
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# 检查是否在正确的目录
if [ ! -d "portal" ] || [ ! -d "parenting" ] || [ ! -d "cello-practise" ]; then
    echo -e "${RED}❌ 错误：请在 homegate 根目录下执行此脚本${NC}"
    echo ""
    echo "正确的目录结构应该是："
    echo "  homegate/"
    echo "    ├── portal/"
    echo "    ├── parenting/"
    echo "    ├── cello-practise/"
    echo "    ├── Dockerfile.all-in-one"
    echo "    └── docker-compose.all-in-one.yml"
    echo ""
    echo "当前目录: $(pwd)"
    exit 1
fi

# 检查必要文件
if [ ! -f "Dockerfile.all-in-one" ]; then
    echo -e "${RED}❌ 错误：找不到 Dockerfile.all-in-one${NC}"
    exit 1
fi

# 检查 Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker 未安装${NC}"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ Docker Compose 未安装${NC}"
    exit 1
fi

echo -e "${BLUE}📁 创建数据目录...${NC}"
mkdir -p parenting/data
mkdir -p cello-practise/data
mkdir -p cello-practise/uploads
mkdir -p logs

# 检查 .env 文件
if [ ! -f "cello-practise/backend/.env" ]; then
    echo -e "${YELLOW}⚠️  cello-practise/backend/.env 不存在${NC}"
    if [ -f "cello-practise/backend/.env.example" ]; then
        echo "   从 .env.example 创建默认配置..."
        cp cello-practise/backend/.env.example cello-practise/backend/.env
    fi
fi

echo ""
echo -e "${BLUE}🔨 构建并启动三合一容器...${NC}"
echo "   构建上下文: $(pwd)"
echo "   Dockerfile: ./Dockerfile.all-in-one"
echo ""

docker-compose -f docker-compose.all-in-one.yml up -d --build

echo ""
echo "⏳ 等待服务启动..."
sleep 5

# 检查容器状态
echo ""
echo -e "${BLUE}🔍 检查服务状态...${NC}"
if docker ps --format '{{.Names}}' | grep -q "^homegate$"; then
    echo -e "${GREEN}✓ homegate 容器运行中${NC}"

    # 检查 supervisor 状态
    echo ""
    echo "服务状态:"
    docker exec homegate supervisorctl status 2>/dev/null || echo "  服务启动中..."
else
    echo -e "${RED}✗ homegate 容器未运行${NC}"
    docker-compose -f docker-compose.all-in-one.yml logs
    exit 1
fi

echo ""
echo "╔════════════════════════════════════════════════════════╗"
echo "║          🎉 家庭应用中心启动成功！                      ║"
echo "╠════════════════════════════════════════════════════════╣"
echo "║                                                        ║"
echo "║  🌐 门户首页:  http://localhost:8080                   ║"
echo "║  📚 学习记录:  http://localhost:3000                   ║"
echo "║  🎻 大提琴:    http://localhost:3001                   ║"
echo "║                                                        ║"
echo "╠════════════════════════════════════════════════════════╣"
echo "║  常用命令:                                             ║"
echo "║    • 查看日志: docker logs -f homegate                 ║"
echo "║    • 进入容器: docker exec -it homegate sh             ║"
echo "║    • 进程管理: docker exec homegate supervisorctl status║"
echo "║    • 停止服务: docker-compose -f docker-compose.all-in-one.yml down ║"
echo "║                                                        ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""
