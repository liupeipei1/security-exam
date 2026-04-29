# 安全考试训练系统

一个基于 HTML + Vue.js 的网络安全考试训练应用，包含判断题、单选题、多选题练习和模拟考试功能。

## 🎯 功能特点

- ✅ **判断题训练** - 练习判断类型题目
- ✅ **单选题训练** - 练习单选类型题目  
- ✅ **多选题训练** - 练习多选类型题目
- ✅ **模拟考试** - 完整的考试模拟（40道判断+140道单选+10道多选，共190题，90分钟）
- ✅ **答题记录** - 记录答题历史和正确率统计
- ✅ **知识要点** - 查看安全知识总结

## 🛠️ 技术栈

- HTML5
- Vue.js 2.x
- Tailwind CSS 样式
- LocalStorage 数据持久化

## 🚀 快速开始

### 本地运行

```bash
# 进入项目目录
cd security-exam

# 启动本地服务器（Python）
python -m http.server 8080

# 或使用 Node.js
npx serve .

# 访问地址
# http://localhost:8080
```

## 📦 部署指南

### 方案一：GitHub Pages（推荐，完全免费）

**步骤 1：创建 GitHub 仓库**
- 登录 [GitHub](https://github.com/)
- 点击 "New" 创建新仓库
- 仓库名建议：`security-exam`
- 选择 "Public"（公开仓库）
- 点击 "Create repository"

**步骤 2：上传代码**
```bash
# 初始化 Git
git init

# 添加所有文件
git add .

# 提交
git commit -m "Initial commit - 安全考试训练系统"

# 添加远程仓库（替换为你的用户名）
git remote add origin https://github.com/你的用户名/security-exam.git

# 推送到 GitHub
git push -u origin main
```

**步骤 3：开启 GitHub Pages**
1. 进入仓库 → 点击 "Settings"
2. 在左侧菜单找到 "Pages"
3. "Source" 选择：`main` 分支，`/root` 目录
4. 点击 "Save"
5. 等待约1-5分钟，页面会显示你的访问地址

**步骤 4：访问地址**
```
https://你的用户名.github.io/security-exam/
```

---

### 方案二：Vercel（免费，功能更强）

```bash
# 安装 Vercel CLI
npm install -g vercel

# 部署
vercel
```

---

### 方案三：Netlify（免费，界面友好）

1. 登录 [Netlify](https://www.netlify.com/)
2. 点击 "New site from Git"
3. 选择 GitHub 仓库
4. 直接部署，无需配置

---

## 📱 微信小程序配置

### 1. 注册小程序账号
- 前往 [微信公众平台](https://mp.weixin.qq.com/)
- 注册「小程序」类型账号
- 完成主体认证

### 2. 配置业务域名（关键步骤）
1. 登录小程序后台 → 开发 → 开发设置 → 业务域名
2. 点击「添加域名」
3. 输入：`你的用户名.github.io`
4. 下载校验文件 `MP_verify_xxxxxx.txt`
5. 将校验文件上传到项目根目录并推送到 GitHub
6. 点击「验证」

### 3. 创建小程序项目

**项目结构**（已在 `miniprogram/` 目录提供模板）：

```
miniprogram/
├── app.js              # 小程序入口
├── app.json            # 全局配置
├── app.wxss            # 全局样式
├── sitemap.json        # 搜索配置
└── pages/
    └── index/
        ├── index.js    # 页面逻辑
        ├── index.wxml  # 页面结构
        └── index.wxss  # 页面样式
```

**修改 index.wxml**（替换为你的域名）：
```wxml
<web-view src="https://你的用户名.github.io/security-exam/index.html"></web-view>
```

**修改 index.json**：
```json
{
  "navigationBarTitleText": "安全考试",
  "navigationStyle": "custom"
}
```

### 4. 预览与发布
1. 使用微信开发者工具打开 `miniprogram/` 目录
2. 配置 AppID（在微信公众平台获取）
3. 预览测试
4. 提交审核

---

## 📁 项目结构

```
security-exam/
├── index.html          # 主应用文件
├── questions.json      # 题库数据（判断题、单选题、多选题）
├── .gitignore          # Git 忽略配置
├── README.md           # 项目说明文档
└── miniprogram/        # 微信小程序模板
    ├── app.js
    ├── app.json
    ├── app.wxss
    ├── sitemap.json
    └── pages/
        └── index/
            ├── index.js
            ├── index.wxml
            └── index.wxss
```

## ⚠️ 注意事项

1. **题库数据**：存储在 `questions.json` 文件中，包含约200道题目
2. **数据持久化**：答题记录使用浏览器 LocalStorage 存储，仅保存在当前设备
3. **模拟考试**：90分钟倒计时，时间结束自动提交
4. **小程序域名校验**：必须完成业务域名配置才能正常访问
5. **HTTPS 要求**：微信小程序要求使用 HTTPS 协议

## 📄 License

MIT License

---

## 📞 帮助

如果在部署过程中遇到问题：

1. **GitHub Pages 无法访问**：检查仓库是否公开，等待5分钟后重试
2. **小程序 web-view 空白**：确认业务域名已正确配置并通过验证
3. **题库加载失败**：检查 `questions.json` 文件路径是否正确

---

*项目已准备就绪，可以直接部署使用！* ✨