# 安全考试训练系统

一个多题库考试训练应用，支持判断题、单选题、多选题练习和模拟考试、微信登录与会员。

## Spring Cloud 版（推荐）

项目已提供 **Spring Boot + Spring Cloud 前后端分离** 实现：

| 目录 | 说明 |
|------|------|
| [backend-spring/](backend-spring/README.md) | 微服务后端（Gateway + Auth + User + Question） |
| [frontend/](frontend/README.md) | Vue 3 + Vite Web 前端 |
| [miniprogram/](miniprogram/) | 微信小程序（API 指向网关 `:8080`） |

- **API 网关**：`http://localhost:8080`（原 Node 版为 `:3001`）
- **启动**：`start-spring.bat` 或见 [backend-spring/README.md](backend-spring/README.md)
- **基础设施**：`docker compose -f docker-compose.spring.yml up -d`

原 Node.js 后端保留在 `backend/`，仅供对照。

---

## 经典版（Node.js）

一个基于 **Vue.js + Node.js + MySQL** 的实现，包含判断题、单选题、多选题练习和模拟考试功能。

## 🎯 功能特点

- ✅ **判断题训练** - 练习判断类型题目
- ✅ **单选题训练** - 练习单选类型题目  
- ✅ **多选题训练** - 练习多选类型题目
- ✅ **模拟考试** - 完整的考试模拟（40道判断+140道单选+10道多选，共190题，90分钟）
- ✅ **答题记录** - 记录答题历史和正确率统计
- ✅ **知识要点** - 查看安全知识总结
- ✅ **后端API** - 支持从MySQL数据库获取题目数据
- ✅ **多题库支持** - 支持网络安全、银行从业等多个题库

## 🛠️ 技术栈

| 层次 | 技术 | 说明 |
|------|------|------|
| 前端 | Vue 3 + Vite | 现代前端框架 |
| 后端 | Node.js + Express | RESTful API |
| 数据库 | MySQL 8.0 | 题库数据存储 |
| 容器 | Docker + Docker Compose | 一键部署 |
| 样式 | Tailwind CSS | 响应式布局 |

## 🚀 快速开始

### 环境要求

- Docker Desktop（用于运行数据库和后端服务）
- Node.js 18+（用于前端开发）

### 启动步骤

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
# 进入前端目录
cd frontend

# 安装依赖（首次运行）
npm install

# 启动开发服务器
npm run dev
```

### 访问地址

| 服务 | 地址 |
|------|------|
| 前端页面 | http://localhost:8000 |
| 后端API | http://localhost:3001 |

## 🔌 API 接口

### 获取考试题库列表
```
GET http://localhost:3001/api/exams
```

### 获取所有题目
```
GET http://localhost:3001/api/questions
```

### 获取指定题库题目
```
GET http://localhost:3001/api/questions/exam/{examCode}
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
├── .env.example        # 环境变量示例
├── .gitignore          # Git忽略配置
├── README.md           # 项目说明文档
├── start.bat           # Windows 一键启动脚本
├── start-spring.bat    # Spring Cloud 启动脚本
├── docker-compose.yml  # Docker Compose 配置
├── docker-compose.spring.yml  # Spring Cloud Docker配置
├── DML/                # 数据库初始化脚本
│   ├── ai_trainer_3.sql       # AI训练师三级题库
│   ├── banking_law.sql        # 银行从业法律法规题库
│   ├── exam_config.sql        # 题库配置表
│   ├── exam_guide.sql         # 考试指南
│   ├── knowledge_points.sql   # 知识要点
│   ├── personal_finance.sql   # 个人理财题库
│   ├── security_exam_3.sql    # 网络安全三级题库
│   └── user.sql               # 用户表
├── backend/            # Node.js 后端服务（仅供对照）
│   ├── server.js       # Node.js 服务器
│   ├── package.json    # 后端依赖
│   ├── package-lock.json
│   ├── Dockerfile      # 后端镜像配置
│   └── config/         # 配置文件
├── backend-spring/     # Spring Cloud 后端（推荐）
│   ├── exam-gateway/   # API网关
│   ├── exam-auth-service/   # 认证服务
│   ├── exam-user-service/   # 用户服务
│   ├── exam-question-service/ # 题库服务
│   └── exam-registry/  # Eureka注册中心
├── frontend/           # Vue 3 前端应用
│   ├── index.html      # 入口HTML
│   ├── package.json    # 前端依赖
│   ├── vite.config.js  # Vite配置
│   ├── nginx.conf      # Nginx配置
│   ├── .env.development # 开发环境变量
│   ├── dist/           # 构建产物
│   └── src/            # 源代码
│       ├── App.vue     # 主应用组件
│       ├── main.js     # 入口文件
│       └── ...         # 其他组件和工具
├── miniprogram/        # 微信小程序
│   ├── app.js          # 小程序入口
│   ├── app.json        # 小程序配置
│   ├── app.wxss        # 全局样式
│   └── pages/          # 页面目录
└── 文档题库/           # 题库文档（原始资料）
    ├── 个人理财/
    ├── 法律法规/
    ├── 网络安全-3级/
    └── 训练师-3级/
