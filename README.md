# 🏠 家庭应用管理门户

统一的家庭应用入口，提供反向代理、应用管理、AI 聊天等功能。

## 功能特性

### 🔄 反向代理
- 自动将请求转发到各个子应用
- 支持动态添加/删除应用转发规则
- 统一配置注入到子应用

### 📱 应用管理
- 可视化添加、编辑、删除应用
- 自定义应用图标、颜色、分类
- 应用状态监控

### 🤖 AI 助手
- 支持 Claude (Anthropic) 和 OpenAI (GPT) 模型
- 流式对话响应
- 多模型切换
- 对话历史管理

### ⚙️ 统一配置
- 全局设置管理
- AI 模型配置
- 配置自动同步到子应用

## 目录结构

```
portal/
├── server.js           # 主服务器（Express + 反向代理）
├── package.json        # 依赖配置
├── .env.example        # 环境变量示例
├── start.sh            # 启动脚本
├── config/
│   └── apps.json       # 应用和AI模型配置
└── public/
    ├── index.html      # 首页仪表板
    ├── admin.html      # 管理后台
    └── ai-chat.html    # AI 对话页面
```

## 快速开始

### 1. 安装依赖

```bash
cd portal
npm install
```

### 2. 配置环境变量

```bash
cp .env.example .env
# 编辑 .env 文件设置端口和 API Keys
```

### 3. 启动服务

```bash
./start.sh
# 或
npm start
```

### 4. 访问门户

- 主页面: http://localhost:8080
- 管理后台: http://localhost:8080/admin
- AI 聊天: http://localhost:8080/ai-chat

## 配置说明

### 默认应用配置

在 `config/apps.json` 中预配置了两个应用：

1. **大提琴练习** (cello-practise)
   - 端口: 3001
   - 路径: /app/cello-practise

2. **小朋友学习记录** (parenting)
   - 端口: 3002
   - 路径: /app/parenting

### AI 模型配置

在管理后台的 "AI 模型" 标签页中：

#### 1. 远程 Ollama（默认，无需联网配置）

使用 cello 工程中已配置的远程 Ollama 服务：
- Provider: `openai` (兼容模式)
- Base URL: `http://10.147.20.22:11434`
- 模型: `qwen3.5-9b`
- API Key: 任意值（如 `ollama`）

#### 2. Claude (Anthropic)
- 模型 ID: `claude-3-sonnet-20240229`
- Base URL: `https://api.anthropic.com`

#### 3. GPT-4 / GPT-3.5 (OpenAI)
- 模型 ID: `gpt-4` 或 `gpt-3.5-turbo`
- Base URL: `https://api.openai.com`

## API 接口

### 应用管理
- `GET /api/apps` - 获取所有应用
- `POST /api/apps` - 添加应用
- `PUT /api/apps/:id` - 更新应用
- `DELETE /api/apps/:id` - 删除应用

### AI 模型
- `GET /api/ai-models` - 获取所有模型（不含 API Key）
- `GET /api/ai-models/enabled` - 获取启用的模型
- `POST /api/ai-models` - 添加模型
- `PUT /api/ai-models/:id` - 更新模型
- `DELETE /api/ai-models/:id` - 删除模型

### AI 聊天
- `POST /api/ai/chat` - 发送消息（非流式）
- `POST /api/ai/chat/stream` - 发送消息（流式）

### 设置
- `GET /api/settings` - 获取全局设置
- `PUT /api/settings` - 更新全局设置

### 健康检查
- `GET /api/health` - 服务状态检查

## 统一配置注入

门户通过 HTTP 头 `X-Portal-Config` 将配置注入到子应用：

```json
{
  "aiModels": [...],
  "settings": {...}
}
```

子应用可以读取此头部获取统一配置。

## 技术栈

- **后端**: Node.js, Express, http-proxy-middleware
- **前端**: 原生 HTML/CSS/JavaScript
- **AI 接口**: Anthropic Claude API, OpenAI API, Ollama 兼容接口

## 许可证

MIT
