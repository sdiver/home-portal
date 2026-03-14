# 家庭应用中心 - 构建指南

## 目录结构要求

**必须在 `homegate` 根目录下执行构建命令**，确保以下目录结构：

```
homegate/                          <-- 在这个目录下执行命令
├── portal/                        <-- Portal 服务源代码
│   ├── package.json
│   ├── server.js
│   └── ...
├── parenting/                     <-- Parenting 服务源代码
│   ├── package.json
│   ├── server.js
│   └── ...
├── cello-practise/                <-- Cello 服务源代码
│   ├── backend/
│   ├── frontend/
│   └── ...
├── Dockerfile.all-in-one          <-- 三合一容器构建文件
├── docker-compose.all-in-one.yml  <-- Docker Compose 配置
├── supervisord.conf               <-- Supervisord 主配置
├── supervisor-services.ini        <-- 服务配置
└── start-docker.sh                <-- 容器启动脚本
```

## 构建方式

### 方式一：使用 Docker Compose（推荐）

```bash
# 1. 进入 homegate 根目录
cd /path/to/homegate

# 2. 确认目录结构正确
ls -la
# 应该看到: portal/ parenting/ cello-practise/ Dockerfile.all-in-one

# 3. 使用 docker-compose 构建
docker-compose -f docker-compose.all-in-one.yml up -d --build
```

### 方式二：使用启动脚本

```bash
# 1. 进入 homegate 根目录
cd /path/to/homegate

# 2. 运行启动脚本
./start-all-in-one.sh
```

### 方式三：手动 Docker 构建

```bash
# 1. 进入 homegate 根目录
cd /path/to/homegate

# 2. 直接构建（注意最后的点 . 表示当前目录为上下文）
docker build -f Dockerfile.all-in-one -t homegate-all-in-one:latest .

# 3. 运行容器
docker run -d \
  --name homegate \
  -p 8080:8080 \
  -p 3000:3000 \
  -p 3001:3001 \
  -v $(pwd)/parenting/data:/app/parenting/data \
  -v $(pwd)/cello-practise/data:/app/cello-practise/data \
  homegate-all-in-one:latest
```

## 常见错误

### 错误 1: "copy failed no source files were specified"

**原因**: 在错误的目录下执行了构建命令

**解决**: 确保在 `homegate` 根目录下执行，该目录应该包含 `portal/`、`parenting/`、`cello-practise/` 三个子目录

```bash
# 错误 ❌
cd homegate/portal
docker build ..

# 正确 ✅
cd homegate
docker build -f Dockerfile.all-in-one .
```

### 错误 2: "Cannot locate specified Dockerfile"

**原因**: Docker 找不到 Dockerfile

**解决**: 使用 `-f` 参数指定 Dockerfile 路径

```bash
docker build -f Dockerfile.all-in-one -t homegate-all-in-one .
```

### 错误 3: 构建上下文过大

**原因**: 可能包含了 node_modules 等大文件

**解决**: 确保各项目的 `.dockerignore` 文件已正确配置，排除了 `node_modules`

## 检查清单

构建前请确认：

- [ ] 当前目录是 `homegate` 根目录
- [ ] `portal/` 目录存在且包含 `package.json`
- [ ] `parenting/` 目录存在且包含 `package.json`
- [ ] `cello-practise/` 目录存在且包含 `backend/package.json`
- [ ] `Dockerfile.all-in-one` 文件存在
- [ ] `docker-compose.all-in-one.yml` 文件存在

快速检查命令：

```bash
# 检查目录结构
ls portal/package.json parenting/package.json cello-practise/backend/package.json Dockerfile.all-in-one

# 如果以上命令返回 "No such file"，说明你在错误的目录
```