```

## 📊 数据源说明

系统使用 MySQL 数据库作为主要数据源：

1. **数据库初始化**：Docker Compose 启动时自动执行 `DML/` 目录下的 SQL 脚本
2. **题库配置**：`exam_config` 表存储题库元信息
3. **题目数据**：各题库表存储具体题目

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
# 启动后端服务
cd security-exam
docker-compose up -d

# 启动前端开发服务器
cd frontend
npm install
npm run dev
```

### 方案二：生产构建

```bash
# 构建前端
cd frontend
npm run build

# 使用 nginx 部署 dist 目录
```

---

## 🌐 公网访问方案（跨网络访问）

### 方案三：云服务器部署（推荐）

**步骤 1：购买云服务器**

推荐选择：
- 阿里云 ECS（国内）
- 腾讯云 CVM（国内）
- AWS EC2（海外）
- 华为云弹性云服务器

配置建议：
- CPU：1核以上
- 内存：2GB以上
- 系统：Ubuntu 22.04 LTS

**步骤 2：连接服务器**

```bash
# 使用 SSH 连接（Windows 使用 Xshell 或 PowerShell）
ssh root@你的服务器IP
```

**步骤 3：安装依赖**

```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装 Docker
curl -fsSL https://get.docker.com | sh

# 安装 Docker Compose
sudo apt install docker-compose-plugin -y

# 安装 Git
sudo apt install git -y
```

**步骤 4：克隆项目**

```bash
git clone https://github.com/你的用户名/security-exam.git
cd security-exam
```

**步骤 5：启动服务**

```bash
# 启动容器（后台运行）
docker-compose up -d

# 查看运行状态
docker-compose ps
```

**步骤 6：配置防火墙**

```bash
# 开放端口
sudo ufw allow 8000/tcp
sudo ufw allow 3001/tcp
sudo ufw enable
```

**步骤 7：访问地址**

| 服务 | 地址 |
|------|------|
| 前端页面 | http://你的服务器IP:8000 |
| 后端API | http://你的服务器IP:3001 |

---

### 方案四：内网穿透（临时测试）

适用于没有云服务器的情况，临时分享给外网用户测试。

**方式 1：使用 ngrok**

```bash
# 1. 下载 ngrok（Windows）
# 访问 https://ngrok.com/download 下载

# 2. 注册账号获取 auth token
# https://dashboard.ngrok.com/get-started/your-authtoken

# 3. 认证（Windows）
ngrok config add-authtoken 你的authtoken

# 4. 启动穿透（前端）
ngrok http 8000

# 5. 启动穿透（后端，新终端）
ngrok http 3001
```

输出示例：
```
Forwarding  https://scary-lung-scabby.ngrok-free.dev/ -> http://localhost:8000
Forwarding  https://def456.ngrok.io -> http://localhost:3001
```

---

### 方案五：配置域名（专业部署）

**步骤 1：购买域名**

- 阿里云域名
- 腾讯云域名
- GoDaddy（海外）

**步骤 2：解析域名**

添加 A 记录指向你的服务器 IP：
```
exam.yourdomain.com -> 服务器IP
api.exam.yourdomain.com -> 服务器IP
```

**步骤 3：配置 Nginx 反向代理**

```bash
# 安装 Nginx
sudo apt install nginx -y

# 创建配置文件
sudo nano /etc/nginx/sites-available/exam
```

配置内容：
```nginx
server {
    listen 80;
    server_name exam.yourdomain.com;

    location / {
        root /var/www/security-exam/frontend/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }
}

server {
    listen 80;
    server_name api.exam.yourdomain.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

```bash
# 启用配置
sudo ln -s /etc/nginx/sites-available/exam /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

**步骤 4：配置 HTTPS（SSL证书）**

```bash
# 安装 Certbot
sudo apt install certbot python3-certbot-nginx -y

# 获取证书
sudo certbot --nginx -d exam.yourdomain.com -d api.exam.yourdomain.com
```

---

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
4. **LocalStorage**：答题记录保存在浏览器本地，清除缓存会丢失

## 📄 License

MIT License

---

## 📞 帮助

**常见问题：**

1. **API 无法访问**：检查 Docker 容器是否运行，端口是否正确
2. **页面显示空白**：检查前端服务器是否启动，端口是否被占用
3. **题库加载失败**：确认数据库服务正常运行，`exam_config` 表存在数据
4. **Docker 启动失败**：检查 Docker Desktop 是否已启动

---

*项目已准备就绪，可以直接部署使用！* ✨