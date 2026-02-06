let projects = [];
let currentProject = null;
let editingProjectId = null;
let filteredProjects = [];
let outputIntervals = new Map();

// Listen for output updates
window.electronAPI.onOutputUpdate((data) => {
  if (currentProject && currentProject.id === data.projectId) {
    updateOutputDisplay(data.output);
  }
});

window.electronAPI.onOutputCleared((projectId) => {
  if (currentProject && currentProject.id === projectId) {
    clearOutputDisplay();
  }
});

// Load projects on startup
window.addEventListener('DOMContentLoaded', async () => {
  await loadProjects();
  renderProjects();
});

async function loadProjects() {
  projects = await window.electronAPI.getProjects();
  filteredProjects = [];
}

async function saveProjects() {
  await window.electronAPI.saveProjects(projects);
}

function filterProjects() {
  const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || '';
  filteredProjects = projects.filter(p =>
    p.name.toLowerCase().includes(searchTerm) ||
    p.path.toLowerCase().includes(searchTerm) ||
    (p.description && p.description.toLowerCase().includes(searchTerm))
  );
  renderProjects();
}

function renderProjects() {
  const projectList = document.getElementById('projectList');
  const projectsToRender = filteredProjects.length > 0 ? filteredProjects : projects;

  if (projects.length === 0) {
    projectList.innerHTML = '<div style="padding: 2rem; text-align: center; color: #6b7280;">No projects yet. Click "Add Project" to get started!</div>';
    return;
  }

  if (projectsToRender.length === 0) {
    projectList.innerHTML = '<div style="padding: 2rem; text-align: center; color: #6b7280;">No projects match your search.</div>';
    return;
  }

  projectList.innerHTML = projectsToRender.map(project => `
    <div class="project-item ${currentProject?.id === project.id ? 'active' : ''} ${project.running || project.devRunning ? 'running' : ''}"
         onclick="selectProject('${project.id}')">
      <div class="project-name">
        <span class="status-indicator ${project.running || project.devRunning ? 'running' : ''}"></span>
        ${project.name}
      </div>
      <div class="project-path">${project.path}</div>
      <div class="project-actions" onclick="event.stopPropagation()">
        ${project.running
          ? `<button class="btn-small btn-stop" onclick="stopProject('${project.id}')">Stop</button>`
          : `<button class="btn-small btn-start" onclick="startProject('${project.id}')">Start</button>`
        }
        ${project.devRunning
          ? `<button class="btn-small btn-stop" onclick="stopDevServer('${project.id}')" title="Stop Dev Server">⏹ Dev</button>`
          : `<button class="btn-small btn-start" onclick="startDevServer('${project.id}')" title="Start Dev Server">▶ Dev</button>`
        }
        <button class="btn-small btn-folder" onclick="openProjectFolder('${project.id}')">📁</button>
      </div>
    </div>
  `).join('');
}

function selectProject(projectId) {
  const project = projects.find(p => p.id === projectId);
  if (project) {
    currentProject = project;
    editingProjectId = null;
    renderProjectDetails();
    renderProjects();
  }
}

