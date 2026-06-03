# 公网部署指南

## 一、准备工作

### 1.1 服务器要求
- 操作系统：Ubuntu 20.04+ / CentOS 7+
- 配置：至少 2核4G，推荐 4核8G
- 需要公网IP地址

### 1.2 域名配置
1. 注册域名（如 `api.yourdomain.com`）
2. 在域名服务商处配置解析记录：
   - 类型：A记录
   - 主机记录：api
   - 记录值：服务器公网IP

### 1.3 开放端口
在服务器安全组/防火墙开放以下端口：
- 80（HTTP）
- 443（HTTPS）
- 3306（MySQL，可选，仅本地访问）

---

## 二、服务器环境准备

### 2.1 安装 Docker 和 Docker Compose

```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装 Docker
curl -fsSL https://get.docker.com | sh

# 安装 Docker Compose
sudo apt install docker-compose-plugin -y

# 启动 Docker 服务
sudo systemctl enable --now docker
```

### 2.2 申请 SSL 证书（Let's Encrypt）

```bash
# 安装 Certbot
sudo apt install certbot python3-certbot-nginx -y

# 申请证书（替换为你的域名）
sudo certbot certonly --nginx -d api.yourdomain.com

# 证书位置
# /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem
# /etc/letsencrypt/live/api.yourdomain.com/privkey.pem
```

---

## 三、部署应用

### 3.1 上传代码到服务器

```bash
# 使用 SSH 上传（或使用 Git）
scp -r /本地路径/security-exam root@服务器IP:/opt/

# 进入项目目录
cd /opt/security-exam
```

### 3.2 复制 SSL 证书

```bash
# 创建证书目录
mkdir -p nginx/certs

# 复制证书（替换为你的域名）
cp /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem nginx/certs/
cp /etc/letsencrypt/live/api.yourdomain.com/privkey.pem nginx/certs/
```

### 3.3 修改配置文件

1. **修改 Nginx 配置**：
   - 编辑 `nginx/conf/default.conf`
   - 将 `api.yourdomain.com` 替换为你的实际域名

2. **修改小程序配置**：
   - 编辑 `miniprogram/utils/config.js`
   - 将 `API_BASE` 改为 `https://api.yourdomain.com`

### 3.4 启动服务

```bash
# 使用生产环境配置启动
docker compose -f docker-compose.prod.yml up -d

# 查看运行状态
docker compose -f docker-compose.prod.yml ps
```

---

## 四、微信公众平台配置

### 4.1 配置服务器域名
1. 登录 [微信公众平台](https://mp.weixin.qq.com/)
2. 进入「开发」→「开发设置」
3. 在「服务器域名」中添加：
   - request 合法域名：`https://api.yourdomain.com`
   - socket 合法域名（如需要）
   - uploadFile 合法域名（如需要）
   - downloadFile 合法域名（如需要）

### 4.2 配置业务域名（可选）
如需 H5 访问，配置业务域名。

---

## 五、验证部署

```bash
# 检查服务状态
docker compose -f docker-compose.prod.yml logs backend

# 测试 API
curl https://api.yourdomain.com/api/questions/random/5
```

---

## 六、常用命令

```bash
# 查看日志
docker compose -f docker-compose.prod.yml logs -f

# 停止服务
docker compose -f docker-compose.prod.yml down

# 更新代码后重启
docker compose -f docker-compose.prod.yml up -d --build

# 备份数据库
docker exec exam-mysql mysqldump -uroot -p123456 exam-db > backup.sql
```

---

## 七、注意事项

1. **SSL 证书续期**：Let's Encrypt 证书有效期 90 天，需定期续期
   ```bash
   sudo certbot renew
   ```

2. **安全组配置**：确保仅开放必要端口，MySQL 端口建议仅允许本地访问

3. **环境变量**：生产环境应使用 `.env` 文件管理敏感配置

4. **微信配置**：确保 `WECHAT_APPID` 和 `WECHAT_APPSECRET` 配置正确