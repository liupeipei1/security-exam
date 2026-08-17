@echo off
chcp 437 >nul
cd /d "d:\code\security-exam\backend"

echo [1/6] Building project...
call gradlew.bat build -x test
if errorlevel 1 (
  echo Build failed, check JDK 17 setup
  pause
  exit /b 1
)

echo [2/6] Starting Eureka :8761
start "exam-registry" cmd /k gradlew.bat :exam-registry:bootRun
timeout /t 15 /nobreak >nul

echo [3/6] Starting Gateway :8080
start "exam-gateway" cmd /k gradlew.bat :exam-gateway:bootRun
timeout /t 8 /nobreak >nul

echo [4/6] Starting Account Service :8081
start "exam-account" cmd /k gradlew.bat :exam-account-auth:bootRun
timeout /t 8 /nobreak >nul

echo [5/6] Starting User Service :8082
start "exam-user" cmd /k gradlew.bat :exam-user-center:bootRun
timeout /t 8 /nobreak >nul

echo [6/6] Starting Question ^& Exam Services
start "exam-question" cmd /k gradlew.bat :exam-question:bootRun
start "exam-core" cmd /k gradlew.bat :exam-core-service:bootRun

echo All services started in separate windows.
echo Gateway: http://localhost:8080
pause