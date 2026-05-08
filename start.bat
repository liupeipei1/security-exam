@echo off
echo 正在启动后端服务...
cd /d d:\code\security-exam
docker-compose down  ## 停止后端容器

docker-compose up -d

echo 正在启动前端服务...
python -m http.server 8000