@echo off
setlocal enabledelayedexpansion

REM 콘솔 한글 출력(UTF-8)
chcp 65001 >nul

REM 프로젝트 루트로 이동
cd /d "%~dp0"

echo [1/4] 도구 확인 중...
where bundle >nul 2>nul || (echo [ERROR] Bundler가 없습니다. Ruby+DevKit 설치 후 "gem install bundler" 실행하세요. & pause & exit /b 1)
where npm    >nul 2>nul || (echo [ERROR] Node.js가 없습니다. Node.js LTS를 설치하세요. & pause & exit /b 1)

echo [2/4] CSS 빌드 중...
call npm run build:css || (echo [ERROR] CSS 빌드 실패. & pause & exit /b 1)

echo [3/4] Jekyll 서버를 백그라운드로 시작합니다...
set "WIN_TITLE=JEKYLL-SERVER %RANDOM%"
start "%WIN_TITLE%" /min cmd /c bundle exec jekyll serve --livereload --incremental

echo 서버 가동 대기( http://127.0.0.1:4000 )...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$u='http://127.0.0.1:4000'; for($i=0;$i -lt 60;$i++){ try { (Invoke-WebRequest -UseBasicParsing $u) | Out-Null; exit 0 } catch { Start-Sleep -Milliseconds 500 } }; exit 1"
if errorlevel 1 (
  echo [WARN] 4000 포트에서 서버 감지가 안되지만 계속 진행합니다...
)

echo [4/4] 크롬을 엽니다. 크롬 창을 닫으면 서버도 종료됩니다...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$url='http://127.0.0.1:4000';" ^
  "$tmp=Join-Path $env:TEMP ('wy-chrome-'+[guid]::NewGuid().ToString()); New-Item -ItemType Directory -Path $tmp | Out-Null;" ^
  "$chrome = (Get-Command 'chrome.exe' -ErrorAction SilentlyContinue).Source;" ^
  "if(-not $chrome) {" ^
  "  if(Test-Path (Join-Path $env:ProgramFiles     'Google\Chrome\Application\chrome.exe')){ $chrome = (Join-Path $env:ProgramFiles     'Google\Chrome\Application\chrome.exe') }" ^
  "  elseif(Test-Path 'C:\Program Files (x86)\Google\Chrome\Application\chrome.exe'){ $chrome = 'C:\Program Files (x86)\Google\Chrome\Application\chrome.exe' }" ^
  "  elseif(Test-Path (Join-Path $env:LocalAppData 'Google\Chrome\Application\chrome.exe')){ $chrome = (Join-Path $env:LocalAppData 'Google\Chrome\Application\chrome.exe') }" ^
  "  else { $chrome = 'chrome.exe' }" ^
  "}" ^
  "$chrome = [string](@($chrome)[0]);" ^
  "Start-Process -FilePath $chrome -ArgumentList @('--user-data-dir='+$tmp,'--no-first-run','--new-window',$url) -Wait;" ^
  "Start-Sleep -Milliseconds 200; Remove-Item -Recurse -Force $tmp -ErrorAction SilentlyContinue"

echo 서버 종료 중...
REM 창 제목으로 서버 콘솔 강제 종료(자식 프로세스 포함)
taskkill /fi "WINDOWTITLE eq %WIN_TITLE%" /t /f >nul 2>nul

REM 혹시 남아있으면 4000 포트를 점유한 프로세스도 종료 시도
for /f "tokens=2 delims=," %%p in ('powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 4000 -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess"') do set PID=%%p
if defined PID taskkill /pid %PID% /t /f >nul 2>nul

endlocal
exit /b 0
