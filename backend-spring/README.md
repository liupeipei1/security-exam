# Spring Cloud 微服务后端

将原 Node.js `backend/server.js` 拆分为 Spring Boot + Spring Cloud 前后端分离架构。

## 架构

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
    ┌────────────┼────────────┐
    ▼            ▼            ▼
 exam-auth   exam-user   exam-question
  :8081       :8082        :8083
    │            │            │
    └────────────┴────────────┘
                 │
         MySQL (exam-db) + Redis
```

| 模块 | 端口 | 职责 |
|------|------|------|
| exam-registry | 8761 | Eureka 注册中心 |
| exam-gateway | 8080 | 统一入口、CORS、路由 |
| exam-auth-service | 8081 | 微信登录、扫码登录 |
| exam-user-service | 8082 | VIP、用户资料 |
| exam-question-service | 8083 | 题库、题目、做题缓存 |

## 环境要求

- JDK 17+
- Maven 3.8+
- MySQL 8（库名 `exam-db`，沿用 `backend/DML/` 脚本）
- Redis 7

## 快速启动

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
mvn -q -DskipTests package

# 终端 1
mvn -pl exam-registry spring-boot:run

# 终端 2（等 Eureka 就绪后）
mvn -pl exam-gateway spring-boot:run
mvn -pl exam-auth-service spring-boot:run
mvn -pl exam-user-service spring-boot:run
mvn -pl exam-question-service spring-boot:run
```

Windows 可使用项目根目录 `start-spring.bat`（若已提供）。

### 4. 验证

- 题库列表：`GET http://localhost:8080/api/banks`
- 测试登录：`POST http://localhost:8080/api/auth/login`  
  Body: `{"code":"dev","loginType":"mini"}`

## 前端

```bash
cd frontend
npm install
npm run dev
```

访问 http://localhost:5173 ，Vite 将 `/api` 代理到网关 `:8080`。

原根目录 `index.html` 仍可作参考，逐步迁移到 `frontend/`。

## API 兼容性

网关对外路径与原 Node 版一致（`/api/auth/*`、`/api/user/*`、`/api/banks/*`、`/api/questions/*`、`/api/exam/*`），客户端仅需将基址从 `http://localhost:3001` 改为 `http://localhost:8080`。

## JWT 鉴权

- 登录接口返回 `data.token`
- 客户端请求头：`Authorization: Bearer <token>`
- 网关校验 JWT，并向下游传递 `X-Openid`
- 仍兼容 URL 参数 `openid`（过渡期）

## 微信支付

| 接口 | 说明 |
|------|------|
| `POST /api/user/pay/create` | 统一下单，返回小程序 `wx.requestPayment` 参数 |
| `POST /api/user/pay/notify` | 微信支付回调（XML） |

`WECHAT_PAY_ENABLED=false` 时，`pay/create` 直接开通 VIP（开发模式）。

## Docker 一键部署

```bash
# 项目根目录
docker compose up -d --build
```

服务：MySQL、Redis、Eureka、Gateway、Auth、User、Question。

## 原 Node 后端

`backend/server.js` 保留作对照，新开发请以 `backend-spring` 为准。
