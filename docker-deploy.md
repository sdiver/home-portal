# Portal Docker 部署指南

## 快速开始

```bash
# 构建并启动
docker-compose up -d

# 查看日志
docker-compose logs -f portal
```

## 群晖 Container Manager 部署

1. 上传项目到 `/docker/portal/`
2. SSH 登录执行：
```bash
cd /volume1/docker/portal
sudo docker-compose up -d
```

## 端口

- 8080：应用访问端口
- 访问地址：`http://群晖IP:8080`

## 更新应用

```bash
git pull
sudo docker-compose build --no-cache
sudo docker-compose up -d
```
