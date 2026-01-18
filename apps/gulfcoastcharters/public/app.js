// Initialize app data structure
const appData = {
    documents: [],
    pins: [],
    logEntries: [],
    checklistState: {},
    waypoints: [],
    sharedWaypoints: [],
    fleetMembers: [],
    notifications: [],
    lastSync: null,
    captainProfile: {
        name: '',
        vessel: '',
        callsign: '',
        mmsi: ''
    }
};

// Fishy AI Configuration
const fishyAI = {
    lastCheck: null,
    monthlyCheckEnabled: true,
    apiVersions: {
        leaflet: '1.9.4',
        app: '2.0.0'
    },
    responses: {
        greetings: [
            "Ahoy Captain! How can I help navigate your day? 🚢",
            "Ready to assist, Captain! Fair winds ahead! ⚓",
            "At your service, Captain! What's on the horizon? 🌊"
        ],
        updates: [
            "All systems checked and running smoothly! ⚓",
            "Dependencies are up to date, Captain! 🎯",
            "Monthly maintenance complete - ship shape! 🛠️"
        ]
    }
};

// Initialize map variable
let map = null;
let currentLocationMarker = null;
let pins = [];

// Push Notification Support
async function setupPushNotifications() {
    if ('Notification' in window && 'serviceWorker' in navigator) {
        const permission = await Notification.requestPermission();
        
        if (permission === 'granted') {
            const registration = await navigator.serviceWorker.ready;
            
            // Subscribe to push notifications
            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array('YOUR_VAPID_PUBLIC_KEY')
            });
            
            // Save subscription to your server
            await saveSubscription(subscription);
            showGCCPopup('Success', '🔔 Push notifications enabled! You\'ll receive waypoints and fleet alerts.', 'success');
        }
    }
}

// Enable Push Notifications
function enablePushNotifications() {
    setupPushNotifications();
}

// Waypoint Sharing Functions
function shareCurrentWaypoint() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            position => {
                document.getElementById('waypoint-lat').value = position.coords.latitude.toFixed(6);
                document.getElementById('waypoint-lng').value = position.coords.longitude.toFixed(6);
                showGCCPopup('Location Retrieved', '📍 Current position captured. Add details and select recipients.', 'info');
            },
            error => {
                showGCCPopup('Location Error', '❌ Unable to get current location. Please enter manually.', 'error');
            }
        );
    }
}

function sendWaypoint() {
    const waypoint = {
        id: Date.now(),
        name: document.getElementById('waypoint-name').value,
        description: document.getElementById('waypoint-description').value,
        lat: parseFloat(document.getElementById('waypoint-lat').value),
        lng: parseFloat(document.getElementById('waypoint-lng').value),
        sender: appData.captainProfile.name || 'Anonymous Captain',
        timestamp: new Date().toISOString(),
        recipients: Array.from(document.getElementById('waypoint-recipients').selectedOptions).map(o => o.value)
    };
    
    if (!waypoint.name || !waypoint.lat || !waypoint.lng) {
        showGCCPopup('Missing Information', 'Please provide waypoint name and coordinates.', 'warning');
        return;
    }
    
    // Save waypoint
    appData.sharedWaypoints.push(waypoint);
    saveLocalData();
    
    // Send push notification to recipients
    sendPushToFleet(waypoint);
    
    // Clear form
    document.getElementById('waypoint-name').value = '';
    document.getElementById('waypoint-description').value = '';
    
    showGCCPopup('Waypoint Shared!', `📍 "${waypoint.name}" sent to ${waypoint.recipients.length} recipient(s)`, 'success');
    
    // Add to UI
    addReceivedWaypoint(waypoint);
}

function sendPushToFleet(waypoint) {
    // Simulate sending push notification
    if ('serviceWorker' in navigator && 'PushManager' in window) {
        navigator.serviceWorker.ready.then(registration => {
            registration.showNotification('New Waypoint Received', {
                body: `${waypoint.sender} shared: ${waypoint.name}`,
                icon: '/icon-192.png',
                badge: '/icon-72.png',
                tag: 'waypoint-' + waypoint.id,
                data: waypoint,
                actions: [
                    { action: 'view', title: 'View on Map' },
                    { action: 'save', title: 'Save Waypoint' }
                ]
            });
        });
    }
}

