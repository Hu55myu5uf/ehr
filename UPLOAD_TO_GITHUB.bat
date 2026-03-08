@echo off
setlocal

echo ===================================================
echo   EHR SYSTEM - GITHUB UPLOAD UTILITY
echo ===================================================
echo.

:: Check for Git
where git >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Git is not installed or not in your PATH.
    echo Please install Git from https://git-scm.com/
    pause
    exit /b
)

:: Check if already a git repo
if not exist ".git" (
    echo [INFO] Initialising new Git repository...
    git init
    echo.
)

:: Check for remote
git remote -v | findstr "origin" >nul
if %ERRORLEVEL% neq 0 (
    echo [PROMPT] No remote 'origin' found.
    set /p remote_url="Enter your GitHub Repository URL (e.g., https://github.com/username/repo.git): "
    if not "%remote_url%"=="" (
        git remote add origin %remote_url%
    ) else (
        echo [ERROR] Remote URL is required to push to GitHub.
        pause
        exit /b
    )
)

:: Git Workflow
echo [INFO] Staging changes...
git add .

echo.
set /p commit_msg="Enter commit message (default: 'System Update - ICU Integrated & Cleaned'): "
if "%commit_msg%"=="" set commit_msg=System Update - ICU Integrated ^& Cleaned

echo.
echo [INFO] Committing changes...
git commit -m "%commit_msg%"

echo.
echo [INFO] Pushing to GitHub...
git push -u origin main

if %ERRORLEVEL% neq 0 (
    echo.
    echo [WARNING] Main branch push failed. Trying 'master'...
    git push -u origin master
)

echo.
echo [SUCCESS] Your code has been uploaded to GitHub!
echo ===================================================
pause
