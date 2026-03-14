# 从 GitHub 部署家庭应用中心

## 方案一：手动部署（推荐）

### 1. 创建目录并拉取代码

```bash
# 创建部署目录
mkdir -p /volume1/docker/homegate
cd /volume1/docker/homegate

# 拉取三个项目的代码
git clone https://github.com/sdiver/home-portal.git portal
git clone https://github.com/sdiver/kids-learning-record.git parenting
git clone https://github.com/sdiver/cello-practise.git cello-practise
```

### 2. 下载部署配置文件

```bash
# 下载 Dockerfile 和配置文件
curl -O https://raw.githubusercontent.com/sdiver/home-portal/main/Dockerfile.all-in-one
curl -O https://raw.githubusercontent.com/sdiver/home-portal/main/supervisord.conf
curl -O https://raw.githubusercontent.com/sdiver/home-portal/main/supervisor-services.ini
curl -O https://raw.githubusercontent.com/sdiver/home-portal/main/start-docker.sh
chmod +x start-docker.sh
```

### 3. 创建 docker-compose.yml

```yaml
version: '3.8'

services:
  homegate:
    build:
      context: .
      dockerfile: Dockerfile.all-in-one
    image: homegate-all-in-one:latest
    container_name: homegate
    restart: unless-stopped
    ports:
      - "8080:8080"
      - "3000:3000"
      - "3001:3001"
    volumes:
      - ./data/parenting:/app/parenting/data
      - ./data/parenting.db:/app/parenting/kids_learning.db
      - ./data/cello:/app/cello-practise/data
      - ./data/uploads:/app/uploads
      - ./logs:/var/log/supervisor
    environment:
      - NODE_ENV=production
```

### 4. 启动服务

```bash
# 创建数据目录
mkdir -p data/parenting data/cello data/uploads logs

# 启动容器
docker-compose up -d --build
```

---

## 方案二：使用一键脚本

```bash
# 下载并运行部署脚本
curl -sL https://raw.githubusercontent.com/sdiver/home-portal/main/synology-deploy.sh | bash
```

---

## 方案三：使用 Git 子模块（开发者）

创建一个独立的部署仓库，包含三个子模块：

```bash
# 克隆包含子模块的仓库
git clone --recursive https://github.com/sdiver/homegate-docker.git
cd homegate-docker

# 启动
docker-compose up -d --build

# 更新代码
git submodule update --remote
docker-compose up -d --build
```

---

## 更新代码

```bash
cd /volume1/docker/homegate

# 更新每个项目
cd portal && git pull && cd ..
cd parenting && git pull && cd ..
cd cello-practise && git pull && cd ..

# 重新构建
docker-compose up -d --build
```

---

## 文件说明

| 文件 | 来源 | 说明 |
|-----|------|------|
| `portal/` | GitHub | 门户服务代码 |
| `parenting/` | GitHub | 小朋友学习记录代码 |
| `cello-practise/` | GitHub | 大提琴私教代码 |
| `Dockerfile.all-in-one` | 下载 | 三合一容器构建文件 |
| `supervisord.conf` | 下载 | 进程管理配置 |
| `supervisor-services.ini` | 下载 | 服务配置 |
| `start-docker.sh` | 下载 | 启动脚本 |
| `docker-compose.yml` | 手动创建 | 容器编排配置 |

---

## 仓库地址

- **Portal**: https://github.com/sdiver/home-portal
- **Parenting**: https://github.com/sdiver/kids-learning-record
- **Cello**: https://github.com/sdiver/cello-practise