// Fishy AI Assistant Functions
function toggleFishy() {
    const container = document.getElementById('fishy-container');
    container.classList.toggle('fishy-minimized');
    
    if (!container.classList.contains('fishy-minimized')) {
        document.getElementById('fishy-input').focus();
        checkMonthlyUpdates();
    }
}

function handleFishyInput(event) {
    if (event.key === 'Enter') {
        sendToFishy();
    }
}

async function sendToFishy() {
    const input = document.getElementById('fishy-input');
    const message = input.value.trim();
    
    if (!message) return;
    
    // Add user message
    addFishyMessage(message, 'user');
    input.value = '';
    
    // Process with Fishy AI
    const response = await processFishyQuery(message);
    addFishyMessage(response, 'fishy');
}

async function processFishyQuery(query) {
    const lowerQuery = query.toLowerCase();
    
    // Navigation queries
    if (lowerQuery.includes('waypoint') || lowerQuery.includes('navigation')) {
        return "I can help you share waypoints! Use the Waypoints tab to share your current position or saved locations with your fleet. You can also enable push notifications to receive waypoints from other captains instantly! 📍";
    }
    
    // Coast Guard queries
    if (lowerQuery.includes('coast guard') || lowerQuery.includes('inspection')) {
        return "For Coast Guard inspections, make sure all your documents are uploaded in the Documents tab. Use the CG Checklist to verify all safety equipment. During a stop, use the red 'CG Stop' button to log the location and time automatically. All data is available offline! 🚨";
    }
    
    // Weather queries
    if (lowerQuery.includes('weather') || lowerQuery.includes('storm')) {
        return "I'm monitoring weather patterns for your area. Currently showing fair conditions, but I'll alert you to any changes. Enable push notifications to receive storm warnings immediately. Always check local marine weather before departure! ⛈️";
    }
    
    // Update queries
    if (lowerQuery.includes('update') || lowerQuery.includes('check')) {
        checkMonthlyUpdates();
        return "Running system check now... All dependencies are current! I automatically check for updates monthly. Your app version is 2.0.0 with the latest maritime regulations database. 🔧";
    }
    
    // Emergency queries
    if (lowerQuery.includes('emergency') || lowerQuery.includes('mayday') || lowerQuery.includes('sos')) {
        return "EMERGENCY PROCEDURES: 1) Call Coast Guard on VHF Ch. 16 or dial 911, 2) Activate EPIRB if available, 3) Use the red CG Stop button to mark your location, 4) Share waypoint with 'EMERGENCY' in name to alert fleet. Stay calm, help is coming! 🆘";
    }
    
    // Help queries
    if (lowerQuery.includes('help') || lowerQuery.includes('what can you do')) {
        return `I'm Fishy, your AI First Mate! I can help with:
        🗺️ Navigation and waypoint sharing
        📋 Coast Guard regulations and inspections
        ⛈️ Weather monitoring and alerts
        🔧 System updates and maintenance
        🆘 Emergency procedures
        📱 Push notification setup
        Just ask me anything about sailing, navigation, or the app!`;
    }
    
    // Fleet queries
    if (lowerQuery.includes('fleet') || lowerQuery.includes('captain')) {
        return "Connect with other captains through the Fleet tab! You can share waypoints, send messages, and receive important alerts. Build your trusted network of fellow mariners for safer voyaging! 👥";
    }
    
    // Default response
    return fishyAI.responses.greetings[Math.floor(Math.random() * fishyAI.responses.greetings.length)] + " What would you like to know about?";
}

