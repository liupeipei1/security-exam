# 考试训练系统

一个多题库考试训练应用，支持判断题、单选题、多选题练习和模拟考试、微信登录与会员。

## 🏗️ 架构说明

项目已全面迁移到 **Spring Boot + Spring Cloud 微服务架构**，原 Node.js 后端保留在 `backend/` 仅供对照。

| 目录 | 说明 |
|------|------|
| [backend/](backend/README.md) | Spring Cloud 微服务后端（推荐） |
| [frontend/](frontend/README.md) | Vue 3 + Vite Web 前端 |
| [miniprogram/](miniprogram/) | 微信小程序（API 指向网关 `:8080`） |
| [backend/](backend/) | Node.js 后端（仅供对照参考） |

---

## 🎯 功能特点

- ✅ **判断题训练** - 练习判断类型题目
- ✅ **单选题训练** - 练习单选类型题目  
- ✅ **多选题训练** - 练习多选类型题目
- ✅ **模拟考试** - 完整的考试模拟
- ✅ **答题记录** - 记录答题历史和正确率统计
- ✅ **知识要点** - 查看安全知识总结
- ✅ **收藏功能** - 收藏重点题目
- ✅ **笔记功能** - 记录学习笔记
- ✅ **微信登录** - 支持小程序和H5登录
- ✅ **扫码登录** - H5端扫码登录
- ✅ **VIP会员** - 会员权限管理

---

## 🛠️ 技术栈

| 层次 | 技术 | 说明 |
|------|------|------|
| 前端 | Vue 3 + Vite | 现代前端框架 |
| 后端 | Spring Boot + Spring Cloud | 微服务架构 |
| 网关 | Spring Cloud Gateway | API统一入口 |
| 注册中心 | Eureka | 服务发现 |
| 数据库 | MySQL 8.0 | 题库数据存储 |
| 缓存 | Redis | 会话和进度缓存 |
| 容器 | Docker + Docker Compose | 一键部署 |
| 样式 | Tailwind CSS | 响应式布局 |

---

## 🚀 快速开始（Spring Cloud 版）

### 环境要求

- JDK 17+
- Docker Desktop（用于运行数据库和后端服务）
- Node.js 18+（用于前端开发）

### 启动步骤

**1. 启动基础设施（MySQL + Redis）**

```bash
cd security-exam
docker compose -f docker-compose.spring.yml up -d
```

**2. 启动 Spring 微服务**

```bash
cd backend
# 编译
./gradlew build -x test

# 启动注册中心（终端1）
./gradlew :exam-registry:bootRun

# 等待 Eureka 就绪后，启动其他服务（终端2）
./gradlew :exam-gateway:bootRun
./gradlew :exam-account-auth:bootRun
./gradlew :exam-user-center:bootRun
./gradlew :exam-question:bootRun
./gradlew :exam-core-service:bootRun
```

Windows 用户可使用 `start-spring.bat` 一键启动。

**3. 启动前端服务**

```bash
cd frontend
npm install
npm run dev
```

### 访问地址

| 服务 | 地址 |
|------|------|
| 前端页面 | http://localhost:8000 |
| API网关 | http://localhost:8080 |
| Eureka注册中心 | http://localhost:8761 |

---

## 🔌 API 接口（Spring Gateway）

### 用户认证

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/auth/login` | POST | 用户登录 |
| `/api/auth/qrcode` | GET | 获取扫码登录二维码 |
| `/api/auth/qrcode/check` | GET | 检查扫码状态 |

### 题库管理

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/exams` | GET | 获取考试题库列表 |
| `/api/questions` | GET | 获取所有题目 |
| `/api/questions/random` | GET | 获取随机题目 |
| `/api/questions/random/{count}` | GET | 获取指定数量随机题目 |
| `/api/questions/type/{type}` | GET | 按类型获取题目 |
| `/api/questions/types` | GET | 获取题目类型列表 |
| `/api/questions/tags` | GET | 获取题目标签列表 |
| `/api/questions/count` | GET | 获取题目统计 |

### 考试管理

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/exam/records` | GET | 获取考试记录 |
| `/api/exam/progress` | GET/POST | 获取/保存考试进度 |
| `/api/exam/session` | GET/POST/DELETE | 考试会话管理 |
| `/api/exam/history` | GET | 获取考试历史 |
| `/api/exam/detail` | GET | 获取考试详情 |
| `/api/exam/save` | POST | 保存考试记录 |
| `/api/exam/delete` | DELETE | 删除考试记录 |

### 用户中心

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/favorites` | GET | 获取收藏列表 |
| `/api/favorites/add` | POST | 添加收藏 |
| `/api/favorites/remove` | POST | 移除收藏 |
| `/api/favorites/check` | GET | 检查是否收藏 |
| `/api/questions/note/save` | POST | 保存笔记 |
| `/api/questions/note/list` | GET | 获取笔记列表 |

