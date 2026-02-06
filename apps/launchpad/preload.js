const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getProjects: () => ipcRenderer.invoke('get-projects'),
  saveProjects: (projects) => ipcRenderer.invoke('save-projects', projects),
  startProject: (project) => ipcRenderer.invoke('start-project', project),
  stopProject: (projectId) => ipcRenderer.invoke('stop-project', projectId),
  startDevServer: (project) => ipcRenderer.invoke('start-dev-server', project),
  stopDevServer: (projectId) => ipcRenderer.invoke('stop-dev-server', projectId),
  checkPort: (port) => ipcRenderer.invoke('check-port', port),
  openFolder: (path) => ipcRenderer.invoke('open-folder', path),
  openTerminal: (path) => ipcRenderer.invoke('open-terminal', path),
  openUrl: (url) => ipcRenderer.invoke('open-url', url),
  getProjectOutput: (projectId) => ipcRenderer.invoke('get-project-output', projectId),
  clearProjectOutput: (projectId) => ipcRenderer.invoke('clear-project-output', projectId),
  detectGitHubUrl: (projectPath) => ipcRenderer.invoke('detect-github-url', projectPath),
  onOutputUpdate: (callback) => ipcRenderer.on('output-update', (event, data) => callback(data)),
  onOutputCleared: (callback) => ipcRenderer.on('output-cleared', (event, projectId) => callback(projectId))
});

