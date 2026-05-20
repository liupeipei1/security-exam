@echo off
chcp 65001 >nul
echo ========================================
echo  Security Exam - Spring Cloud 启动脚本
echo ========================================
echo.
echo 请先确保 MySQL、Redis 已启动（可用 docker-compose.spring.yml）
echo.

cd /d "%~dp0backend-spring"

echo [1/5] 编译项目...
call mvn -q -DskipTests package
if errorlevel 1 (
  echo 编译失败，请检查 JDK 17 与 Maven
  pause
  exit /b 1
)

echo [2/5] 启动 Eureka 注册中心 :8761
start "exam-registry" cmd /k mvn -pl exam-registry spring-boot:run
timeout /t 15 /nobreak >nul

echo [3/5] 启动 API 网关 :8080
start "exam-gateway" cmd /k mvn -pl exam-gateway spring-boot:run
timeout /t 8 /nobreak >nul

echo [4/5] 启动认证服务 :8081
start "exam-auth-service" cmd /k mvn -pl exam-auth-service spring-boot:run

echo [5/5] 启动用户与题库服务 :8082 :8083
start "exam-user-service" cmd /k mvn -pl exam-user-service spring-boot:run
start "exam-question-service" cmd /k mvn -pl exam-question-service spring-boot:run

echo.
echo 全部服务已在独立窗口启动。
echo 网关地址: http://localhost:8080
echo 前端开发: cd frontend ^&^& npm run dev
echo.
pause
