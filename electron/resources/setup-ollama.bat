
@echo off
echo Setting up Ollama and DeepSeek model...

REM Start Ollama service
start /B ollama serve

REM Wait for service to start
timeout /t 5 /nobreak >nul

REM Pull DeepSeek model if not exists
ollama list | findstr "deepseek-r1:1.5b" >nul
if %errorlevel% neq 0 (
    echo Downloading DeepSeek model (this may take a few minutes)...
    ollama pull deepseek-r1:1.5b
)

echo Setup complete!