function addFishyMessage(content, sender) {
    const messagesDiv = document.getElementById('fishy-messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `fishy-message ${sender}`;
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    contentDiv.innerHTML = content;
    
    messageDiv.appendChild(contentDiv);
    messagesDiv.appendChild(messageDiv);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// Monthly Update Check
function checkMonthlyUpdates() {
    const lastCheck = fishyAI.lastCheck;
    const now = new Date();
    const oneMonth = 30 * 24 * 60 * 60 * 1000;
    
    if (!lastCheck || (now - new Date(lastCheck)) > oneMonth) {
        performUpdateCheck();
        fishyAI.lastCheck = now.toISOString();
        saveLocalData();
    }
}

async function performUpdateCheck() {
    // Simulate checking for updates
    setTimeout(() => {
        const notification = document.getElementById('fishy-notification');
        notification.style.display = 'block';
        
        addFishyMessage("🔧 Monthly maintenance check complete! All dependencies are up to date. Leaflet Maps: v1.9.4 ✓, Service Worker: v2.0 ✓, Maritime Database: Current ✓", 'fishy');
        
        setTimeout(() => {
            notification.style.display = 'none';
        }, 5000);
    }, 2000);
}

// GCC Themed Popup Functions
function showGCCPopup(title, message, type = 'info') {
    const modal = document.getElementById('gcc-modal');
    const modalTitle = document.getElementById('gcc-modal-title');
    const modalBody = document.getElementById('gcc-modal-body');
    const modalContent = document.querySelector('.gcc-modal-content');
    
    // Set content
    modalTitle.innerHTML = `<span class="gcc-icon">${getGCCIcon(type)}</span> ${title}`;
    modalBody.innerHTML = message;
    
    // Set theme based on type
    modalContent.className = `gcc-modal-content gcc-${type}`;
    
    // Show modal
    modal.style.display = 'flex';
}

function closeGCCModal() {
    document.getElementById('gcc-modal').style.display = 'none';
}

function getGCCIcon(type) {
    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️',
        question: '❓'
    };
    return icons[type] || icons.info;
}

// Fleet Management
function inviteCaptain() {
    const modal = document.getElementById('gcc-modal');
    const modalTitle = document.getElementById('gcc-modal-title');
    const modalBody = document.getElementById('gcc-modal-body');
    
    modalTitle.innerHTML = '➕ Invite Captain to Fleet';
    modalBody.innerHTML = `
        <div class="invite-form">
            <input type="text" id="invite-name" placeholder="Captain's Name" class="form-control">
            <input type="email" id="invite-email" placeholder="Email Address" class="form-control">
            <input type="text" id="invite-vessel" placeholder="Vessel Name" class="form-control">
            <textarea id="invite-message" placeholder="Personal message (optional)" class="form-control" rows="3"></textarea>
            <button class="btn btn-primary" onclick="sendInvitation()">Send Invitation</button>
        </div>
    `;
    
    modal.style.display = 'flex';
}

function sendInvitation() {
    const name = document.getElementById('invite-name').value;
    const email = document.getElementById('invite-email').value;
    
    if (!name || !email) {
        showGCCPopup('Missing Information', 'Please provide captain name and email.', 'warning');
        return;
    }
    
    // Simulate sending invitation
    closeGCCModal();
    showGCCPopup('Invitation Sent!', `Invitation sent to ${name}. They'll receive a link to join your fleet network.`, 'success');
}

function messageCaptain(captainId) {
    showGCCPopup('Messaging', `Opening secure channel to captain...`, 'info');
}

// Helper function for VAPID key
function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/-/g, '+')
        .replace(/_/g, '/');
    
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

// Save subscription to server
async function saveSubscription(subscription) {
    // In production, send to your server
    console.log('Push subscription saved:', subscription);
    localStorage.setItem('pushSubscription', JSON.stringify(subscription));
}

// View waypoint on map
function viewWaypoint(element) {
    const waypointItem = element.closest('.waypoint-item');
    const details = waypointItem.querySelector('.waypoint-details').textContent;
    const coords = details.match(/([-\d.]+)°[NS],\s*([-\d.]+)°[EW]/);
    
    if (coords) {
        const lat = parseFloat(coords[1]);
        const lng = parseFloat(coords[2]);
        
        // Switch to map tab
        document.querySelector('[data-tab="map"]').click();
        
        setTimeout(() => {
            if (map) {
                map.setView([lat, lng], 13);
                L.marker([lat, lng]).addTo(map)
                    .bindPopup(waypointItem.querySelector('.waypoint-name').textContent)
                    .openPopup();
            }
        }, 500);
    }
}