function renderProjectDetails() {
  const contentArea = document.getElementById('contentArea');

  if (!currentProject) {
    contentArea.innerHTML = `
      <div class="empty-state">
        <h2>👋 Welcome to Project Launcher</h2>
        <p>Select a project from the sidebar to view details</p>
      </div>
    `;
    return;
  }

  contentArea.innerHTML = `
    <div class="project-details">
      <div class="detail-section">
        <h3>${currentProject.name}</h3>
        <p style="color: #6b7280; margin-bottom: 1rem;">${currentProject.description || 'No description'}</p>
        <div style="margin-bottom: 0.5rem;"><strong>Path:</strong> ${currentProject.path}</div>
        ${currentProject.database?.enabled ? `
          <div style="margin-bottom: 0.5rem;">
            <strong>Database:</strong> ${currentProject.database.type} on port ${currentProject.database.port}
          </div>
        ` : ''}
        <div class="action-buttons">
          <button class="btn ${currentProject.running ? 'btn-danger' : 'btn-success'}"
                  onclick="${currentProject.running ? `stopProject('${currentProject.id}')` : `startProject('${currentProject.id}')`}">
            ${currentProject.running ? '⏹ Stop Project' : '▶ Start Project'}
          </button>
          <button class="btn ${currentProject.devRunning ? 'btn-danger' : 'btn-success'}"
                  onclick="${currentProject.devRunning ? `stopDevServer('${currentProject.id}')` : `startDevServer('${currentProject.id}')`}"
                  style="margin-left: 0.5rem;">
            ${currentProject.devRunning ? '⏹ Stop Dev' : '▶ Start Dev'}
          </button>
          <button class="btn btn-secondary" onclick="editProject('${currentProject.id}')">✏️ Edit</button>
          <button class="btn btn-secondary" onclick="openProjectFolder('${currentProject.id}')">📁 Open Folder</button>
          <button class="btn btn-secondary" onclick="openTerminal('${currentProject.id}')">💻 Open Terminal</button>
          ${currentProject.devPort ? `
          <button class="btn btn-secondary" onclick="openLocalhost('${currentProject.id}')" title="Open http://localhost:${currentProject.devPort}">
            🌐 Open Localhost
          </button>
          ` : ''}
        </div>

        <div class="detail-section" style="margin-top: 1.5rem;">
          <h3>Quick Links</h3>
          <div class="action-buttons">
            ${currentProject.devPort ? `
            <button class="btn btn-secondary" onclick="openLocalhost('${currentProject.id}')" title="Open http://localhost:${currentProject.devPort}">
              🌐 Localhost:${currentProject.devPort}
            </button>
            ` : ''}
            <button class="btn btn-secondary" onclick="openSupabase('${currentProject.id}')">🔷 Supabase</button>
            <button class="btn btn-secondary" onclick="openVercel('${currentProject.id}')">▲ Vercel</button>
            <button class="btn btn-secondary" onclick="openGitHub('${currentProject.id}')">🐙 GitHub</button>
          </div>
        </div>
      </div>

      ${currentProject.database?.enabled ? `
        <div class="detail-section">
          <h3>Database Status</h3>
          <div id="dbStatus">
            <p>Checking port ${currentProject.database.port}...</p>
          </div>
        </div>
      ` : ''}

      <div class="detail-section" id="outputSection" style="display: none;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
          <h3>Server Output</h3>
          <button class="btn btn-secondary" onclick="clearOutput('${currentProject.id}')" style="padding: 0.5rem 1rem; font-size: 0.875rem;">
            Clear
          </button>
        </div>
        <div id="outputBox" style="
          background: #1f2937;
          color: #e5e7eb;
          padding: 1rem;
          border-radius: 8px;
          font-family: 'Courier New', monospace;
          font-size: 0.875rem;
          max-height: 400px;
          overflow-y: auto;
          white-space: pre-wrap;
          word-wrap: break-word;
          line-height: 1.5;
        "></div>
      </div>
    </div>
  `;

  // Check database port if enabled
  if (currentProject.database?.enabled) {
    checkDatabasePort();
  }

  // Show output section if project is running
  if (currentProject.running) {
    document.getElementById('outputSection').style.display = 'block';
    startOutputPolling(currentProject.id);
    // Load existing output
    loadProjectOutput(currentProject.id);
  }
}

async function loadProjectOutput(projectId) {
  const output = await window.electronAPI.getProjectOutput(projectId);
  if (output && output.length > 0) {
    updateOutputDisplay(output);
  }
}

async function checkDatabasePort() {
  const port = currentProject.database.port;
  const status = await window.electronAPI.checkPort(port);
  const dbStatus = document.getElementById('dbStatus');

  if (dbStatus) {
    if (status.available) {
      dbStatus.innerHTML = `<p style="color: #10b981;">✅ Port ${port} is available</p>`;
    } else {
      dbStatus.innerHTML = `<p style="color: #ef4444;">❌ Port ${port} is in use</p>`;
    }
  }
}

async function startProject(projectId) {
  const project = projects.find(p => p.id === projectId);
  if (!project) return;

  showNotification('Starting project...', 'success');

  // Show output section
  if (currentProject?.id === projectId) {
    document.getElementById('outputSection').style.display = 'block';
    startOutputPolling(projectId);
  }

  const result = await window.electronAPI.startProject(project);

  if (result.success) {
    project.running = true;
    // Update currentProject if it's the same project
    if (currentProject?.id === projectId) {
      currentProject.running = true;
    }
    await saveProjects();
    renderProjects();
    if (currentProject?.id === projectId) {
      renderProjectDetails();
      // Start polling for output
      startOutputPolling(projectId);
    }
    showNotification(result.message || 'Project starting...', 'success');
  } else {
    showNotification(result.error || 'Failed to start project', 'error');
  }
}