### 其他接口

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/guide` | GET/PUT | 考试指南 |
| `/api/knowledge/list` | GET | 知识库列表 |
| `/api/upload/image` | POST | 图片上传 |
| `/api/speech` | POST | 语音合成 |

---

## 📁 项目结构

```
security-exam/
├── DML/                      # 数据库初始化脚本
│   ├── ai_trainer_3.sql      # AI训练师三级题库
│   ├── banking_law.sql       # 银行从业法律法规题库
│   ├── exam_config.sql       # 题库配置表
│   ├── exam_guide.sql        # 考试指南
│   ├── knowledge_points.sql  # 知识要点
│   ├── personal_finance.sql  # 个人理财题库
│   ├── security_exam_3.sql   # 网络安全三级题库
│   └── user.sql              # 用户表
├── backend/           # Spring Cloud 微服务后端
│   ├── exam-registry/        # Eureka注册中心 (:8761)
│   ├── exam-gateway/         # API网关 (:8080)
│   ├── exam-account-auth/    # 账户认证服务 (:8081)
│   ├── exam-user-center/     # 用户中心服务 (:8085)
│   ├── exam-question/        # 题库服务 (:8083)
│   └── exam-core-service/    # 考试核心服务 (:8084)
├── frontend/                 # Vue 3 前端应用
│   ├── src/
│   │   ├── App.vue           # 主应用组件
│   │   ├── main.js           # 入口文件
│   │   ├── api/client.js     # API客户端
│   │   └── composables/      # 组合式函数
│   ├── vite.config.js        # Vite配置
│   └── .env.development      # 开发环境变量
├── miniprogram/              # 微信小程序
├── docker-compose.yml        # Node.js版Docker配置
├── docker-compose.spring.yml # Spring版基础设施配置
├── start-spring.bat          # Spring一键启动脚本
└── README.md                 # 项目说明文档
```

---

## 🐳 Docker 部署

### Spring 版一键部署

```bash
# 进入后端目录
cd backend

# 编译并启动所有服务
docker compose up -d --build
```

服务列表：
| 服务名 | 端口 | 说明 |
|--------|------|------|
| exam-registry | 8761 | Eureka注册中心 |
| exam-gateway | 8080 | API网关 |
| exam-account-auth | 8081 | 账户认证 |
| exam-user-center | 8085 | 用户中心 |
| exam-question | 8083 | 题库服务 |
| exam-core-service | 8084 | 考试服务 |
| mysql | 3306 | 数据库 |
| redis | 6379 | 缓存 |

---

## 🚀 CI/CD 配置（Bitbucket + Docker Desktop）

### 架构方案

由于 Runner 就在本地 Docker Desktop 上运行，**无需外部镜像仓库**，直接本地构建部署：

```
Bitbucket仓库 → Bitbucket Pipelines（编译）→ Self-Hosted Runner（本地构建+部署）
                                                    ↓
                                              docker compose up -d --build
```

### 前置准备

1. **添加 Self-Hosted Runner**：
   - Bitbucket → 仓库 → Settings → Pipelines → Runners → Add runner
   - 获取 `RUNNER_UUID` 和 `RUNNER_TOKEN`

### 配置文件

| 文件 | 说明 |
|------|------|
| `bitbucket-pipelines.yml` | Bitbucket Pipelines 配置 |
| `start-bitbucket-runner.ps1` | 本地 Runner 启动脚本 |

### 启动本地 Runner

```powershell
# Windows PowerShell
.\start-bitbucket-runner.ps1

# 或手动启动（替换参数）
cd ~\bitbucket-runner
java -jar runner.jar ^
    --workspace "你的工作空间名" ^
    --repo-slug "你的仓库名" ^
    --uuid "你的Runner UUID" ^
    --token "你的Runner Token"
```

### Pipeline 流程

每次 push 代码后自动执行：

1. **编译后端**：`gradlew build -x test`
2. **编译前端**：`npm run build`
3. **部署到本地**：Runner 执行 `docker compose up -d --build`

### 手动部署

```bash
cd backend
docker compose down --remove-orphans
docker compose up -d --build
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

---

## ⚠️ 注意事项

1. **首次启动**：首次运行 Docker Compose 会下载镜像，请耐心等待
2. **服务启动顺序**：必须先启动 Eureka（8761），再启动其他服务
3. **端口占用**：确保 8080、8081、8083、8084、8085、8761 端口未被占用
4. **数据库配置**：数据库名 `exam-db`，用户名 `admin`，密码 `password`

---

## 📄 License

MIT License

---

*项目已准备就绪，可以直接部署使用！* ✨
