const { app, BrowserWindow, ipcMain, shell, Tray, Menu, Notification } = require('electron');
const path = require('path');
const { spawn, exec } = require('child_process');
const Store = require('electron-store');
const fs = require('fs');

const store = new Store();

// Initialize projects from projects.json if store is empty
if (!store.has('projects') || store.get('projects', []).length === 0) {
  try {
    const projectsPath = path.join(__dirname, 'projects.json');
    if (fs.existsSync(projectsPath)) {
      const projectsData = JSON.parse(fs.readFileSync(projectsPath, 'utf-8'));
      store.set('projects', projectsData);
      console.log(`Loaded ${projectsData.length} projects from projects.json`);
    }
  } catch (error) {
    console.error('Failed to load projects from projects.json:', error);
  }
}

let mainWindow;
let tray;
let runningProjects = new Map(); // Track running projects
let projectOutputs = new Map(); // Track project command output

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, 'assets', 'icon.png'),
    titleBarStyle: 'default',
    backgroundColor: '#1f2937',
    title: 'LaunchPad - Development Command Center'
  });

  mainWindow.loadFile('index.html');

  // Open DevTools in development
  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }

  // Handle window close
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Minimize to tray instead of closing
  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
      showNotification('LaunchPad', 'App minimized to tray. Click tray icon to restore.');
    }
  });

  // Show window when restored from tray
  mainWindow.on('restore', () => {
    mainWindow.show();
    mainWindow.focus();
  });
}

function createTray() {
  try {
    // Try PNG first, then fallback to built-in icon
    const trayIconPath = path.join(__dirname, 'assets', 'tray-icon.png');
    const fs = require('fs');
    
    if (fs.existsSync(trayIconPath)) {
      tray = new Tray(trayIconPath);
    } else {
      // Use Electron's default icon or create a simple one
      const { nativeImage } = require('electron');
      const icon = nativeImage.createEmpty();
      tray = new Tray(icon);
    }
    
    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Show LaunchPad',
        click: () => {
          mainWindow.show();
          mainWindow.focus();
        }
      },
      {
        label: 'Quick Actions',
        submenu: [
          {
            label: 'Start All Projects',
            click: () => {
              mainWindow.webContents.send('start-all-projects');
            }
          },
          {
            label: 'Stop All Projects',
            click: () => {
              mainWindow.webContents.send('stop-all-projects');
            }
          }
        ]
      },
      { type: 'separator' },
      {
        label: 'Start with Windows',
        type: 'checkbox',
        checked: store.get('autoStart', false),
        click: (item) => {
          store.set('autoStart', item.checked);
          app.setLoginItemSettings({
            openAtLogin: item.checked,
            path: app.getPath('exe')
          });
        }
      },
      { type: 'separator' },
      {
        label: 'Quit',
        click: () => {
          app.isQuitting = true;
          app.quit();
        }
      }
    ]);

    tray.setToolTip('LaunchPad');
    tray.setContextMenu(contextMenu);

    // Double click to show window
    tray.on('double-click', () => {
      mainWindow.show();
      mainWindow.focus();
    });

    // Right click to show context menu
    tray.on('right-click', () => {
      tray.popUpContextMenu(contextMenu);
    });
  } catch (error) {
    console.error('Failed to create tray:', error);
    // Continue without tray if it fails
  }
}

function showNotification(title, body) {
  if (Notification.isSupported()) {
    const notification = new Notification({
      title,
      body,
      icon: path.join(__dirname, 'assets', 'tray-icon.svg'),
      silent: false
    });
    notification.show();
  }
}

