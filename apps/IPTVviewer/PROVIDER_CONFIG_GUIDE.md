# Switchback TV - Provider Configuration Guide

## 📦 For IPTV Providers

This guide explains how to create configuration files that your customers can import into Switchback TV for instant setup.

---

## 🎯 Config File Format

Create a simple JSON file with your customer's credentials:

```json
{
  "provider": "YourIPTVService",
  "server": "http://yourserver.com:8080",
  "username": "customer_username",
  "password": "customer_password",
  "alt": "http://backup-server.com:8080",
  "epg": "http://yourserver.com/xmltv.php?username=customer_username&password=customer_password"
}
```

### Required Fields:
- **`server`** - Your main IPTV server URL with port
- **`username`** - Customer's username
- **`password`** - Customer's password

### Optional Fields:
- **`provider`** - Your service name (for display only)
- **`alt`** - Backup/alternate server URL
- **`epg`** - XMLTV EPG URL for program guide

---

## 📤 Distribution Methods

### Method 1: Email Attachment
1. Generate config file for each customer
2. Name it: `yourservice-config.json`
3. Email as attachment with setup instructions

### Method 2: Download Link
1. Host config files on your server
2. Send customer a direct download link
3. Customer downloads on their Android TV device

### Method 3: Customer Portal
1. Add "Download Config" button to your customer portal
2. Generate config dynamically with their credentials
3. One-click download and import

---

## 📱 Customer Instructions

**For your customers using Switchback TV:**

1. **Download** the config file to your Android TV device
2. **Open Switchback TV** app
3. **Tap Settings** (⚙️ icon)
4. **Scroll to "IPTV Credentials"** section
5. **Tap "📁 Import Provider Config"**
6. **Select** the downloaded config file
7. **Tap "Load Playlist"**
8. **Done!** Channels load automatically

---

## 🔐 Security Best Practices

### ✅ DO:
- Generate unique config files per customer
- Use HTTPS for config file downloads
- Delete config files after customer downloads
- Expire download links after 24 hours
- Include only necessary credentials

### ❌ DON'T:
- Share config files between customers
- Include admin credentials
- Store config files in public directories
- Use unencrypted HTTP for sensitive data

---

## 🛠️ Automation Examples

### PHP - Generate Config on Demand

```php
<?php
header('Content-Type: application/json');
header('Content-Disposition: attachment; filename="iptv-config.json"');

$config = [
    'provider' => 'YourIPTV',
    'server' => 'http://yourserver.com:8080',
    'username' => $_GET['user'],
    'password' => $_GET['pass'],
    'epg' => "http://yourserver.com/xmltv.php?username={$_GET['user']}&password={$_GET['pass']}"
];

echo json_encode($config, JSON_PRETTY_PRINT);
?>
```

### Node.js - Generate Config

```javascript
const fs = require('fs');

function generateConfig(username, password) {
  const config = {
    provider: 'YourIPTV',
    server: 'http://yourserver.com:8080',
    username: username,
    password: password,
    epg: `http://yourserver.com/xmltv.php?username=${username}&password=${password}`
  };
  
  fs.writeFileSync(`${username}-config.json`, JSON.stringify(config, null, 2));
}

generateConfig('customer123', 'pass456');
```

### Python - Bulk Generate Configs

```python
import json

def generate_config(username, password):
    config = {
        'provider': 'YourIPTV',
        'server': 'http://yourserver.com:8080',
        'username': username,
        'password': password,
        'epg': f'http://yourserver.com/xmltv.php?username={username}&password={password}'
    }
    
    with open(f'{username}-config.json', 'w') as f:
        json.dump(config, f, indent=2)

# Bulk generate for all customers
customers = [
    ('user1', 'pass1'),
    ('user2', 'pass2'),
    ('user3', 'pass3'),
]

for username, password in customers:
    generate_config(username, password)
```

---

## 📧 Email Template for Customers

```
Subject: Your IPTV Setup - One-Click Configuration

Hi [Customer Name],

Welcome to [Your IPTV Service]!

We've made setup super easy - just follow these steps:

1. Download the attached config file
2. Open Switchback TV on your Android TV
3. Go to Settings → Import Provider Config
4. Select the downloaded file
5. Tap "Load Playlist"

That's it! Your channels will load automatically.

Need help? Reply to this email or visit our support page.

Enjoy your IPTV!

[Your IPTV Service Team]
```

---

## 🎨 Branding (Optional)

You can customize the config file with additional metadata:

```json
{
  "provider": "YourIPTV Premium",
  "server": "http://yourserver.com:8080",
  "username": "customer123",
  "password": "pass456",
  "epg": "http://yourserver.com/xmltv.php?username=customer123&password=pass456",
  "support_url": "https://yourservice.com/support",
  "support_email": "support@yourservice.com",
  "logo": "https://yourservice.com/logo.png"
}
```

*Note: Extra fields are ignored by the app but can be used for your own tracking.*

---

## ✅ Testing Your Config Files

Before sending to customers, test the config file:

1. Create a test config with your own credentials
2. Import it into Switchback TV
3. Verify channels load correctly
4. Check EPG data appears
5. Test stream playback

---

## 📊 Benefits for Providers

- **Reduced Support Tickets** - No more "how do I enter my credentials?" questions
- **Faster Onboarding** - Customers watching TV in under 1 minute
- **Professional Image** - Shows you care about user experience
- **Fewer Typos** - No manual URL entry = fewer connection errors
- **Scalable** - Automate config generation for thousands of customers

---

## 🆘 Support

If you need help implementing config file generation for your IPTV service, contact us or check the Switchback TV documentation.

**Happy Streaming! 📺**