async function startDevServer(projectId) {
  const project = projects.find(p => p.id === projectId);
  if (!project) return;

  showNotification('Starting dev server...', 'success');

  // Show output section
  if (currentProject?.id === projectId) {
    document.getElementById('outputSection').style.display = 'block';
    startOutputPolling(projectId);
  }

  const result = await window.electronAPI.startDevServer(project);

  if (result.success) {
    project.devRunning = true;
    // Update currentProject if it's the same project
    if (currentProject?.id === projectId) {
      currentProject.devRunning = true;
    }
    await saveProjects();
    renderProjects();
    if (currentProject?.id === projectId) {
      renderProjectDetails();
      // Start polling for output
      startOutputPolling(projectId);
    }
    showNotification(result.message || 'Dev server starting...', 'success');
  } else {
    showNotification(result.error || 'Failed to start dev server', 'error');
  }
}

async function stopDevServer(projectId) {
  const project = projects.find(p => p.id === projectId);
  if (!project) return;

  // Stop output polling
  if (outputIntervals.has(projectId)) {
    clearInterval(outputIntervals.get(projectId));
    outputIntervals.delete(projectId);
  }

  showNotification('Stopping dev server...', 'success');

  const result = await window.electronAPI.stopDevServer(projectId);

  if (result.success) {
    project.devRunning = false;
    // Update currentProject if it's the same project
    if (currentProject?.id === projectId) {
      currentProject.devRunning = false;
    }
    await saveProjects();
    renderProjects();
    if (currentProject?.id === projectId) {
      renderProjectDetails();
      // Hide output section if nothing is running
      if (!project.running) {
        const outputSection = document.getElementById('outputSection');
        if (outputSection) {
          outputSection.style.display = 'none';
        }
      }
    }
    showNotification(result.message || 'Dev server stopped', 'success');
  } else {
    showNotification(result.error || 'Failed to stop dev server', 'error');
  }
}

function startOutputPolling(projectId) {
  // Clear existing interval
  if (outputIntervals.has(projectId)) {
    clearInterval(outputIntervals.get(projectId));
  }

  // Poll for output updates
  const interval = setInterval(async () => {
    if (currentProject?.id === projectId) {
      const output = await window.electronAPI.getProjectOutput(projectId);
      updateOutputDisplay(output);
    }
  }, 500);

  outputIntervals.set(projectId, interval);
}

function updateOutputDisplay(output) {
  const outputBox = document.getElementById('outputBox');
  if (!outputBox) return;

  const outputText = output.map(item => item.text).join('');
  outputBox.textContent = outputText;

  // Auto-scroll to bottom
  outputBox.scrollTop = outputBox.scrollHeight;
}

function clearOutputDisplay() {
  const outputBox = document.getElementById('outputBox');
  if (outputBox) {
    outputBox.textContent = '';
  }
}

async function clearOutput(projectId) {
  await window.electronAPI.clearProjectOutput(projectId);
  clearOutputDisplay();
  showNotification('Output cleared', 'success');
}

async function stopProject(projectId) {
  const project = projects.find(p => p.id === projectId);
  if (!project) return;

  // Stop output polling
  if (outputIntervals.has(projectId)) {
    clearInterval(outputIntervals.get(projectId));
    outputIntervals.delete(projectId);
  }

  showNotification('Stopping project...', 'success');

  const result = await window.electronAPI.stopProject(projectId);

  if (result.success) {
    project.running = false;
    project.devRunning = false; // Full stop includes dev server
    // Update currentProject if it's the same project
    if (currentProject?.id === projectId) {
      currentProject.running = false;
      currentProject.devRunning = false;
    }
    await saveProjects();
    renderProjects();
    if (currentProject?.id === projectId) {
      renderProjectDetails();
      // Hide output section
      const outputSection = document.getElementById('outputSection');
      if (outputSection) {
        outputSection.style.display = 'none';
      }
    }
    showNotification(result.message || 'Project stopped', 'success');
  } else {
    showNotification(result.error || 'Failed to stop project', 'error');
  }
}

async function openProjectFolder(projectId) {
  const project = projects.find(p => p.id === projectId);
  if (!project) return;

  await window.electronAPI.openFolder(project.path);
}

async function openTerminal(projectId) {
  const project = projects.find(p => p.id === projectId);
  if (!project) return;

  await window.electronAPI.openTerminal(project.path);
}

