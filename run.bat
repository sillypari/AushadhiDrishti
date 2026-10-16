@echo off
title AushadhiDrishti server
cd /d "%~dp0"

rem Install dependencies on first run only.
python -c "import fastapi, uvicorn, PIL, httpx, dotenv" 2>nul || (
  echo Installing dependencies...
  python -m pip install -r requirements.txt || goto :fail
)

rem Open the browser a few seconds after the server starts.
start "" /b cmd /c "timeout /t 3 /nobreak >nul & start http://127.0.0.1:8000"

echo AushadhiDrishti is running at http://127.0.0.1:8000  (close this window or press Ctrl+C to stop)
python -m uvicorn app:app --host 127.0.0.1 --port 8000
goto :eof

:fail
echo.
echo Setup failed. Make sure Python 3.10+ is installed and on PATH.
pause
