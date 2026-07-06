@echo off
chcp 65001 >nul
echo ================================================
echo 启动 Bitbucket Self-Hosted Runner
echo ================================================
echo.

set "REPO_SLUG=你的仓库名"
set "WORKSPACE=你的工作空间名"
set "RUNNER_UUID=你的Runner UUID"
set "RUNNER_TOKEN=你的Runner Token"

echo 请确认你已经在 Bitbucket 仓库中添加了 Self-Hosted Runner
echo 获取方式: Settings > Pipelines > Runners > Add runner
echo.
echo 当前配置:
echo   Workspace: %WORKSPACE%
echo   Repo: %REPO_SLUG%
echo.

pause

echo.
echo 启动 Runner 容器...

docker run ^
  -d ^
  --name bitbucket-runner ^
  --restart always ^
  -e BITBUCKET_REPO_SLUG=%REPO_SLUG% ^
  -e BITBUCKET_WORKSPACE=%WORKSPACE% ^
  -e BITBUCKET_RUNNER_UUID=%RUNNER_UUID% ^
  -e BITBUCKET_RUNNER_TOKEN=%RUNNER_TOKEN% ^
  -v /var/run/docker.sock:/var/run/docker.sock ^
  -v bitbucket-runner-cache:/cache ^
  atlassian/bitbucket-pipelines-runner:2

echo.
echo Runner 已启动！
echo.
echo 查看日志: docker logs -f bitbucket-runner
echo 停止 Runner: docker stop bitbucket-runner
echo 删除 Runner: docker rm bitbucket-runner