async function openSupabase(projectId) {
  const project = projects.find(p => p.id === projectId);
  if (!project) return;

  // Use configured URL or default to dashboard
  const supabaseUrl = project.supabaseUrl || 'https://supabase.com/dashboard';
  await window.electronAPI.openUrl(supabaseUrl);
  showNotification('Opening Supabase...', 'success');
}

async function openVercel(projectId) {
  const project = projects.find(p => p.id === projectId);
  if (!project) return;

  // Use configured URL or default to dashboard
  const vercelUrl = project.vercelUrl || 'https://vercel.com/dashboard';
  await window.electronAPI.openUrl(vercelUrl);
  showNotification('Opening Vercel...', 'success');
}

async function openGitHub(projectId) {
  const project = projects.find(p => p.id === projectId);
  if (!project) return;

  // Use configured URL or try to detect from .git config
  let githubUrl = project.githubUrl;

  if (!githubUrl) {
    // Try to detect from .git config
    const detection = await window.electronAPI.detectGitHubUrl(project.path);
    if (detection.success) {
      githubUrl = detection.url;
    } else {
      // Default to GitHub
      githubUrl = 'https://github.com';
    }
  }

  await window.electronAPI.openUrl(githubUrl);
  showNotification('Opening GitHub...', 'success');
}

async function openLocalhost(projectId) {
  const project = projects.find(p => p.id === projectId);
  if (!project) return;

  const port = project.devPort || 3000;
  const localhostUrl = `http://localhost:${port}`;

  await window.electronAPI.openUrl(localhostUrl);
  showNotification(`Opening ${localhostUrl}...`, 'success');
}

function showAddProjectModal() {
  editingProjectId = null;
  document.getElementById('modalTitle').textContent = 'Add Project';
  document.getElementById('projectForm').reset();
  document.getElementById('deleteBtn').style.display = 'none';
  document.getElementById('dbConfig').style.display = 'none';
  document.getElementById('dbEnabled').checked = false;
  document.getElementById('projectModal').classList.add('active');
}

function editProject(projectId) {
  const project = projects.find(p => p.id === projectId);
  if (!project) return;

  editingProjectId = projectId;
  currentProject = project;

  document.getElementById('modalTitle').textContent = 'Edit Project';
  document.getElementById('projectName').value = project.name;
  document.getElementById('projectPath').value = project.path;
  document.getElementById('projectDescription').value = project.description || '';
  document.getElementById('openFolder').checked = project.openFolder !== false;
  document.getElementById('devPort').value = project.devPort || 3000;
  document.getElementById('supabaseUrl').value = project.supabaseUrl || '';
  document.getElementById('vercelUrl').value = project.vercelUrl || '';
  document.getElementById('githubUrl').value = project.githubUrl || '';

  if (project.database) {
    document.getElementById('dbEnabled').checked = project.database.enabled || false;
    document.getElementById('dbType').value = project.database.type || 'supabase';
    document.getElementById('dbPort').value = project.database.port || 5432;
    document.getElementById('customCommand').value = project.database.command || '';
    toggleDbConfig();
    updateDbConfig();
  }

  document.getElementById('deleteBtn').style.display = 'block';
  document.getElementById('projectModal').classList.add('active');
}

function closeModal() {
  document.getElementById('projectModal').classList.remove('active');
  editingProjectId = null;
}

function toggleDbConfig() {
  const enabled = document.getElementById('dbEnabled').checked;
  document.getElementById('dbConfig').style.display = enabled ? 'block' : 'none';
}

function updateDbConfig() {
  const dbType = document.getElementById('dbType').value;
  document.getElementById('customCommandGroup').style.display = dbType === 'custom' ? 'block' : 'none';
}

async function saveProject(event) {
  event.preventDefault();

  const projectData = {
    name: document.getElementById('projectName').value,
    path: document.getElementById('projectPath').value,
    description: document.getElementById('projectDescription').value,
    openFolder: document.getElementById('openFolder').checked,
    devPort: parseInt(document.getElementById('devPort').value) || 3000,
    supabaseUrl: document.getElementById('supabaseUrl').value || '',
    vercelUrl: document.getElementById('vercelUrl').value || '',
    githubUrl: document.getElementById('githubUrl').value || '',
    database: {
      enabled: document.getElementById('dbEnabled').checked,
      type: document.getElementById('dbType').value,
      port: parseInt(document.getElementById('dbPort').value) || 5432
    }
  };

  if (projectData.database.type === 'custom') {
    projectData.database.command = document.getElementById('customCommand').value;
  }

  if (editingProjectId) {
    // Update existing project
    const index = projects.findIndex(p => p.id === editingProjectId);
    if (index !== -1) {
      projects[index] = { ...projects[index], ...projectData };
    }
  } else {
    // Add new project
    projects.push({
      id: Date.now().toString(),
      ...projectData,
      running: false
    });
  }

  await saveProjects();
  renderProjects();
  closeModal();
  showNotification('Project saved successfully!', 'success');
}

