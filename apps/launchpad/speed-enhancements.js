/**
 * Speed Enhancements for Project Launcher
 * 
 * Features to accelerate development workflow:
 * - Quick project templates
 * - Batch operations
 * - Keyboard shortcuts
 * - Recent projects
 * - Smart search
 * - Auto-start favorites
 */

let recentProjects = [];
let favoriteProjects = [];
let projectTemplates = [];
let keyboardShortcuts = new Map();
let autoStartQueue = [];

// Initialize speed enhancements
window.addEventListener('DOMContentLoaded', () => {
  initializeSpeedFeatures();
  setupKeyboardShortcuts();
  loadRecentProjects();
  loadFavorites();
  setupProjectTemplates();
});

function initializeSpeedFeatures() {
  // Add quick action buttons
  addQuickActionButtons();
  
  // Setup smart search
  setupSmartSearch();
  
  // Add project templates
  setupTemplatesUI();
  
  // Setup batch operations
  setupBatchOperations();
}

function addQuickActionButtons() {
  const header = document.querySelector('.header') || document.body;
  
  const quickActions = document.createElement('div');
  quickActions.className = 'quick-actions';
  quickActions.innerHTML = `
    <div class="quick-actions-bar">
      <button class="btn btn-primary btn-sm" onclick="quickStartAll()" title="Start all favorite projects">
        ⚡ Quick Start All
      </button>
      <button class="btn btn-secondary btn-sm" onclick="stopAllRunning()" title="Stop all running projects">
        ⏹ Stop All
      </button>
      <button class="btn btn-secondary btn-sm" onclick="openAllLocalhosts()" title="Open all running localhost URLs">
        🌐 Open All Localhosts
      </button>
      <button class="btn btn-secondary btn-sm" onclick="batchInstall()" title="Install dependencies for all projects">
        📦 Batch Install
      </button>
      <button class="btn btn-secondary btn-sm" onclick="showTemplates()" title="Create project from template">
        📋 New from Template
      </button>
    </div>
  `;
  
  header.appendChild(quickActions);
}

function setupKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + K for quick search
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      focusSearch();
    }
    
    // Ctrl/Cmd + Shift + S to quick start all favorites
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'S') {
      e.preventDefault();
      quickStartAll();
    }
    
    // Ctrl/Cmd + Shift + Q to stop all
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'Q') {
      e.preventDefault();
      stopAllRunning();
    }
    
    // Escape to clear search
    if (e.key === 'Escape') {
      clearSearch();
    }
    
    // Number keys 1-9 to quick start projects
    if (e.key >= '1' && e.key <= '9' && !e.ctrlKey && !e.metaKey && !e.altKey) {
      const index = parseInt(e.key) - 1;
      quickStartByIndex(index);
    }
  });
}

function setupSmartSearch() {
  const searchInput = document.getElementById('searchInput');
  if (!searchInput) return;
  
  // Add search suggestions
  searchInput.addEventListener('input', debounce((e) => {
    const query = e.target.value.toLowerCase();
    showSearchSuggestions(query);
  }, 300));
  
  // Add recent searches
  searchInput.addEventListener('focus', () => {
    showRecentSearches();
  });
}

function showSearchSuggestions(query) {
  if (query.length < 2) return;
  
  const suggestions = projects.filter(p => 
    p.name.toLowerCase().includes(query) ||
    p.path.toLowerCase().includes(query) ||
    (p.tags && p.tags.some(tag => tag.toLowerCase().includes(query)))
  );
  
  // Show suggestions dropdown
  showSuggestionsDropdown(suggestions);
}

function setupProjectTemplates() {
  projectTemplates = [
    {
      name: 'Next.js App',
      description: 'Next.js application with TypeScript',
      commands: ['npm install', 'npm run dev'],
      devPort: 3000,
      database: { enabled: true, type: 'postgresql', port: 5432 },
      tags: ['nextjs', 'react', 'typescript']
    },
    {
      name: 'React Native',
      description: 'React Native mobile app',
      commands: ['npm install', 'npx expo start'],
      devPort: 19006,
      tags: ['react-native', 'mobile', 'expo']
    },
    {
      name: 'Node.js API',
      description: 'Node.js backend API',
      commands: ['npm install', 'npm run dev'],
      devPort: 3001,
      database: { enabled: true, type: 'mongodb', port: 27017 },
      tags: ['nodejs', 'api', 'backend']
    },
    {
      name: 'Full Stack',
      description: 'Full stack with frontend and backend',
      commands: ['npm install', 'npm run dev:all'],
      devPort: 3000,
      database: { enabled: true, type: 'postgresql', port: 5432 },
      tags: ['fullstack', 'nextjs', 'nodejs']
    }
  ];
}