function updateTrayMenu() {
  if (!tray) return;

  const runningCount = runningProjects.size;
  const contextMenu = Menu.buildFromTemplate([
    {
      label: `Project Launcher (${runningCount} running)`,
      enabled: false
    },
    { type: 'separator' },
    {
      label: 'Show Project Launcher',
      click: () => {
        mainWindow.show();
        mainWindow.focus();
      }
    },
    { type: 'separator' },
    {
      label: 'Quick Actions',
      submenu: [
        {
          label: 'Start All Projects',
          click: () => {
            mainWindow.webContents.send('start-all-projects');
          }
        },
        {
          label: 'Stop All Projects',
          click: () => {
            mainWindow.webContents.send('stop-all-projects');
          }
        }
      ]
    },
    { type: 'separator' },
    {
      label: 'Start with Windows',
      type: 'checkbox',
      checked: store.get('autoStart', false),
      click: (item) => {
        store.set('autoStart', item.checked);
        app.setLoginItemSettings({
          openAtLogin: item.checked,
          path: app.getPath('exe')
        });
      }
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setContextMenu(contextMenu);
}

// IPC Handlers
ipcMain.handle('get-projects', () => {
  return store.get('projects', []);
});

ipcMain.handle('save-projects', (event, projects) => {
  store.set('projects', projects);
  return { success: true };
});

ipcMain.handle('reload-projects', () => {
  try {
    const projectsPath = path.join(__dirname, 'projects.json');
    if (fs.existsSync(projectsPath)) {
      const projectsData = JSON.parse(fs.readFileSync(projectsPath, 'utf-8'));
      store.set('projects', projectsData);
      console.log(`Reloaded ${projectsData.length} projects from projects.json`);
      return { success: true, count: projectsData.length };
    } else {
      return { success: false, error: 'projects.json not found' };
    }
  } catch (error) {
    console.error('Failed to reload projects:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('start-project', async (event, project) => {
  try {
    const projectPath = project.path;

    // Check if project is already running
    if (runningProjects.has(project.id)) {
      return { success: false, error: 'Project is already running' };
    }

    // Initialize output array
    projectOutputs.set(project.id, []);

    // Start database if configured
    let dbProcess = null;
    if (project.database && project.database.enabled) {
      dbProcess = await startDatabase(project);
      if (dbProcess) {
        runningProjects.set(project.id, {
          dbProcess,
          port: project.database.port,
          devProcess: null
        });
      }
    }

    // Start dev server
    const devProcess = await startDevServer(project);
    if (devProcess) {
      if (!runningProjects.has(project.id)) {
        runningProjects.set(project.id, {
          dbProcess: null,
          devProcess,
          port: project.devPort || 3000
        });
      } else {
        runningProjects.get(project.id).devProcess = devProcess;
      }
    }

    // Open project folder in VS Code or default editor
    if (project.openFolder) {
      shell.openPath(projectPath);
    }

    // Update tray menu and show notification
    updateTrayMenu();
    showNotification('Project Started', `${project.name} is now running on port ${project.devPort || 3000}`);

    return {
      success: true,
      message: `Project starting...`
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-project-output', (event, projectId) => {
  return projectOutputs.get(projectId) || [];
});

ipcMain.handle('clear-project-output', (event, projectId) => {
  projectOutputs.set(projectId, []);
  return { success: true };
});

ipcMain.handle('stop-project', async (event, projectId) => {
  try {
    const running = runningProjects.get(projectId);
    if (!running) {
      return { success: false, error: 'Project is not running' };
    }

    // Stop database process
    if (running.dbProcess) {
      running.dbProcess.kill();
    }

    // Stop dev server process
    if (running.devProcess) {
      running.devProcess.kill();
    }

    runningProjects.delete(projectId);
    projectOutputs.delete(projectId);
    
    // Update tray menu and show notification
    updateTrayMenu();
    const projects = store.get('projects', []);
    const project = projects.find(p => p.id === projectId);
    if (project) {
      showNotification('Project Stopped', `${project.name} has been stopped`);
    }
    
    return { success: true, message: 'Project stopped' };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Start dev server only
ipcMain.handle('start-dev-server', async (event, project) => {
  try {
    const projectPath = project.path;

    // Check if project is already running
    const running = runningProjects.get(project.id);
    if (running && running.devProcess) {
      return { success: false, error: 'Dev server is already running' };
    }

    // Initialize output array if needed
    if (!projectOutputs.has(project.id)) {
      projectOutputs.set(project.id, []);
    }

    // Start dev server
    const devProcess = await startDevServer(project);
    if (devProcess) {
      if (!runningProjects.has(project.id)) {
        runningProjects.set(project.id, {
          dbProcess: null,
          devProcess,
          port: project.devPort || 3000
        });
      } else {
        runningProjects.get(project.id).devProcess = devProcess;
      }
    }

    return {
      success: true,
      message: `Dev server starting...`
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Stop dev server only
ipcMain.handle('stop-dev-server', async (event, projectId) => {
  try {
    const running = runningProjects.get(projectId);
    if (!running || !running.devProcess) {
      return { success: false, error: 'Dev server is not running' };
    }

    // Stop dev server process only
    running.devProcess.kill();
    running.devProcess = null;

    // If no database is running, remove from running projects
    if (!running.dbProcess) {
      runningProjects.delete(projectId);
      projectOutputs.delete(projectId);
    }

    return { success: true, message: 'Dev server stopped' };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('check-port', async (event, port) => {
  return new Promise((resolve) => {
    const command = process.platform === 'win32'
      ? `netstat -ano | findstr :${port}`
      : process.platform === 'darwin'
      ? `lsof -i :${port}`
      : `netstat -tuln | grep :${port}`;

    exec(command, (error, stdout) => {
      if (error || !stdout || stdout.trim() === '') {
        resolve({ available: true });
      } else {
        resolve({ available: false, message: `Port ${port} is in use` });
      }
    });
  });
});

ipcMain.handle('open-folder', (event, folderPath) => {
  shell.openPath(folderPath);
  return { success: true };
});

ipcMain.handle('open-terminal', (event, folderPath) => {
  // Open terminal in project folder
  let command;
  if (process.platform === 'win32') {
    // Try PowerShell first, fallback to CMD
    command = `powershell -NoExit -Command "cd '${folderPath}'"`;
  } else if (process.platform === 'darwin') {
    command = `open -a Terminal "${folderPath}"`;
  } else {
    command = `gnome-terminal --working-directory="${folderPath}" || xterm -e "cd '${folderPath}' && bash"`;
  }

  exec(command, (error) => {
    if (error && process.platform === 'win32') {
      // Fallback to CMD
      exec(`start cmd /k cd /d "${folderPath}"`);
    }
  });
  return { success: true };
});

ipcMain.handle('open-url', (event, url) => {
  shell.openExternal(url);
  return { success: true };
});

ipcMain.handle('detect-github-url', (event, projectPath) => {
  try {
    const gitConfigPath = path.join(projectPath, '.git', 'config');
    if (fs.existsSync(gitConfigPath)) {
      const gitConfig = fs.readFileSync(gitConfigPath, 'utf-8');
      const urlMatch = gitConfig.match(/url\s*=\s*(.+)/);
      if (urlMatch) {
        let url = urlMatch[1].trim();
        // Convert SSH to HTTPS
        if (url.startsWith('git@')) {
          url = url.replace('git@', 'https://').replace(':', '/').replace('.git', '');
        }
        return { success: true, url };
      }
    }
    return { success: false };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

function startDatabase(project) {
  return new Promise((resolve, reject) => {
    const dbConfig = project.database;
    const projectPath = project.path;

    // Determine database command based on type
    let command;
    let args = [];

    if (dbConfig.type === 'supabase') {
      command = 'npx';
      args = ['supabase', 'start'];
    } else if (dbConfig.type === 'postgres') {
      command = 'pg_ctl';
      args = ['start', '-D', dbConfig.dataDir || './data'];
    } else if (dbConfig.type === 'mongodb') {
      command = 'mongod';
      args = ['--port', dbConfig.port.toString()];
    } else if (dbConfig.type === 'custom') {
      // Custom command
      const parts = dbConfig.command.split(' ');
      command = parts[0];
      args = parts.slice(1);
    } else {
      // Default: try to find start script
      const packageJsonPath = path.join(projectPath, 'package.json');
      if (fs.existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
        if (packageJson.scripts && packageJson.scripts['start:db']) {
          command = 'npm';
          args = ['run', 'start:db'];
        } else {
          reject(new Error('No database start command found'));
          return;
        }
      } else {
        reject(new Error('No package.json found'));
        return;
      }
    }

    // Spawn database process
    const dbProcess = spawn(command, args, {
      cwd: projectPath,
      shell: true,
      stdio: 'pipe'
    });

    dbProcess.stdout.on('data', (data) => {
      const output = data.toString();
      console.log(`[${project.name} DB] ${output}`);
      addOutput(project.id, `[DB] ${output}`);
    });

    dbProcess.stderr.on('data', (data) => {
      const output = data.toString();
      console.error(`[${project.name} DB] ${output}`);
      addOutput(project.id, `[DB ERROR] ${output}`);
    });

    dbProcess.on('error', (error) => {
      reject(error);
    });

    // Wait a bit to see if it starts successfully
    setTimeout(() => {
      if (dbProcess.killed) {
        reject(new Error('Database process failed to start'));
      } else {
        resolve(dbProcess);
      }
    }, 2000);
  });
}

function startDevServer(project) {
  return new Promise((resolve, reject) => {
    const projectPath = project.path;
    const packageJsonPath = path.join(projectPath, 'package.json');

    if (!fs.existsSync(packageJsonPath)) {
      reject(new Error('No package.json found'));
      return;
    }

    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    const scripts = packageJson.scripts || {};

    // Determine command to run
    let command;
    let args = [];
    let usePnpm = false;

    // Check for pnpm
    const pnpmLockPath = path.join(projectPath, 'pnpm-lock.yaml');
    if (fs.existsSync(pnpmLockPath)) {
      usePnpm = true;
    }

    // Try to find dev script
    if (scripts.dev) {
      command = usePnpm ? 'pnpm' : 'npm';
      args = ['run', 'dev'];
    } else if (scripts.start) {
      command = usePnpm ? 'pnpm' : 'npm';
      args = ['start'];
    } else {
      reject(new Error('No dev or start script found in package.json'));
      return;
    }

    // Spawn dev server process
    const devProcess = spawn(command, args, {
      cwd: projectPath,
      shell: true,
      stdio: 'pipe',
      env: { ...process.env, FORCE_COLOR: '1' }
    });

    let outputBuffer = '';
    let serverReady = false;
    let serverUrl = null;

    devProcess.stdout.on('data', (data) => {
      const output = data.toString();
      outputBuffer += output;
      addOutput(project.id, output);

      // Detect when server is ready
      if (!serverReady) {
        // Common patterns for "server ready"
        const readyPatterns = [
          /ready/i,
          /started server/i,
          /Local:\s*(https?:\/\/[^\s]+)/i,
          /localhost:\d+/i,
          /http:\/\/localhost:\d+/i,
          /https:\/\/localhost:\d+/i
        ];

        for (const pattern of readyPatterns) {
          const match = output.match(pattern);
          if (match) {
            serverReady = true;

            // Try to extract URL
            const urlMatch = output.match(/(https?:\/\/[^\s]+)/i);
            if (urlMatch) {
              serverUrl = urlMatch[1];
            } else {
              // Default to localhost with common ports
              const portMatch = output.match(/:(\d+)/);
              const port = portMatch ? portMatch[1] : (project.devPort || 3000);
              serverUrl = `http://localhost:${port}`;
            }

            // Open browser after short delay
            setTimeout(() => {
              if (serverUrl) {
                shell.openExternal(serverUrl);
                addOutput(project.id, `\n✅ Server ready! Opened ${serverUrl} in browser.\n`);

                // Clear output after 3 seconds
                setTimeout(() => {
                  projectOutputs.set(project.id, []);
                  if (mainWindow) {
                    mainWindow.webContents.send('output-cleared', project.id);
                  }
                }, 3000);
              }
            }, 1000);
            break;
          }
        }
      }
    });

    devProcess.stderr.on('data', (data) => {
      const output = data.toString();
      addOutput(project.id, output);
    });

    devProcess.on('error', (error) => {
      addOutput(project.id, `ERROR: ${error.message}\n`);
      reject(error);
    });

    devProcess.on('exit', (code) => {
      if (code !== 0 && code !== null) {
        addOutput(project.id, `\nProcess exited with code ${code}\n`);
      }
    });

    // Send output updates to renderer
    setInterval(() => {
      if (mainWindow && projectOutputs.has(project.id)) {
        mainWindow.webContents.send('output-update', {
          projectId: project.id,
          output: projectOutputs.get(project.id)
        });
      }
    }, 500);

    resolve(devProcess);
  });
}

function addOutput(projectId, text) {
  if (!projectOutputs.has(projectId)) {
    projectOutputs.set(projectId, []);
  }
  const outputs = projectOutputs.get(projectId);
  outputs.push({
    timestamp: new Date().toISOString(),
    text: text
  });
  // Keep last 1000 lines
  if (outputs.length > 1000) {
    outputs.shift();
  }
}

// Speed Enhancement IPC Handlers
ipcMain.handle('get-recent-projects', () => {
  return store.get('recentProjects', []);
});

ipcMain.handle('save-recent-projects', (event, recentProjects) => {
  store.set('recentProjects', recentProjects);
  return { success: true };
});

ipcMain.handle('batch-install', async (event, projectIds) => {
  const results = [];
  for (const projectId of projectIds) {
    const project = (await store.get('projects', [])).find(p => p.id === projectId);
    if (project) {
      try {
        await runCommandInProject(project, 'npm install');
        results.push({ projectId, success: true });
      } catch (error) {
        results.push({ projectId, success: false, error: error.message });
      }
    }
  }
  return results;
});

ipcMain.handle('create-project-from-template', async (event, template, projectInfo) => {
  try {
    // Create project directory
    const fs = require('fs');
    const path = require('path');
    
    if (!fs.existsSync(projectInfo.path)) {
      fs.mkdirSync(projectInfo.path, { recursive: true });
    }
    
    // Initialize package.json if it doesn't exist
    const packageJsonPath = path.join(projectInfo.path, 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
      const packageJson = {
        name: projectInfo.name.toLowerCase().replace(/\s+/g, '-'),
        version: '1.0.0',
        description: projectInfo.description,
        scripts: {
          dev: 'next dev',
          build: 'next build',
          start: 'next start'
        }
      };
      fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
    }
    
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('run-command', async (event, projectId, command) => {
  const projects = await store.get('projects', []);
  const project = projects.find(p => p.id === projectId);
  
  if (!project) {
    return { success: false, error: 'Project not found' };
  }
  
  try {
    await runCommandInProject(project, command);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Helper function to run commands in project directory
async function runCommandInProject(project, command) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, [], {
      cwd: project.path,
      shell: true,
      stdio: 'pipe'
    });
    
    let output = '';
    child.stdout?.on('data', (data) => {
      output += data.toString();
      // Send output to renderer
      if (mainWindow) {
        mainWindow.webContents.send('output-update', {
          projectId: project.id,
          output: data.toString()
        });
      }
    });
    
    child.stderr?.on('data', (data) => {
      output += data.toString();
      // Send error output to renderer
      if (mainWindow) {
        mainWindow.webContents.send('output-update', {
          projectId: project.id,
          output: data.toString()
        });
      }
    });
    
    child.on('close', (code) => {
      if (code === 0) {
        resolve(output);
      } else {
        reject(new Error(`Command failed with code ${code}`));
      }
    });
    
    child.on('error', (error) => {
      reject(error);
    });
  });
}

app.whenReady().then(() => {
  createWindow();
  createTray();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    } else {
      mainWindow.show();
    }
  });
});

app.on('window-all-closed', () => {
  // Don't quit on macOS
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  app.isQuitting = true;
  // Stop all running projects
  runningProjects.forEach((running, projectId) => {
    if (running.dbProcess) {
      running.dbProcess.kill();
    }
  });
});