async function deleteProject() {
  if (!editingProjectId) return;

  if (confirm('Are you sure you want to delete this project?')) {
    projects = projects.filter(p => p.id !== editingProjectId);
    await saveProjects();
    renderProjects();
    closeModal();
    currentProject = null;
    renderProjectDetails();
    showNotification('Project deleted', 'success');
  }
}

async function refreshProjects() {
  await loadProjects();
  renderProjects();
  if (currentProject) {
    currentProject = projects.find(p => p.id === currentProject.id);
    renderProjectDetails();
  }
  showNotification('Projects refreshed', 'success');
}

function showNotification(message, type = 'success') {
  const notification = document.getElementById('notification');
  const messageEl = document.getElementById('notificationMessage');

  messageEl.textContent = message;
  notification.className = `notification ${type} active`;

  setTimeout(() => {
    notification.classList.remove('active');
  }, 3000);
}

// Quick launch stacks
const QUICK_STACKS = {
  'Sports Stack': ['progno', 'prognostication'],
  'Gulf Coast Stack': ['gcc'],
  'Pet Platform': ['petreunion', 'petrescue-mobile'],
  'Entertainment': ['popthepopcorn', 'calmcast'],
  'AI Platform': ['cevict', 'Fishy', 'brain'],
  'All APIs': ['gateway', 'brain'],
  'Voice Assistants': ['alexa-skill', 'google-assistant'],
  'Mobile Apps': ['mobile-apps', 'petrescue-mobile']
};

async function launchStack(stackName) {
  const projectIds = QUICK_STACKS[stackName];
  if (!projectIds) return;
  
  showNotification(`Launching ${stackName}...`, 'info');
  const results = [];
  
  for (const projectId of projectIds) {
    const project = projects.find(p => p.name.toLowerCase().includes(projectId));
    if (project) {
      try {
        const result = await window.electronAPI.startProject(project);
        results.push({ name: project.name, success: result.success });
      } catch (error) {
        results.push({ name: project.name, success: false, error: error.message });
      }
    }
  }
  
  const successCount = results.filter(r => r.success).length;
  showNotification(`${stackName}: ${successCount}/${results.length} projects launched`, 
    successCount === results.length ? 'success' : 'warning');
}

async function importDefaultProjects() {
  if (confirm('Import all default projects from the monorepo? This will replace your current project list.')) {
    try {
      const response = await fetch('./projects.json');
      const defaultProjects = await response.json();
      projects = defaultProjects;
      await saveProjects();
      renderProjects();
      showNotification(`Imported ${defaultProjects.length} projects`, 'success');
    } catch (error) {
      showNotification('Failed to import projects', 'error');
      console.error('Import error:', error);
    }
  }
}

// Global command palette
let commandPalette = null;

function showCommandPalette() {
  if (!commandPalette) {
    commandPalette = document.createElement('div');
    commandPalette.id = 'commandPalette';
    commandPalette.innerHTML = `
      <div class="command-palette-backdrop" onclick="hideCommandPalette()"></div>
      <div class="command-palette">
        <input type="text" id="commandInput" placeholder="Type a command..." autocomplete="off">
        <div id="commandResults"></div>
      </div>
    `;
    
    // Add styles
    const style = document.createElement('style');
    style.textContent = `
      .command-palette-backdrop {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        z-index: 10000;
      }
      .command-palette {
        position: fixed;
        top: 20%;
        left: 50%;
        transform: translateX(-50%);
        width: 600px;
        background: white;
        border-radius: 8px;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
        z-index: 10001;
      }
      #commandInput {
        width: 100%;
        padding: 16px;
        border: none;
        border-bottom: 1px solid #e5e7eb;
        font-size: 16px;
        outline: none;
      }
      #commandResults {
        max-height: 400px;
        overflow-y: auto;
      }
      .command-item {
        padding: 12px 16px;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .command-item:hover {
        background: #f3f4f6;
      }
      .command-item.selected {
        background: #eff6ff;
      }
      .command-icon {
        width: 20px;
        text-align: center;
      }
    `;
    document.head.appendChild(style);
    document.body.appendChild(commandPalette);
    
    // Setup input handler
    const input = document.getElementById('commandInput');
    input.addEventListener('input', handleCommandInput);
    input.addEventListener('keydown', handleCommandKeydown);
  }
  
  commandPalette.style.display = 'block';
  document.getElementById('commandInput').value = '';
  document.getElementById('commandInput').focus();
  handleCommandInput();
}

