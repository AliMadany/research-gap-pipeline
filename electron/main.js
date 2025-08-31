const { app, BrowserWindow, dialog, shell, Menu } = require('electron')
const path = require('path')
const { spawn, exec } = require('child_process')
const fs = require('fs')
const extract = require('extract-zip')
const http = require('http')

// Keep a global reference of the window object
let mainWindow
let backendProcess = null
let ollamaProcess = null
let isQuitting = false

// Paths for bundled resources
const isDev = process.env.NODE_ENV === 'development'
const resourcesPath = isDev 
  ? path.join(__dirname, 'resources')
  : path.join(process.resourcesPath, 'resources')

const tempDir = path.join(require('os').tmpdir(), 'research-gap-pipeline')

// Create application menu
function createMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Refresh',
          accelerator: 'F5',
          click: () => {
            if (mainWindow) {
              mainWindow.reload()
            }
          }
        },
        {
          label: 'Quit',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => {
            isQuitting = true
            app.quit()
          }
        }
      ]
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Toggle Developer Tools',
          accelerator: 'F12',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.toggleDevTools()
            }
          }
        }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About Research Gap Pipeline',
              message: 'Research Gap Pipeline Desktop v1.0.0',
              detail: 'AI-powered content gap analysis and article generation tool.'
            })
          }
        }
      ]
    }
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

// Create the main application window
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 800,
    icon: path.join(__dirname, 'icons', 'icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: true
    },
    show: false, // Don't show until ready
    titleBarStyle: 'default'
  })

  // Show splash screen
  showSplashScreen()

  // Load the React app
  const htmlPath = path.join(__dirname, 'renderer', 'index.html')
  
  if (fs.existsSync(htmlPath)) {
    mainWindow.loadFile(htmlPath)
  } else {
    // Try dev server as fallback
    const startUrl = 'http://localhost:5173'
    mainWindow.loadURL(startUrl).catch(() => {
      showErrorDialog('Frontend files not found', 'Please build the React application first.')
    })
  }

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    if (splashWindow) {
      splashWindow.close()
    }
    mainWindow.show()
    
    // Focus on the main window
    if (process.platform === 'darwin') {
      app.dock.show()
    }
  })

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null
  })

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })
}

// Splash screen
let splashWindow
function showSplashScreen() {
  splashWindow = new BrowserWindow({
    width: 400,
    height: 300,
    frame: false,
    alwaysOnTop: true,
    transparent: true,
    webPreferences: {
      nodeIntegration: false
    }
  })

  splashWindow.loadFile(path.join(__dirname, 'splash.html'))
  
  splashWindow.on('closed', () => {
    splashWindow = null
  })
}

// Extract bundled resources
async function extractResources() {
  try {
    // Create temp directory
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true })
    }

    // Extract Ollama if bundled
    const ollamaZip = path.join(resourcesPath, 'ollama-windows.zip')
    if (fs.existsSync(ollamaZip)) {
      console.log('Extracting Ollama...')
      await extract(ollamaZip, { dir: path.join(tempDir, 'ollama') })
    }

    // Extract Python runtime if bundled
    const pythonZip = path.join(resourcesPath, 'python-runtime.zip')
    if (fs.existsSync(pythonZip)) {
      console.log('Extracting Python runtime...')
      await extract(pythonZip, { dir: path.join(tempDir, 'python') })
    }

    // Copy model files
    const modelsDir = path.join(resourcesPath, 'models')
    if (fs.existsSync(modelsDir)) {
      console.log('Copying AI models...')
      const targetModelsDir = path.join(tempDir, 'models')
      if (!fs.existsSync(targetModelsDir)) {
        fs.mkdirSync(targetModelsDir, { recursive: true })
      }
      
      // Copy all model files
      const files = fs.readdirSync(modelsDir)
      for (const file of files) {
        const src = path.join(modelsDir, file)
        const dest = path.join(targetModelsDir, file)
        fs.copyFileSync(src, dest)
      }
    }

    console.log('Resources extracted successfully')
    return true
  } catch (error) {
    console.error('Failed to extract resources:', error)
    return false
  }
}

