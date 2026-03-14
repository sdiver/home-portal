# 家庭应用中心 - 三合一容器部署指南

## 简介

这是一个将所有服务打包在一个容器中的部署方案，适合：
- 群晖 NAS 等低资源环境
- 简化部署和管理
- 快速启动和更新

## 服务清单

| 服务 | 端口 | 访问地址 |
|-----|------|---------|
| Portal (门户首页) | 8080 | http://群晖IP:8080 |
| Parenting (小朋友学习) | 3000 | http://群晖IP:3000 |
| Cello-Practise (大提琴) | 3001 | http://群晖IP:3001 |

## 快速开始

### 1. 构建并启动

```bash
cd /Users/shixiangren/Work/homegate
docker-compose -f docker-compose.all-in-one.yml up -d
```

### 2. 查看日志

```bash
# 查看所有服务日志
docker-compose -f docker-compose.all-in-one.yml logs -f

# 查看单个服务日志
docker logs -f homegate
```

### 3. 停止服务

```bash
docker-compose -f docker-compose.all-in-one.yml down
```

## 群晖 Container Manager 部署

### 方法一：使用 Docker Compose

1. 上传整个 `homegate` 文件夹到群晖的 `/docker/homegate/`
2. SSH 登录群晖：
```bash
cd /volume1/docker/homegate
sudo docker-compose -f docker-compose.all-in-one.yml up -d
```

### 方法二：使用 Container Manager 界面

1. 打开 Container Manager
2. 选择 "项目" → "新建"
3. 项目名称：`homegate`
4. 路径：选择上传的 `homegate` 文件夹
5. 选择 `docker-compose.all-in-one.yml`
6. 点击 "下一步" → "完成"

## 数据持久化

以下数据会持久化到宿主机：

| 容器路径 | 宿主机路径 | 说明 |
|---------|-----------|------|
| `/app/parenting/data` | `./parenting/data` | Parenting 数据 |
| `/app/parenting/kids_learning.db` | `./parenting/kids_learning.db` | Parenting 数据库 |
| `/app/cello-practise/data` | `./cello-practise/data` | Cello 数据 |
| `/app/uploads` | `./cello-practise/uploads` | Cello 上传文件 |
| `/var/log/supervisor` | `./logs` | 日志文件 |

## 更新应用

```bash
cd /volume1/docker/homegate

# 拉取最新代码
git pull

# 重新构建并启动
sudo docker-compose -f docker-compose.all-in-one.yml up -d --build

# 清理旧镜像
sudo docker image prune -f
```

## 进程管理

容器内使用 supervisord 管理三个 Node.js 进程：

```bash
# 查看容器内进程状态
docker exec homegate supervisorctl status

# 重启单个服务
docker exec homegate supervisorctl restart portal
docker exec homegate supervisorctl restart parenting
docker exec homegate supervisorctl restart cello

# 停止单个服务
docker exec homegate supervisorctl stop cello

# 启动单个服务
docker exec homegate supervisorctl start cello
```

## 资源占用

| 指标 | 典型值 | 说明 |
|-----|--------|------|
| 内存 | 200-400MB | 三个服务同时运行 |
| CPU | 低 | 空闲时几乎不占 CPU |
| 磁盘 | 500MB+ | 镜像大小 + 数据 |

## 故障排查

### 查看服务状态
```bash
docker exec homegate supervisorctl status
```

### 查看详细日志
```bash
# Portal 日志
docker exec homegate cat /var/log/supervisor/portal.log

# Parenting 日志
docker exec homegate cat /var/log/supervisor/parenting.log

# Cello 日志
docker exec homegate cat /var/log/supervisor/cello.log
```

### 进入容器调试
```bash
docker exec -it homegate sh

# 在容器内查看进程
ps aux

# 查看端口监听
netstat -tlnp
```

### 服务无法启动
1. 检查端口是否被占用
2. 检查日志文件：`docker logs homegate`
3. 检查 supervisor 状态：`docker exec homegate supervisorctl status`

## 优点 vs 缺点

### 优点
- 部署简单，一个容器搞定
- 资源占用相对较少
- 管理方便，统一启停
- 适合群晖等 NAS 设备

### 缺点
- 单个服务崩溃可能影响其他服务
- 无法单独扩展某个服务
- 不适合高并发场景

## 切换到独立容器

如果需要恢复独立部署：

```bash
# 停止三合一容器
docker-compose -f docker-compose.all-in-one.yml down

# 启动独立容器
docker-compose up -d
```
