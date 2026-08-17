# Web 前端（Vue 3 + Vite）

与 `backend` 网关前后端分离，开发环境通过 Vite 代理访问 API。

```bash
npm install
npm run dev
```

生产构建：

```bash
npm run build
```

将 `dist/` 部署到 Nginx，并反向代理 `/api` 到网关 `http://your-domain:8080`。

或使用 Docker（需先 `npm run build`）：

```bash
docker compose --profile with-web up -d exam-web
```

完整 UI 已从根目录 `index.html` 迁入 `src/App.vue` + `composables/useExamApp.js`。