function setupTemplatesUI() {
  const sidebar = document.querySelector('.sidebar') || document.body;
  
  const templatesSection = document.createElement('div');
  templatesSection.className = 'templates-section';
  templatesSection.innerHTML = `
    <h3>🚀 Quick Templates</h3>
    <div class="templates-grid">
      ${projectTemplates.map((template, index) => `
        <div class="template-card" onclick="createFromTemplate(${index})">
          <h4>${template.name}</h4>
          <p>${template.description}</p>
          <div class="template-tags">
            ${template.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
          </div>
        </div>
      `).join('')}
    </div>
  `;
  
  sidebar.appendChild(templatesSection);
}

// Speed enhancement functions
async function quickStartAll() {
  const favorites = projects.filter(p => p.favorite);
  for (const project of favorites) {
    if (!project.running) {
      await startProject(project.id);
      // Small delay between starts
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  showNotification(`Started ${favorites.length} favorite projects`, 'success');
}

async function stopAllRunning() {
  const running = projects.filter(p => p.running);
  for (const project of running) {
    await stopProject(project.id);
  }
  
  showNotification(`Stopped ${running.length} running projects`, 'info');
}

async function openAllLocalhosts() {
  const running = projects.filter(p => p.devPort && p.running);
  for (const project of running) {
    openLocalhost(project.id);
    // Small delay between opens
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  showNotification(`Opened ${running.length} localhost URLs`, 'success');
}

async function batchInstall() {
  const allProjects = projects;
  showNotification('Installing dependencies for all projects...', 'info');
  
  for (const project of allProjects) {
    try {
      await runCommand(project.id, 'npm install');
      showNotification(`Installed dependencies for ${project.name}`, 'success');
    } catch (error) {
      showNotification(`Failed to install for ${project.name}: ${error.message}`, 'error');
    }
  }
}

function createFromTemplate(templateIndex) {
  const template = projectTemplates[templateIndex];
  
  // Show dialog for project details
  const dialog = document.createElement('div');
  dialog.className = 'dialog-overlay';
  dialog.innerHTML = `
    <div class="dialog">
      <h3>Create from Template: ${template.name}</h3>
      <div class="form-group">
        <label>Project Name:</label>
        <input type="text" id="projectName" placeholder="My Awesome Project">
      </div>
      <div class="form-group">
        <label>Project Path:</label>
        <input type="text" id="projectPath" placeholder="C:/projects/my-awesome-project">
      </div>
      <div class="form-group">
        <label>Description:</label>
        <textarea id="projectDescription" placeholder="Project description..."></textarea>
      </div>
      <div class="dialog-actions">
        <button class="btn btn-primary" onclick="createProjectFromTemplate(${templateIndex})">Create</button>
        <button class="btn btn-secondary" onclick="closeDialog()">Cancel</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(dialog);
}

async function createProjectFromTemplate(templateIndex) {
  const template = projectTemplates[templateIndex];
  const name = document.getElementById('projectName').value;
  const path = document.getElementById('projectPath').value;
  const description = document.getElementById('projectDescription').value;
  
  if (!name || !path) {
    showNotification('Please fill in all required fields', 'error');
    return;
  }
  
  const newProject = {
    id: Date.now().toString(),
    name,
    path,
    description,
    commands: template.commands,
    devPort: template.devPort,
    database: template.database,
    tags: template.tags,
    favorite: false,
    running: false,
    devRunning: false
  };
  
  projects.push(newProject);
  await saveProjects();
  renderProjects();
  closeDialog();
  
  showNotification(`Created project "${name}" from template`, 'success');
  
  // Option to immediately start the project
  if (confirm('Start the new project now?')) {
    startProject(newProject.id);
  }
}

function quickStartByIndex(index) {
  const visibleProjects = filteredProjects.length > 0 ? filteredProjects : projects;
  if (index < visibleProjects.length) {
    const project = visibleProjects[index];
    if (project.running) {
      stopProject(project.id);
    } else {
      startProject(project.id);
    }
  }
}

function focusSearch() {
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.focus();
    searchInput.select();
  }
}

function clearSearch() {
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.value = '';
    filterProjects();
  }
}

function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.textContent = message;
  
  Object.assign(notification.style, {
    position: 'fixed',
    top: '20px',
    right: '20px',
    padding: '12px 20px',
    borderRadius: '8px',
    color: 'white',
    fontWeight: '500',
    zIndex: '10000',
    opacity: '0',
    transform: 'translateY(-20px)',
    transition: 'all 0.3s ease'
  });
  
  // Set background color based on type
  const colors = {
    success: '#10b981',
    error: '#ef4444',
    info: '#3b82f6',
    warning: '#f59e0b'
  };
  notification.style.backgroundColor = colors[type] || colors.info;
  
  document.body.appendChild(notification);
  
  // Animate in
  setTimeout(() => {
    notification.style.opacity = '1';
    notification.style.transform = 'translateY(0)';
  }, 100);
  
  // Remove after 3 seconds
  setTimeout(() => {
    notification.style.opacity = '0';
    notification.style.transform = 'translateY(-20px)';
    setTimeout(() => {
      document.body.removeChild(notification);
    }, 300);
  }, 3000);
}

function closeDialog() {
  const dialog = document.querySelector('.dialog-overlay');
  if (dialog) {
    document.body.removeChild(dialog);
  }
}

// Utility functions
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Load and save recent projects
async function loadRecentProjects() {
  recentProjects = await window.electronAPI.getRecentProjects() || [];
}

async function saveRecentProjects() {
  await window.electronAPI.saveRecentProjects(recentProjects);
}

async function loadFavorites() {
  favoriteProjects = projects.filter(p => p.favorite);
}

// Add to recent projects when accessed
function addToRecent(projectId) {
  const project = projects.find(p => p.id === projectId);
  if (project) {
    recentProjects = recentProjects.filter(p => p.id !== projectId);
    recentProjects.unshift(project);
    recentProjects = recentProjects.slice(0, 10); // Keep only 10 recent
    saveRecentProjects();
  }
}

// Export functions to global scope
window.quickStartAll = quickStartAll;
window.stopAllRunning = stopAllRunning;
window.openAllLocalhosts = openAllLocalhosts;
window.batchInstall = batchInstall;
window.showTemplates = showTemplates;
window.createFromTemplate = createFromTemplate;
window.createProjectFromTemplate = createProjectFromTemplate;
window.closeDialog = closeDialog;
window.focusSearch = focusSearch;
window.clearSearch = clearSearch;
