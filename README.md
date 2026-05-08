# 安全考试训练系统

一个基于 **HTML + Vue.js + Node.js + MySQL** 的网络安全考试训练应用，包含判断题、单选题、多选题练习和模拟考试功能。

## 🎯 功能特点

- ✅ **判断题训练** - 练习判断类型题目
- ✅ **单选题训练** - 练习单选类型题目  
- ✅ **多选题训练** - 练习多选类型题目
- ✅ **模拟考试** - 完整的考试模拟（40道判断+140道单选+10道多选，共190题，90分钟）
- ✅ **答题记录** - 记录答题历史和正确率统计
- ✅ **知识要点** - 查看安全知识总结
- ✅ **后端API** - 支持从MySQL数据库获取题目数据
- ✅ **离线模式** - 支持本地JSON文件作为备用数据源

## 🛠️ 技术栈

| 层次 | 技术 | 说明 |
|------|------|------|
| 前端 | HTML5 + Vue.js 2.x | 单页面应用 |
| 后端 | Node.js + Express | RESTful API |
| 数据库 | MySQL 8.0 | 题库数据存储 |
| 容器 | Docker + Docker Compose | 一键部署 |
| 样式 | Tailwind CSS | 响应式布局 |

## 🚀 快速开始

### 环境要求

- Docker Desktop（用于运行后端服务）
- Python 3.x 或 Node.js（用于启动前端静态服务器）

### 一键启动（推荐）

```bash
# 进入项目目录
cd security-exam

# 运行启动脚本（Windows）
start.bat

# 或手动执行
docker-compose up -d
python -m http.server 8000
```

### 手动启动步骤

**1. 启动后端服务（Docker）**

```bash
# 进入项目目录
cd security-exam

# 启动容器（首次启动需下载镜像，耐心等待）
docker-compose up -d

# 停止容器
docker-compose down
```

**2. 启动前端服务**

```bash
# 方式一：使用 Python（推荐）
python -m http.server 8000

# 方式二：使用 Node.js
npx http-server -p 8000

# 方式三：使用 VS Code Live Server 插件
```

### 访问地址

| 服务 | 地址 |
|------|------|
| 前端页面 | http://localhost:8000 |
| 后端API | http://localhost:3001 |

## 🔌 API 接口

### 获取所有题目
```
GET http://localhost:3001/api/questions
```

### 获取随机题目
```
GET http://localhost:3001/api/questions/random
```

### 获取指定数量随机题目
```
GET http://localhost:3001/api/questions/random/{count}
```

### 按类型获取题目
```
GET http://localhost:3001/api/questions/type/{type}
```
类型值：`judge`（判断题）、`single`（单选题）、`multiple`（多选题）

### 测试API状态
```
GET http://localhost:3001/api/health
```

## 📁 项目结构

```
security-exam/
├── index.html          # 主应用页面（桌面端）
├── mobile.html         # 移动端页面
├── questions.json      # 题库数据（离线备用）
├── start.bat           # Windows 一键启动脚本
├── docker-compose.yml  # Docker Compose 配置
├── css/
│   └── style.css       # 样式文件
├── js/
│   ├── app.js          # 主应用逻辑
│   ├── config.js       # 配置文件
│   └── utils/          # 工具函数
├── backend/            # 后端服务
│   ├── server.js       # Node.js 服务器
│   ├── package.json    # 后端依赖
│   └── Dockerfile      # 后端镜像配置
└── miniprogram/        # 微信小程序模板
    ├── app.js
    ├── app.json
    └── pages/
        └── index/
```

## 📊 数据源说明

系统支持双重数据源，自动降级：

1. **优先尝试 API 获取**（后端运行时）
   - 请求地址：`http://localhost:3001/api/questions`
   - 数据来源：MySQL 数据库

2. **自动降级本地 JSON**（后端关闭时）
   - 文件路径：`/questions.json`
   - 作为离线备用方案

## 🐳 Docker 配置说明

### 容器服务
| 服务名 | 镜像 | 端口 | 说明 |
|--------|------|------|------|
| mysql | mysql:8.0 | 3306 | 数据库服务 |
| backend | 自定义Node.js | 3001 | API服务 |

### 数据库配置
- 数据库名：`exam_db`
- 用户名：`admin`
- 密码：`password`
- 端口：`3306`（主机映射）

### 首次启动说明
1. Docker Compose 会自动创建数据库表
2. 题库数据会自动初始化
3. 首次启动可能需要等待1-2分钟

## 📦 部署指南

### 方案一：本地开发

```bash
# 启动完整服务
docker-compose up -d
python -m http.server 8000
```

### 方案二：GitHub Pages（纯前端）

```bash
# 仅部署前端文件（使用本地JSON数据）
git add .
git commit -m "Deploy to GitHub Pages"
git push origin main
```

### 方案三：Vercel / Netlify（全栈）

需配置环境变量：
- `DB_HOST`: MySQL 数据库地址
- `DB_USER`: 数据库用户名
- `DB_PASSWORD`: 数据库密码
- `DB_NAME`: 数据库名称

## 📱 微信小程序配置

### 1. 注册小程序账号
- 前往 [微信公众平台](https://mp.weixin.qq.com/)
- 注册「小程序」类型账号

### 2. 配置业务域名
1. 登录小程序后台 → 开发 → 开发设置 → 业务域名
2. 添加域名并完成验证

### 3. 修改配置
```wxml
<!-- miniprogram/pages/index/index.wxml -->
<web-view src="https://your-domain.com/index.html"></web-view>
```

## ⚠️ 注意事项

1. **首次启动**：首次运行 `docker-compose up -d` 会下载镜像，请耐心等待
2. **数据初始化**：数据库表和题库数据会自动创建
3. **端口占用**：确保 3001 和 8000 端口未被占用
4. **离线模式**：关闭后端后，前端会自动使用本地 JSON 数据
5. **LocalStorage**：答题记录保存在浏览器本地，清除缓存会丢失

## 📄 License

MIT License

---

## 📞 帮助

**常见问题：**

1. **API 无法访问**：检查 Docker 容器是否运行，端口是否正确
2. **页面显示空白**：检查前端服务器是否启动，端口是否被占用
3. **题库加载失败**：确认 `questions.json` 文件存在且格式正确
4. **Docker 启动失败**：检查 Docker Desktop 是否已启动

---

*项目已准备就绪，可以直接部署使用！* ✨