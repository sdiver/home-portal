#!/bin/bash

# 群晖 NAS 部署脚本
# 一键拉取代码并部署家庭应用中心

set -e

echo "🏠 家庭应用中心 - 群晖部署脚本"
echo "==============================="
echo ""

# 颜色
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

# 创建部署目录
DEPLOY_DIR="/volume1/docker/homegate"
mkdir -p "$DEPLOY_DIR"
cd "$DEPLOY_DIR"

echo -e "${BLUE}📥 拉取代码...${NC}"

# 克隆或更新三个仓库
clone_or_pull() {
    local dir=$1
    local repo=$2

    if [ -d "$dir/.git" ]; then
        echo "  更新 $dir..."
        cd "$dir" && git pull && cd ..
    else
        echo "  克隆 $repo..."
        git clone "$repo" "$dir"
    fi
}

clone_or_pull "portal" "https://github.com/sdiver/home-portal.git"
clone_or_pull "parenting" "https://github.com/sdiver/kids-learning-record.git"
clone_or_pull "cello-practise" "https://github.com/sdiver/cello-practise.git"

# 下载部署配置文件
echo -e "${BLUE}📄 下载部署配置...${NC}"

curl -sL "https://raw.githubusercontent.com/sdiver/home-portal/main/Dockerfile.all-in-one" \
    -o Dockerfile 2>/dev/null || echo "⚠️  Dockerfile 下载失败，使用本地文件"

curl -sL "https://raw.githubusercontent.com/sdiver/home-portal/main/supervisord.conf" \
    -o supervisord.conf 2>/dev/null || echo "⚠️  supervisord.conf 下载失败"

curl -sL "https://raw.githubusercontent.com/sdiver/home-portal/main/supervisor-services.ini" \
    -o supervisor-services.ini 2>/dev/null || echo "⚠️  supervisor-services.ini 下载失败"

curl -sL "https://raw.githubusercontent.com/sdiver/home-portal/main/start-docker.sh" \
    -o start-docker.sh 2>/dev/null || echo "⚠️  start-docker.sh 下载失败"

chmod +x start-docker.sh 2>/dev/null || true

# 创建数据目录
echo -e "${BLUE}📁 创建数据目录...${NC}"
mkdir -p data/parenting data/cello data/uploads logs

# 启动
echo -e "${BLUE}🚀 构建并启动容器...${NC}"
sudo docker-compose up -d --build 2>/dev/null || \
    sudo docker compose up -d --build

echo ""
echo -e "${GREEN}✅ 部署完成！${NC}"
echo ""
echo "访问地址："
echo "  • Portal:    http://$(hostname -I | awk '{print $1}'):8080"
echo "  • Parenting: http://$(hostname -I | awk '{print $1}'):3000"
echo "  • Cello:     http://$(hostname -I | awk '{print $1}'):3001"
echo ""
echo "数据目录: $DEPLOY_DIR/data"
echo "日志目录: $DEPLOY_DIR/logs"
