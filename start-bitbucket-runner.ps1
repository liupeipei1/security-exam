$ErrorActionPreference = "Stop"

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "启动 Bitbucket Self-Hosted Runner (Windows)" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

$WORKSPACE = "你的工作空间名"
$REPO_SLUG = "你的仓库名"
$RUNNER_UUID = "你的Runner UUID"
$RUNNER_TOKEN = "你的Runner Token"

Write-Host "请确认你已经在 Bitbucket 仓库中添加了 Windows PowerShell Runner" -ForegroundColor Yellow
Write-Host "获取方式: Settings > Pipelines > Runners > Add runner" -ForegroundColor Yellow
Write-Host ""
Write-Host "当前配置:" -ForegroundColor Green
Write-Host "  Workspace: $WORKSPACE" -ForegroundColor Green
Write-Host "  Repo: $REPO_SLUG" -ForegroundColor Green
Write-Host ""

Read-Host "按 Enter 继续..."

Write-Host ""
Write-Host "下载并启动 Runner..." -ForegroundColor Cyan

$RUNNER_DIR = "$HOME\bitbucket-runner"
if (-not (Test-Path $RUNNER_DIR)) {
    New-Item -ItemType Directory -Path $RUNNER_DIR -Force | Out-Null
}

Set-Location $RUNNER_DIR

if (-not (Test-Path "runner.jar")) {
    Write-Host "下载 runner.jar..." -ForegroundColor Yellow
    Invoke-WebRequest -Uri "https://product-downloads.atlassian.com/software/bitbucket/pipelines/runner/2/latest/runner.jar" -OutFile "runner.jar"
}

Write-Host "启动 Runner..." -ForegroundColor Green
java -jar runner.jar `
    --workspace "$WORKSPACE" `
    --repo-slug "$REPO_SLUG" `
    --uuid "$RUNNER_UUID" `
    --token "$RUNNER_TOKEN"