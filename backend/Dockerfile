FROM node:20-alpine

##设置工作目录为/app目录
WORKDIR /app

COPY package*.json ./

RUN npm install

LABEL maintainer="m_18664333740@163.com"
LABEL version="1.0.0"
LABEL description="安全考试后端服务"


## 复制应用代码到容器中
COPY . .

## 暴露端口
EXPOSE 3001

COPY . .

EXPOSE 3001

CMD ["npm", "start"]