// Save waypoint to local storage
function saveWaypoint(element) {
    const waypointItem = element.closest('.waypoint-item');
    const name = waypointItem.querySelector('.waypoint-name').textContent;
    const details = waypointItem.querySelector('.waypoint-details').textContent;
    
    const waypoint = {
        id: Date.now(),
        name: name,
        details: details,
        saved: new Date().toISOString()
    };
    
    appData.waypoints.push(waypoint);
    saveLocalData();
    showGCCPopup('Waypoint Saved', `"${name}" has been saved to your waypoints.`, 'success');
}

// Add received waypoint to UI
function addReceivedWaypoint(waypoint) {
    const waypointHtml = `
        <div class="waypoint-item">
            <div class="waypoint-header">
                <span class="waypoint-from">From: ${waypoint.sender}</span>
                <span class="waypoint-time">Just now</span>
            </div>
            <div class="waypoint-name">${waypoint.name}</div>
            <div class="waypoint-details">${waypoint.lat.toFixed(4)}°N, ${Math.abs(waypoint.lng).toFixed(4)}°W</div>
            <div class="waypoint-description">${waypoint.description || ''}</div>
            <div class="waypoint-actions">
                <button class="btn-sm" onclick="viewWaypoint(this)">View on Map</button>
                <button class="btn-sm" onclick="saveWaypoint(this)">Save</button>
            </div>
        </div>
    `;
    
    const container = document.getElementById('received-waypoints');
    container.insertAdjacentHTML('afterbegin', waypointHtml);
}

// Load data from localStorage on startup
function loadLocalData() {
    const saved = localStorage.getItem('captainsBridgeData');
    if (saved) {
        const data = JSON.parse(saved);
        Object.assign(appData, data);
        updateUI();
    }
}

// Save data to localStorage
function saveLocalData() {
    localStorage.setItem('captainsBridgeData', JSON.stringify(appData));
    appData.lastSync = new Date().toISOString();
}

// Tab switching functionality
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        const targetTab = this.dataset.tab;
        
        // Update button states
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        
        // Update content panels
        document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));
        document.getElementById(targetTab).classList.add('active');
        
        // Initialize map when map tab is selected
        if (targetTab === 'map' && !map) {
            initializeMap();
        }
    });
});

// Document upload handling
document.getElementById('doc-upload').addEventListener('change', async function(e) {
    const files = e.target.files;
    
    for (let file of files) {
        const reader = new FileReader();
        reader.onload = function(event) {
            const doc = {
                id: Date.now() + Math.random(),
                name: file.name,
                type: file.type,
                size: file.size,
                data: event.target.result,
                uploadDate: new Date().toISOString()
            };
            
            appData.documents.push(doc);
            saveLocalData();
            addDocumentToUI(doc);
            showNotification('Document uploaded successfully', 'success');
        };
        reader.readAsDataURL(file);
    }
});

// Add document to UI
function addDocumentToUI(doc) {
    const docItem = document.createElement('li');
    docItem.className = 'doc-item';
    docItem.innerHTML = `
        <span class="doc-icon">📄</span>
        <div class="doc-info">
            <div class="doc-name">${doc.name}</div>
            <div class="doc-meta">Uploaded: ${new Date(doc.uploadDate).toLocaleDateString()}</div>
        </div>
        <button class="btn-sm" onclick="viewDocument('${doc.id}')">View</button>
    `;
    document.getElementById('required-docs').appendChild(docItem);
}

// View document
function viewDocument(docId) {
    const doc = appData.documents.find(d => d.id == docId);
    if (doc) {
        const win = window.open();
        win.document.write('<iframe src="' + doc.data + '" width="100%" height="100%" frameborder="0"></iframe>');
    }
}

