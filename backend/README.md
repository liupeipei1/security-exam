# Spring Cloud 微服务后端

将原 Node.js `backend/server.js` 迁移到 **Spring Boot + Spring Cloud 微服务架构**。

## 🏗️ 架构

```
┌─────────────┐     ┌──────────────────┐
│  Web 前端    │     │  微信小程序       │
│  frontend/  │     │  miniprogram/    │
└──────┬──────┘     └────────┬─────────┘
       │    HTTP :8080        │
       └──────────┬───────────┘
                  ▼
         ┌────────────────┐
         │ exam-gateway   │  :8080  API 网关
         └───────┬────────┘
                 │ Eureka 服务发现
    ┌────────────┼────────────┬─────────────┐
    ▼            ▼            ▼             ▼
 exam-account  exam-user-   exam-question  exam-core-
   -auth        center                      service
   :8081        :8085        :8083         :8084
    │            │               │            │
    └────────────┴───────────────┴────────────┘
                 │
         MySQL (exam-db) + Redis
```

## 📦 服务列表

| 模块 | 端口 | 职责 |
|------|------|------|
| exam-registry | 8761 | Eureka 注册中心 |
| exam-gateway | 8080 | 统一入口、CORS、路由、JWT鉴权 |
| exam-account-auth | 8081 | 微信登录、扫码登录、VIP、用户资料、支付 |
| exam-user-center | 8085 | 收藏、笔记管理 |
| exam-question | 8083 | 题库、题目、做题缓存、文件上传、语音合成、考试指南、知识库 |
| exam-core-service | 8084 | 考试记录、进度管理、会话管理、题库配置 |

## 🛠️ 环境要求

- JDK 17+
- Gradle 8.14+（或使用项目 Gradle Wrapper）
- MySQL 8（库名 `exam-db`，沿用 `backend/DML/` 脚本）
- Redis 7

## 🚀 快速启动

### 1. 启动基础设施

```bash
docker compose -f docker-compose.spring.yml up -d
```

导入 AI 题库等大 SQL 请手动执行 `backend/DML/ai_trainer_3.sql`。

### 2. 配置环境变量（可选）

```bash
set DB_HOST=localhost
set DB_PASSWORD=123456
set WECHAT_APPID=你的AppId
set WECHAT_APPSECRET=你的AppSecret
set WECHAT_QR_REDIRECT_URI=http://localhost:8080/api/auth/qrcode/callback
```

### 3. 编译并启动（按顺序开多个终端）

```bash
cd backend-spring
./gradlew build -x test

# 终端 1
./gradlew :exam-registry:bootRun

# 终端 2（等 Eureka 就绪后）
./gradlew :exam-gateway:bootRun
./gradlew :exam-account-auth:bootRun
./gradlew :exam-user-center:bootRun
./gradlew :exam-question:bootRun
./gradlew :exam-core-service:bootRun
```

生成可执行 jar：`./gradlew :exam-gateway:bootJar`（产物在 `exam-gateway/build/libs/`）。

Windows 可使用项目根目录 `start-spring.bat`。

### 4. 验证

```bash
# 检查 Eureka 服务注册
curl http://localhost:8761/eureka/apps/

# 测试登录（开发模式）
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"code":"dev","loginType":"mini"}'

# 获取题库列表
curl http://localhost:8080/api/exams
```

## 🎨 前端

```bash
cd frontend
npm install
npm run dev
```

访问 http://localhost:8000 ，Vite 将 `/api` 代理到网关 `:8080`。

## 🔌 API 路由配置

网关路由规则（`exam-gateway/src/main/resources/application.yml`）：

| 路径 | 目标服务 |
|------|----------|
| `/api/auth/**`, `/api/user/**`, `/api/pay/**` | exam-account-auth |
| `/api/favorites/**`, `/api/notes/**` | exam-user-center |
| `/api/questions/**`, `/api/question/**`, `/api/guide/**`, `/api/knowledge/**`, `/api/speech/**`, `/api/upload/**` | exam-question |
| `/api/exam/**`, `/api/exams/**` | exam-core-service |

## 🔐 JWT 鉴权

- 登录接口返回 `data.token`
- 客户端请求头：`Authorization: Bearer <token>`
- 网关校验 JWT，并向下游传递 `X-Openid`
- 仍兼容 URL 参数 `openid`（过渡期）

## 💳 微信支付

| 接口 | 说明 |
|------|------|
| `POST /api/user/pay/create` | 统一下单，返回小程序 `wx.requestPayment` 参数 |
| `POST /api/user/pay/notify` | 微信支付回调（XML） |

`WECHAT_PAY_ENABLED=false` 时，`pay/create` 直接开通 VIP（开发模式）。

## 🐳 Docker 一键部署

```bash
cd backend-spring
docker compose up -d --build
```

服务：MySQL、Redis、Eureka、Gateway、Account、User-Center、Question、Core-Service。

## 📝 服务合并说明

| 合并前 | 合并后 | 说明 |
|--------|--------|------|
| exam-auth-service + exam-user-center | exam-account-auth | 账户相关服务合并 |
| exam-favorites-service + exam-note-service | exam-user-center | 用户中心服务合并 |
| exam-upload-service | exam-question | 文件上传功能并入题库服务 |

## 📋 原 Node 后端

`backend/server.js` 保留作对照，新开发请以 `backend-spring` 为准。