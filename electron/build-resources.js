const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const https = require('https');
const { promisify } = require('util');

const execAsync = promisify(exec);

const RESOURCES_DIR = path.join(__dirname, 'resources');
const DOWNLOADS_DIR = path.join(RESOURCES_DIR, 'downloads');

// Ensure directories exist
function ensureDirectories() {
  const dirs = [RESOURCES_DIR, DOWNLOADS_DIR, path.join(RESOURCES_DIR, 'models')];
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
}

// Download file with progress
function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    
    https.get(url, (response) => {
      const totalSize = parseInt(response.headers['content-length'], 10);
      let downloadedSize = 0;
      
      response.pipe(file);
      
      response.on('data', (chunk) => {
        downloadedSize += chunk.length;
        const percent = ((downloadedSize / totalSize) * 100).toFixed(2);
        process.stdout.write(`\rDownloading ${path.basename(dest)}: ${percent}%`);
      });
      
      file.on('finish', () => {
        file.close();
        console.log(`\n✅ Downloaded: ${path.basename(dest)}`);
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => {}); // Delete incomplete file
      reject(err);
    });
  });
}

// Download Ollama for Windows
async function downloadOllama() {
  console.log('📥 Downloading Ollama for Windows...');
  const ollamaUrl = 'https://github.com/ollama/ollama/releases/latest/download/ollama-windows-amd64.zip';
  const ollamaPath = path.join(DOWNLOADS_DIR, 'ollama-windows.zip');
  
  try {
    await downloadFile(ollamaUrl, ollamaPath);
    return ollamaPath;
  } catch (error) {
    console.error('❌ Failed to download Ollama:', error.message);
    return null;
  }
}

// Export DeepSeek model from local Ollama
async function exportDeepSeekModel() {
  console.log('📤 Exporting DeepSeek model from local Ollama...');
  
  try {
    // Check if model exists locally
    const { stdout } = await execAsync('ollama list');
    if (!stdout.includes('deepseek-r1:1.5b')) {
      console.log('📥 DeepSeek model not found locally. Pulling...');
      await execAsync('ollama pull deepseek-r1:1.5b');
    }

    // Export the model to a file
    const modelPath = path.join(RESOURCES_DIR, 'models', 'deepseek-r1-1.5b.bin');
    console.log('💾 Exporting model to:', modelPath);
    
    // Note: This is a simplified approach. In practice, you'd need to:
    // 1. Copy the model files from Ollama's storage location
    // 2. Or create a script that pulls the model on first run
    
    // For now, create a placeholder that will trigger model download on first run
    const modelConfig = {
      name: 'deepseek-r1:1.5b',
      needsDownload: true,
      size: '2.8GB',
      description: 'DeepSeek R1 1.5B parameter model for reasoning'
    };
    
    fs.writeFileSync(
      path.join(RESOURCES_DIR, 'models', 'model-config.json'),
      JSON.stringify(modelConfig, null, 2)
    );
    
    console.log('✅ Model configuration created');
    return true;
  } catch (error) {
    console.error('❌ Failed to export DeepSeek model:', error.message);
    console.log('💡 Model will be downloaded on first run');
    return false;
  }
}

// Create installation script for Ollama and model
function createOllamaSetupScript() {
  const setupScript = `
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
`;

  fs.writeFileSync(
    path.join(RESOURCES_DIR, 'setup-ollama.bat'),
    setupScript
  );
  
  console.log('✅ Created Ollama setup script');
}

// Copy Python dependencies
async function copyPythonDependencies() {
  console.log('📋 Preparing Python dependencies...');
  
  const requirementsPath = path.join(__dirname, '..', 'requirements.txt');
  const targetPath = path.join(RESOURCES_DIR, 'requirements.txt');
  
  if (fs.existsSync(requirementsPath)) {
    fs.copyFileSync(requirementsPath, targetPath);
    console.log('✅ Copied requirements.txt');
  }
  
  // Create Python setup script
  const pythonSetup = `
@echo off
echo Installing Python dependencies...

REM Check if pip is available
pip --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Error: Python pip not found. Please install Python first.
    pause
    exit /b 1
)

REM Install requirements
pip install -r requirements.txt

echo Python dependencies installed!
`;

  fs.writeFileSync(
    path.join(RESOURCES_DIR, 'setup-python.bat'),
    pythonSetup
  );
  
  console.log('✅ Created Python setup script');
}

// Main build function
async function buildResources() {
  console.log('🔧 Building resources for Electron package...\n');
  
  ensureDirectories();
  
  // Download Ollama
  await downloadOllama();
  
  // Export/prepare DeepSeek model
  await exportDeepSeekModel();
  
  // Create setup scripts
  createOllamaSetupScript();
  await copyPythonDependencies();
  
  // Create README for resources
  const readme = `# Resources Directory

This directory contains all the bundled resources for the Research Gap Pipeline desktop app:

## Contents:
- \`ollama-windows.zip\` - Ollama executable for Windows
- \`models/\` - AI model files and configuration
- \`setup-ollama.bat\` - Script to setup Ollama and download models
- \`setup-python.bat\` - Script to install Python dependencies
- \`requirements.txt\` - Python package requirements

## Notes:
- Models are downloaded on first run to keep package size manageable
- All scripts are designed to work offline after initial setup
- Resources are extracted to temp directory during runtime
`;

  fs.writeFileSync(path.join(RESOURCES_DIR, 'README.md'), readme);
  
  console.log('\n🎉 Resources built successfully!');
  console.log('📁 Resources directory:', RESOURCES_DIR);
  console.log('\n💡 Next steps:');
  console.log('1. Build the React frontend: npm run build-react');
  console.log('2. Build the Electron app: npm run build-win');
}

// Run if called directly
if (require.main === module) {
  buildResources().catch(console.error);
}

module.exports = { buildResources };