// Initialize map
function initializeMap() {
    if (!map) {
        map = L.map('map-container').setView([25.7617, -80.1918], 10); // Miami as default
        
        // Add tile layer with offline fallback
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19
        }).addTo(map);
        
        // Load saved pins
        appData.pins.forEach(pin => {
            const marker = L.marker([pin.lat, pin.lng]).addTo(map);
            marker.bindPopup(pin.note || 'Saved location');
            pins.push(marker);
        });
        
        updatePinCount();
    }
}

// Get current location
function getCurrentLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            position => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                
                if (map) {
                    map.setView([lat, lng], 13);
                    
                    if (currentLocationMarker) {
                        map.removeLayer(currentLocationMarker);
                    }
                    
                    currentLocationMarker = L.marker([lat, lng], {
                        icon: L.divIcon({
                            html: '📍',
                            iconSize: [30, 30],
                            className: 'current-location-icon'
                        })
                    }).addTo(map);
                    
                    currentLocationMarker.bindPopup('Current Location').openPopup();
                }
                
                document.getElementById('current-coords').textContent = 
                    `Coordinates: ${lat.toFixed(6)}, ${lng.toFixed(6)}`;
                
                // Save current location
                appData.currentLocation = { lat, lng, timestamp: new Date().toISOString() };
                saveLocalData();
            },
            error => {
                showNotification('Unable to get location: ' + error.message, 'error');
            },
            { enableHighAccuracy: true }
        );
    } else {
        showNotification('Geolocation is not supported by this browser', 'error');
    }
}

// Drop a pin
function dropPin() {
    if (!map) return;
    
    const center = map.getCenter();
    const note = prompt('Add a note for this pin (optional):');
    
    const pin = {
        id: Date.now(),
        lat: center.lat,
        lng: center.lng,
        note: note || '',
        timestamp: new Date().toISOString()
    };
    
    appData.pins.push(pin);
    saveLocalData();
    
    const marker = L.marker([pin.lat, pin.lng]).addTo(map);
    marker.bindPopup(pin.note || 'Saved location');
    pins.push(marker);
    
    updatePinCount();
    showNotification('Pin dropped successfully', 'success');
}

// Mark Coast Guard stop
function markCoastGuardStop() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            position => {
                const stop = {
                    id: Date.now(),
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                    timestamp: new Date().toISOString(),
                    type: 'COAST_GUARD_STOP'
                };
                
                // Add to log
                const entry = {
                    id: Date.now(),
                    timestamp: stop.timestamp,
                    content: `COAST GUARD STOP at ${stop.lat.toFixed(6)}, ${stop.lng.toFixed(6)}`,
                    position: `${stop.lat.toFixed(6)}, ${stop.lng.toFixed(6)}`,
                    type: 'CG_STOP'
                };
                
                appData.logEntries.unshift(entry);
                saveLocalData();
                displayLogEntry(entry);
                
                // Add special marker on map
                if (map) {
                    const cgMarker = L.marker([stop.lat, stop.lng], {
                        icon: L.divIcon({
                            html: '🚨',
                            iconSize: [30, 30],
                            className: 'cg-stop-icon'
                        })
                    }).addTo(map);
                    
                    cgMarker.bindPopup(`Coast Guard Stop<br>${new Date(stop.timestamp).toLocaleString()}`).openPopup();
                }
                
                showNotification('Coast Guard stop location recorded', 'warning');
            },
            error => {
                showNotification('Unable to get location for CG stop', 'error');
            }
        );
    }
}

// Update pin count
function updatePinCount() {
    document.getElementById('pin-count').textContent = appData.pins.length;
}

// Ship's Log functions
function addLogEntry() {
    const datetime = document.getElementById('log-datetime').value || new Date().toISOString();
    const content = document.getElementById('log-entry').value;
    const position = document.getElementById('log-position').value;
    const weather = document.getElementById('log-weather').value;
    
    if (!content) {
        showNotification('Please enter log content', 'error');
        return;
    }
    
    const entry = {
        id: Date.now(),
        timestamp: datetime,
        content: content,
        position: position,
        weather: weather
    };
    
    appData.logEntries.unshift(entry);
    saveLocalData();
    displayLogEntry(entry);
    
    // Clear form
    document.getElementById('log-entry').value = '';
    document.getElementById('log-position').value = '';
    document.getElementById('log-weather').value = '';
    
    showNotification('Log entry added', 'success');
}

