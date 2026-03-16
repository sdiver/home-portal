const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 8080;

// 基础路径前缀（用于反向代理子路径部署）
const BASE_PATH = process.env.BASE_PATH || '/portal-home';

// 配置文件路径
const CONFIG_PATH = path.join(__dirname, 'config', 'apps.json');

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// 加载配置
function loadConfig() {
    try {
        const data = fs.readFileSync(CONFIG_PATH, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        console.error('加载配置失败:', err);
        return { apps: [], aiModels: [], settings: {} };
    }
}

// 保存配置
function saveConfig(config) {
    try {
        fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf8');
        return true;
    } catch (err) {
        console.error('保存配置失败:', err);
        return false;
    }
}

// 动态创建代理中间件
// basePath: 如 '/portal-home' 或 null
// appPath: 如 '/app/parenting'
function createDynamicProxy(targetUrl, basePath, appPath) {
    const pathRewriteKey = basePath ? `^${basePath}${appPath}(/|$)` : `^${appPath}(/|$)`;
    const middleware = createProxyMiddleware({
        target: targetUrl,
        changeOrigin: true,
        ws: true,
        timeout: 30000,
        proxyTimeout: 30000,
        pathRewrite: {
            [pathRewriteKey]: '/$1'
        },
        onError: (err, req, res) => {
            console.error('代理错误:', err.message, '目标:', targetUrl, '路径:', req.url);
            res.status(502).json({
                error: '服务不可用',
                message: '目标应用可能未启动',
                target: targetUrl
            });
        },
        onProxyReq: (proxyReq, req, res) => {
            // 添加全局配置到请求头（使用 base64 编码避免非法字符）
            const config = loadConfig();
            const configData = Buffer.from(JSON.stringify({
                aiModels: config.aiModels.filter(m => m.enabled),
                settings: config.settings
            })).toString('base64');
            proxyReq.setHeader('X-Portal-Config', configData);

            // 传递代理路径信息，让后端知道当前的代理前缀
            // 始终使用带 BASE_PATH 的完整路径
            const fullPath = `${BASE_PATH}${appPath}`;
            proxyReq.setHeader('X-Proxy-Path', fullPath);

            // 如果 body 已经被解析（如 express.json()），需要重新写入
            // 注意：只处理 JSON 请求，跳过 multipart 文件上传
            const contentType = req.headers['content-type'] || '';
            if (req.body && typeof req.body === 'object' && !contentType.includes('multipart/form-data')) {
                const bodyData = JSON.stringify(req.body);
                proxyReq.setHeader('Content-Type', 'application/json');
                proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
                proxyReq.write(bodyData);
            }
        }
    });
    // 标记为代理中间件，便于清除时识别
    middleware._isProxyMiddleware = true;
    return middleware;
}

// ==================== API 路由 ====================
// 创建 API Router，同时挂载到 /api 和 ${BASE_PATH}/api
const apiRouter = express.Router();

// 获取所有应用配置
apiRouter.get('/apps', (req, res) => {
    const config = loadConfig();
    // 添加 BASE_PATH 前缀到 url 字段（仅用于返回给前端，不保存到文件）
    const appsWithBasePath = config.apps.map(app => {
        // 确保 url 不包含重复的 BASE_PATH 前缀
        const cleanUrl = (app.url || `/app/${app.id}`).replace(new RegExp(`^${BASE_PATH}`), '');
        return {
            ...app,
            url: `${BASE_PATH}${cleanUrl}`
        };
    });
    res.json({ success: true, data: appsWithBasePath });
});

// 获取单个应用
apiRouter.get('/apps/:id', (req, res) => {
    const config = loadConfig();
    const app_config = config.apps.find(a => a.id === req.params.id);
    if (!app_config) {
        return res.status(404).json({ success: false, message: '应用不存在' });
    }
    res.json({ success: true, data: app_config });
});

// 添加新应用
apiRouter.post('/apps', (req, res) => {
    const config = loadConfig();
    const newApp = {
        id: req.body.id || uuidv4(),
        name: req.body.name,
        description: req.body.description || '',
        icon: req.body.icon || '📱',
        url: `/app/${req.body.id || uuidv4()}`,
        targetUrl: req.body.targetUrl,
        category: req.body.category || '其他',
        color: req.body.color || '#666666',
        enabled: req.body.enabled !== false,
        showInDashboard: req.body.showInDashboard !== false,
        createdAt: new Date().toISOString()
    };

    config.apps.push(newApp);
    if (saveConfig(config)) {
        // 动态注册新代理
        setupProxyRoutes();
        res.json({ success: true, data: newApp });
    } else {
        res.status(500).json({ success: false, message: '保存失败' });
    }
});

// 更新应用
apiRouter.put('/apps/:id', (req, res) => {
    const config = loadConfig();
    const index = config.apps.findIndex(a => a.id === req.params.id);
    if (index === -1) {
        return res.status(404).json({ success: false, message: '应用不存在' });
    }

    // 清理 url 字段中的 BASE_PATH 前缀，避免重复添加
    const body = { ...req.body };
    if (body.url) {
        body.url = body.url.replace(new RegExp(`^${BASE_PATH}`), '');
    }

    config.apps[index] = { ...config.apps[index], ...body };
    if (saveConfig(config)) {
        setupProxyRoutes();
        res.json({ success: true, data: config.apps[index] });
    } else {
        res.status(500).json({ success: false, message: '保存失败' });
    }
});

// 删除应用
apiRouter.delete('/apps/:id', (req, res) => {
    const config = loadConfig();
    config.apps = config.apps.filter(a => a.id !== req.params.id);
    if (saveConfig(config)) {
        setupProxyRoutes();
        res.json({ success: true, message: '删除成功' });
    } else {
        res.status(500).json({ success: false, message: '删除失败' });
    }
});

// ==================== AI 模型配置 API ====================

// 获取所有 AI 模型配置
apiRouter.get('/ai-models', (req, res) => {
    const config = loadConfig();
    // 返回时不包含 API Key（安全考虑）
    const safeModels = config.aiModels.map(m => ({
        ...m,
        apiKey: m.apiKey ? '********' : ''
    }));
    res.json({ success: true, data: safeModels });
});

// 获取启用的 AI 模型（供前端使用）
apiRouter.get('/ai-models/enabled', (req, res) => {
    const config = loadConfig();
    const enabledModels = config.aiModels
        .filter(m => m.enabled)
        .map(m => ({
            id: m.id,
            name: m.name,
            provider: m.provider,
            model: m.model,
            default: m.default
        }));
    res.json({ success: true, data: enabledModels });
});

// 更新 AI 模型配置
apiRouter.put('/ai-models/:id', (req, res) => {
    const config = loadConfig();
    const index = config.aiModels.findIndex(m => m.id === req.params.id);
    if (index === -1) {
        return res.status(404).json({ success: false, message: '模型不存在' });
    }

    const { apiKey, ...otherUpdates } = req.body;

    // 如果提供了新的 API Key，则更新；否则保留原值
    if (apiKey && apiKey !== '********') {
        otherUpdates.apiKey = apiKey;
    } else if (apiKey === '') {
        otherUpdates.apiKey = '';
    }

    config.aiModels[index] = { ...config.aiModels[index], ...otherUpdates };

    // 如果设置为默认，取消其他默认
    if (otherUpdates.default) {
        config.aiModels.forEach((m, i) => {
            if (i !== index) m.default = false;
        });
    }

    if (saveConfig(config)) {
        res.json({ success: true, data: config.aiModels[index] });
    } else {
        res.status(500).json({ success: false, message: '保存失败' });
    }
});

// 添加新的 AI 模型
apiRouter.post('/ai-models', (req, res) => {
    const config = loadConfig();
    const newModel = {
        id: req.body.id || uuidv4(),
        name: req.body.name,
        provider: req.body.provider,
        apiKey: req.body.apiKey || '',
        baseUrl: req.body.baseUrl,
        model: req.body.model,
        enabled: req.body.enabled !== false,
        default: false
    };

    config.aiModels.push(newModel);
    if (saveConfig(config)) {
        res.json({ success: true, data: newModel });
    } else {
        res.status(500).json({ success: false, message: '保存失败' });
    }
});

// 删除 AI 模型
apiRouter.delete('/ai-models/:id', (req, res) => {
    const config = loadConfig();
    config.aiModels = config.aiModels.filter(m => m.id !== req.params.id);
    if (saveConfig(config)) {
        res.json({ success: true, message: '删除成功' });
    } else {
        res.status(500).json({ success: false, message: '删除失败' });
    }
});

// ==================== AI 代理 API ====================

// AI 聊天接口
apiRouter.post('/ai/chat', async (req, res) => {
    const { message, modelId, systemPrompt, history = [] } = req.body;
    const config = loadConfig();

    const modelConfig = modelId
        ? config.aiModels.find(m => m.id === modelId)
        : config.aiModels.find(m => m.default) || config.aiModels[0];

    if (!modelConfig || !modelConfig.enabled) {
        return res.status(400).json({ success: false, message: 'AI 模型未配置或未启用' });
    }

    if (!modelConfig.apiKey) {
        return res.status(400).json({ success: false, message: 'API Key 未配置' });
    }

    try {
        let response;

        if (modelConfig.provider === 'anthropic') {
            const messages = history.map(h => ({
                role: h.role,
                content: h.content
            }));
            messages.push({ role: 'user', content: message });

            response = await axios.post(
                `${modelConfig.baseUrl}/v1/messages`,
                {
                    model: modelConfig.model,
                    max_tokens: 4096,
                    system: systemPrompt || 'You are a helpful assistant.',
                    messages: messages
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'x-api-key': modelConfig.apiKey,
                        'anthropic-version': '2023-06-01'
                    }
                }
            );

            res.json({
                success: true,
                data: {
                    content: response.data.content[0].text,
                    model: modelConfig.model,
                    usage: response.data.usage
                }
            });
        } else if (modelConfig.provider === 'openai') {
            const messages = [
                { role: 'system', content: systemPrompt || 'You are a helpful assistant.' },
                ...history.map(h => ({ role: h.role, content: h.content })),
                { role: 'user', content: message }
            ];

            response = await axios.post(
                `${modelConfig.baseUrl}/v1/chat/completions`,
                {
                    model: modelConfig.model,
                    messages: messages
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${modelConfig.apiKey}`
                    }
                }
            );

            res.json({
                success: true,
                data: {
                    content: response.data.choices[0].message.content,
                    model: modelConfig.model,
                    usage: response.data.usage
                }
            });
        } else {
            res.status(400).json({ success: false, message: '不支持的 AI 提供商' });
        }
    } catch (error) {
        console.error('AI API 错误:', error.response?.data || error.message);
        res.status(500).json({
            success: false,
            message: 'AI 请求失败',
            error: error.response?.data?.error?.message || error.message
        });
    }
});

// AI 流式聊天接口
apiRouter.post('/ai/chat/stream', async (req, res) => {
    const { message, modelId, systemPrompt, history = [] } = req.body;
    const config = loadConfig();

    const modelConfig = modelId
        ? config.aiModels.find(m => m.id === modelId)
        : config.aiModels.find(m => m.default) || config.aiModels[0];

    if (!modelConfig || !modelConfig.enabled) {
        return res.status(400).json({ success: false, message: 'AI 模型未配置或未启用' });
    }

    if (!modelConfig.apiKey) {
        return res.status(400).json({ success: false, message: 'API Key 未配置' });
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    try {
        if (modelConfig.provider === 'anthropic') {
            const messages = history.map(h => ({
                role: h.role,
                content: h.content
            }));
            messages.push({ role: 'user', content: message });

            const response = await axios.post(
                `${modelConfig.baseUrl}/v1/messages`,
                {
                    model: modelConfig.model,
                    max_tokens: 4096,
                    system: systemPrompt || 'You are a helpful assistant.',
                    messages: messages,
                    stream: true
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'x-api-key': modelConfig.apiKey,
                        'anthropic-version': '2023-06-01'
                    },
                    responseType: 'stream'
                }
            );

            response.data.on('data', (chunk) => {
                const lines = chunk.toString().split('\n');
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.slice(6);
                        if (data === '[DONE]') {
                            res.write('data: [DONE]\n\n');
                        } else {
                            try {
                                const parsed = JSON.parse(data);
                                if (parsed.type === 'content_block_delta') {
                                    res.write(`data: ${JSON.stringify({ content: parsed.delta.text })}\n\n`);
                                }
                            } catch (e) {
                                // 忽略解析错误
                            }
                        }
                    }
                }
            });

            response.data.on('end', () => {
                res.end();
            });
        } else if (modelConfig.provider === 'openai') {
            const messages = [
                { role: 'system', content: systemPrompt || 'You are a helpful assistant.' },
                ...history.map(h => ({ role: h.role, content: h.content })),
                { role: 'user', content: message }
            ];

            const response = await axios.post(
                `${modelConfig.baseUrl}/v1/chat/completions`,
                {
                    model: modelConfig.model,
                    messages: messages,
                    stream: true
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${modelConfig.apiKey}`
                    },
                    responseType: 'stream'
                }
            );

            response.data.on('data', (chunk) => {
                const lines = chunk.toString().split('\n');
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.slice(6);
                        if (data === '[DONE]') {
                            res.write('data: [DONE]\n\n');
                        } else {
                            try {
                                const parsed = JSON.parse(data);
                                const content = parsed.choices[0]?.delta?.content;
                                if (content) {
                                    res.write(`data: ${JSON.stringify({ content })}\n\n`);
                                }
                            } catch (e) {
                                // 忽略解析错误
                            }
                        }
                    }
                }
            });

            response.data.on('end', () => {
                res.end();
            });
        }
    } catch (error) {
        console.error('AI 流式请求错误:', error.message);
        res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
        res.end();
    }
});