// Start Ollama service
function startOllama() {
  return new Promise((resolve, reject) => {
    // Check if Ollama is already running
    exec('tasklist /FI "IMAGENAME eq ollama.exe"', (error, stdout) => {
      if (stdout.includes('ollama.exe')) {
        console.log('Ollama already running')
        resolve()
        return
      }

      // Try to start bundled Ollama first
      const bundledOllama = path.join(tempDir, 'ollama', 'ollama.exe')
      const ollamaPath = fs.existsSync(bundledOllama) ? bundledOllama : 'ollama'

      console.log('Starting Ollama service...')
      ollamaProcess = spawn(ollamaPath, ['serve'], {
        stdio: 'pipe',
        detached: false
      })

      ollamaProcess.stdout.on('data', (data) => {
        console.log('Ollama:', data.toString())
      })

      ollamaProcess.stderr.on('data', (data) => {
        console.log('Ollama Error:', data.toString())
      })

      // Wait for Ollama to be ready
      setTimeout(() => {
        // Check if DeepSeek model is available
        exec(`${ollamaPath} list`, (error, stdout) => {
          if (!stdout.includes('deepseek-r1:1.5b')) {
            console.log('Pulling DeepSeek model...')
            exec(`${ollamaPath} pull deepseek-r1:1.5b`, (pullError) => {
              if (pullError) {
                console.error('Failed to pull model:', pullError)
                reject(pullError)
              } else {
                console.log('DeepSeek model ready')
                resolve()
              }
            })
          } else {
            console.log('DeepSeek model already available')
            resolve()
          }
        })
      }, 3000)
    })
  })
}

// Start Python backend
function startBackend() {
  return new Promise((resolve, reject) => {
    const pythonPath = path.join(tempDir, 'python', 'python.exe')
    const projectRoot = path.resolve(__dirname, '..')
    const backendScript = path.join(projectRoot, 'start-backend.py')

    // Use bundled Python if available, otherwise system Python
    const python = fs.existsSync(pythonPath) ? pythonPath : 'python'

    console.log('Starting Python backend...')
    backendProcess = spawn(python, [backendScript], {
      cwd: projectRoot,
      stdio: 'pipe'
    })

    backendProcess.stdout.on('data', (data) => {
      console.log('Backend:', data.toString())
    })

    backendProcess.stderr.on('data', (data) => {
      console.log('Backend Error:', data.toString())
    })

    backendProcess.on('error', (error) => {
      console.error('Failed to start backend:', error)
      reject(error)
    })
    
    backendProcess.on('close', (code) => {
      console.log(`Backend process exited with code ${code}`)
    })

    // Wait for backend to be ready
    let attempts = 0
    const maxAttempts = 10
    
    const checkBackend = () => {
      attempts++
      console.log(`Checking backend... Attempt ${attempts}/${maxAttempts}`)
      
      const req = http.request({
        hostname: '127.0.0.1',
        port: 8000,
        path: '/',
        method: 'GET',
        timeout: 5000,
        family: 4
      }, (res) => {
        if (res.statusCode === 200) {
          console.log('Backend is ready!')
          resolve()
        } else {
          console.log(`Backend responded with status: ${res.statusCode}`)
          if (attempts < maxAttempts) {
            setTimeout(checkBackend, 3000)
          } else {
            reject(new Error('Backend failed to start'))
          }
        }
      })
      
      req.on('error', (error) => {
        console.log(`Backend check failed: ${error.message}`)
        if (attempts < maxAttempts) {
          setTimeout(checkBackend, 3000)
        } else {
          console.log('Backend failed to start after maximum attempts')
          reject(new Error('Backend failed to start'))
        }
      })
      
      req.on('timeout', () => {
        console.log('Backend check timed out')
        req.destroy()
        if (attempts < maxAttempts) {
          setTimeout(checkBackend, 3000)
        } else {
          reject(new Error('Backend failed to start'))
        }
      })
      
      req.end()
    }
    
    // Start checking after 3 seconds
    setTimeout(checkBackend, 3000)
  })
}

// Show error dialog
function showErrorDialog(title, message) {
  dialog.showErrorBox(title, message)
}

// Initialize the application
async function initializeApp() {
  try {
    console.log('Extracting resources...')
    await extractResources()

    console.log('Starting services...')
    await startOllama()
    await startBackend()

    console.log('Creating main window...')
    createWindow()
  } catch (error) {
    console.error('Failed to initialize app:', error)
    showErrorDialog('Startup Error', `Failed to start the application: ${error.message}`)
    app.quit()
  }
}

// App event handlers
app.whenReady().then(() => {
  createMenu()
  initializeApp()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', (event) => {
  if (!isQuitting) {
    event.preventDefault()
    
    console.log('Shutting down services...')
    
    // Kill backend process
    if (backendProcess) {
      backendProcess.kill()
      backendProcess = null
    }

    // Kill Ollama process
    if (ollamaProcess) {
      ollamaProcess.kill()
      ollamaProcess = null
    }

    // Clean up temp files (optional)
    setTimeout(() => {
      isQuitting = true
      app.quit()
    }, 2000)
  }
})

// Handle app crashes
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error)
  showErrorDialog('Application Error', 'An unexpected error occurred. The application will close.')
  app.quit()
})