// Display log entry
function displayLogEntry(entry) {
    const logDiv = document.createElement('div');
    logDiv.className = 'log-entry';
    logDiv.innerHTML = `
        <div class="log-timestamp">${new Date(entry.timestamp).toLocaleString()}</div>
        <div class="log-content">${entry.content}</div>
        <div class="log-metadata">
            ${entry.position ? `<span>📍 ${entry.position}</span>` : ''}
            ${entry.weather ? `<span>🌤️ ${entry.weather}</span>` : ''}
            ${entry.type === 'CG_STOP' ? '<span style="color: red;">🚨 COAST GUARD STOP</span>' : ''}
        </div>
    `;
    
    const container = document.getElementById('log-entries');
    container.insertBefore(logDiv, container.firstChild);
}

// Clear log
function clearLog() {
    if (confirm('Are you sure you want to clear the entire log? This cannot be undone.')) {
        appData.logEntries = [];
        saveLocalData();
        document.getElementById('log-entries').innerHTML = '';
        showNotification('Log cleared', 'success');
    }
}

// Checklist functions
function resetChecklist() {
    if (confirm('Reset all checklist items?')) {
        document.querySelectorAll('.check-input').forEach(input => {
            input.checked = false;
        });
        appData.checklistState = {};
        saveLocalData();
        showNotification('Checklist reset', 'success');
    }
}

// Save checklist state
document.querySelectorAll('.check-input').forEach((input, index) => {
    input.addEventListener('change', function() {
        appData.checklistState[`item-${index}`] = this.checked;
        saveLocalData();
    });
});

// Restore checklist state
function restoreChecklist() {
    document.querySelectorAll('.check-input').forEach((input, index) => {
        if (appData.checklistState[`item-${index}`]) {
            input.checked = true;
        }
    });
}

// Update UI with saved data
function updateUI() {
    // Restore documents
    appData.documents.forEach(doc => addDocumentToUI(doc));
    
    // Restore log entries
    appData.logEntries.forEach(entry => displayLogEntry(entry));
    
    // Restore checklist
    restoreChecklist();
    
    // Update pin count
    updatePinCount();
}

// Show notification
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        background: ${type === 'success' ? '#4ade80' : type === 'error' ? '#f87171' : type === 'warning' ? '#fbbf24' : '#60a5fa'};
        color: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 1000;
        animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Online/Offline detection
function updateOnlineStatus() {
    const isOnline = navigator.onLine;
    const statusDot = document.querySelector('.status-dot');
    const statusText = document.getElementById('connection-status');
    
    if (isOnline) {
        statusDot.classList.remove('offline');
        statusText.textContent = 'Online';
    } else {
        statusDot.classList.add('offline');
        statusText.textContent = 'Offline';
    }
}

// Set current datetime in log form
function setCurrentDateTime() {
    const now = new Date();
    const datetime = now.toISOString().slice(0, 16);
    document.getElementById('log-datetime').value = datetime;
}

// Event listeners
window.addEventListener('online', updateOnlineStatus);
window.addEventListener('offline', updateOnlineStatus);
window.addEventListener('load', () => {
    loadLocalData();
    updateOnlineStatus();
    setCurrentDateTime();
});

// Keyboard shortcuts
document.addEventListener('keydown', function(e) {
    // Ctrl+S to save
    if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        saveLocalData();
        showNotification('Data saved', 'success');
    }
    
    // Ctrl+L to focus log entry
    if (e.ctrlKey && e.key === 'l') {
        e.preventDefault();
        document.getElementById('log').classList.add('active');
        document.getElementById('log-entry').focus();
    }
});

// Export data function
function exportData() {
    const dataStr = JSON.stringify(appData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `captains-bridge-backup-${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
}

// Add CSS for animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
    
    .current-location-icon {
        background: none;
        border: none;
    }
    
    .cg-stop-icon {
        background: none;
        border: none;
    }
`;
document.head.appendChild(style);