// ==================== 全局配置 API ====================

// 获取全局配置
apiRouter.get('/settings', (req, res) => {
    const config = loadConfig();
    res.json({ success: true, data: config.settings });
});

// 更新全局配置
apiRouter.put('/settings', (req, res) => {
    const config = loadConfig();
    config.settings = { ...config.settings, ...req.body };
    if (saveConfig(config)) {
        res.json({ success: true, data: config.settings });
    } else {
        res.status(500).json({ success: false, message: '保存失败' });
    }
});

// 健康检查
apiRouter.get('/health', (req, res) => {
    const config = loadConfig();
    const appStatuses = config.apps.map(a => ({
        id: a.id,
        name: a.name,
        enabled: a.enabled,
        targetUrl: a.targetUrl
    }));

    res.json({
        success: true,
        data: {
            status: 'running',
            timestamp: new Date().toISOString(),
            portalUrl: `http://localhost:${PORT}`,
            apps: appStatuses,
            aiModels: config.aiModels.filter(m => m.enabled).length
        }
    });
});

// 挂载 API Router 到两个路径（同时支持带前缀和不带前缀）
app.use('/api', apiRouter);
app.use(`${BASE_PATH}/api`, apiRouter);

// ==================== 代理路由设置 ====================

function setupProxyRoutes() {
    const config = loadConfig();

    // 清除现有代理中间件（通过标记删除）
    const beforeCount = app._router.stack.length;
    app._router.stack = app._router.stack.filter(layer => {
        return !layer.handle || !layer.handle._isProxyMiddleware;
    });
    const afterCount = app._router.stack.length;
    console.log(`🧹 清除 ${beforeCount - afterCount} 个旧代理中间件`);

    // 注册新的代理路由
    config.apps.forEach(appConfig => {
        if (appConfig.enabled && appConfig.targetUrl) {
            // 使用 id 构建代理路径，避免 url 字段中的 BASE_PATH 前缀影响
            const proxyPath = `/app/${appConfig.id}`;

            // 注册不带前缀的路径
            const proxyMiddleware1 = createDynamicProxy(appConfig.targetUrl, null, proxyPath);
            app.use(proxyPath, proxyMiddleware1);
            app.use(`${proxyPath}/*`, proxyMiddleware1);

            // 注册带 BASE_PATH 前缀的路径（需要 pathRewrite）
            const proxyMiddleware2 = createDynamicProxy(appConfig.targetUrl, BASE_PATH, proxyPath);
            app.use(`${BASE_PATH}${proxyPath}`, proxyMiddleware2);
            app.use(`${BASE_PATH}${proxyPath}/*`, proxyMiddleware2);

            console.log(`✅ 代理已注册: ${proxyPath} -> ${appConfig.targetUrl}`);
            console.log(`✅ 代理已注册: ${BASE_PATH}${proxyPath} -> ${appConfig.targetUrl}`);
        }
    });
}

// ==================== 页面路由 ====================

// 管理后台（同时支持带前缀和不带前缀）
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});
app.get(`${BASE_PATH}/admin`, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// AI 聊天页面（同时支持带前缀和不带前缀）
app.get('/ai-chat', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'ai-chat.html'));
});
app.get(`${BASE_PATH}/ai-chat`, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'ai-chat.html'));
});

// 主页 - 应用仪表板（同时支持带前缀和不带前缀）
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
app.get(`${BASE_PATH}/`, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 启动服务器
app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════════════════════╗
║            🏠 家庭应用管理门户已启动                      ║
╠════════════════════════════════════════════════════════╣
║  主页面: http://localhost:${PORT}                          ║
║  管理后台: http://localhost:${PORT}/admin                  ║
║  AI 聊天: http://localhost:${PORT}/ai-chat                 ║
╚════════════════════════════════════════════════════════╝
    `);

    // 初始设置代理路由
    setupProxyRoutes();
});

module.exports = app;