function hideCommandPalette() {
  if (commandPalette) {
    commandPalette.style.display = 'none';
  }
}

function handleCommandInput() {
  const input = document.getElementById('commandInput').value.toLowerCase();
  const results = document.getElementById('commandResults');
  
  const commands = [
    // Project commands
    ...projects.map(p => ({
      id: `start-${p.id}`,
      text: `Start ${p.name}`,
      icon: '▶️',
      action: () => startProject(p.id)
    })),
    ...projects.map(p => ({
      id: `stop-${p.id}`,
      text: `Stop ${p.name}`,
      icon: '⏹️',
      action: () => stopProject(p.id)
    })),
    ...projects.map(p => ({
      id: `open-${p.id}`,
      text: `Open ${p.name}`,
      icon: '📁',
      action: () => openProjectFolder(p.id)
    })),
    // Stack commands
    ...Object.keys(QUICK_STACKS).map(stack => ({
      id: `stack-${stack}`,
      text: `Launch ${stack}`,
      icon: '⚡',
      action: () => launchStack(stack)
    })),
    // Quick actions
    { id: 'deploy', text: 'Deploy to Vercel', icon: '🚀', action: () => alert('Deploy feature coming soon!') },
    { id: 'env', text: 'Manage Environment Variables', icon: '🔧', action: () => alert('Env manager coming soon!') },
    { id: 'git', text: 'Git Status', icon: '📊', action: () => alert('Git integration coming soon!') },
    { id: 'test', text: 'Run Tests', icon: '✅', action: () => alert('Test runner coming soon!') },
    { id: 'lint', text: 'Run Linter', icon: '🔍', action: () => alert('Linting coming soon!') },
    { id: 'build', text: 'Build All', icon: '🔨', action: () => alert('Build all coming soon!') }
  ];
  
  const filtered = commands.filter(cmd => 
    cmd.text.toLowerCase().includes(input)
  ).slice(0, 10);
  
  results.innerHTML = filtered.map(cmd => `
    <div class="command-item" onclick="executeCommand('${cmd.id}')">
      <span class="command-icon">${cmd.icon}</span>
      <span>${cmd.text}</span>
    </div>
  `).join('');
}

function handleCommandKeydown(e) {
  const items = document.querySelectorAll('.command-item');
  const selected = document.querySelector('.command-item.selected');
  let index = selected ? Array.from(items).indexOf(selected) : -1;
  
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    index = Math.min(index + 1, items.length - 1);
    selectCommandItem(items, index);
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    index = Math.max(index - 1, 0);
    selectCommandItem(items, index);
  } else if (e.key === 'Enter') {
    e.preventDefault();
    if (selected) {
      selected.click();
    } else if (items.length > 0) {
      items[0].click();
    }
  } else if (e.key === 'Escape') {
    hideCommandPalette();
  }
}

function selectCommandItem(items, index) {
  items.forEach(item => item.classList.remove('selected'));
  if (items[index]) {
    items[index].classList.add('selected');
    items[index].scrollIntoView({ block: 'nearest' });
  }
}

function executeCommand(commandId) {
  const [type, ...parts] = commandId.split('-');
  const id = parts.join('-');
  
  // Find and execute the command
  const input = document.getElementById('commandInput');
  const value = input.value.toLowerCase();
  
  if (type === 'start' || type === 'stop' || type === 'open') {
    const project = projects.find(p => p.id === id);
    if (project) {
      if (type === 'start') startProject(id);
      else if (type === 'stop') stopProject(id);
      else if (type === 'open') openProjectFolder(id);
    }
  } else if (type === 'stack') {
    const stackName = Object.keys(QUICK_STACKS).find(k => k.toLowerCase().replace(' ', '-') === id);
    if (stackName) launchStack(stackName);
  }
  
  hideCommandPalette();
}

// Add keyboard shortcut listener
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.key === 'k') {
    e.preventDefault();
    showCommandPalette();
  }
});

