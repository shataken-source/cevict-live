# 🚨 Brain Monitoring & Alerts Setup Guide

## 🎯 Goal
Configure Brain to send alerts (SMS/Email) when problems are detected.

---

## 📱 SMS Alerts (Sinch)

### Step 1: Get Sinch Credentials

You already have these from PopThePopcorn setup:
- `SINCH_SERVICE_PLAN_ID`
- `SINCH_API_TOKEN`
- `SINCH_FROM` (phone number)

### Step 2: Add to Brain `.env.local`

```env
SINCH_SERVICE_PLAN_ID=your-sinch-plan-id
SINCH_API_TOKEN=your-sinch-token
SINCH_FROM=+1234567890
ALERT_SMS_TO=+1234567890
```

### Step 3: Test SMS Alert

```powershell
# Test from Brain API
Invoke-RestMethod -Uri "http://localhost:3006/api/brain/dispatch" `
  -Method POST `
  -Headers @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer your-brain-api-token"
  } `
  -Body '{
    "target": "agent:ops",
    "payload": {
      "command": "test-alert",
      "args": {
        "note": "Testing SMS alert from Brain"
      }
    }
  }'
```

---

## 📧 Email Alerts (SendGrid or SMTP)

### Option 1: SendGrid (Recommended)

1. **Get SendGrid API Key:**
   - Sign up at https://sendgrid.com
   - Create API key with "Mail Send" permissions

2. **Add to `.env.local`:**
   ```env
   SENDGRID_API_KEY=your-sendgrid-api-key
   SENDGRID_FROM=noreply@yourdomain.com
   ALERT_EMAIL_TO=alerts@yourdomain.com
   ```

### Option 2: SMTP (Any Email Provider)

1. **Add to `.env.local`:**
   ```env
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-app-password
   SMTP_FROM=noreply@yourdomain.com
   ALERT_EMAIL_TO=alerts@yourdomain.com
   ```

---

## 🔔 Alert Types

### Critical Alerts (SMS + Email):
- App down for > 5 minutes
- Payment processing failures
- Database connection failures
- Security breaches

### Important Alerts (Email):
- Daily status digest
- Weekly performance report
- Cron job failures
- High error rates

---

## ⚙️ Configure Alert Rules

Brain automatically sends alerts based on these rules:

1. **Provider Failures** → SMS + Email with error details
2. **Key Expiry** → Email notification
3. **Job Failures** → Email with investigation details
4. **Health Check Failures** → SMS + Email, auto-restart attempt
5. **Security Breaches** → Immediate SMS + Email
6. **Cron Failures** → Email notification
7. **Data Issues** → Email with debug info

---

## 🧪 Test Alerts

### Test SMS Alert:
```powershell
# Trigger a test alert
Invoke-RestMethod -Uri "http://localhost:3006/api/brain/dispatch" `
  -Method POST `
  -Headers @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer your-brain-api-token"
  } `
  -Body '{
    "target": "agent:ops",
    "payload": {
      "command": "test-alert",
      "args": {
        "message": "Test SMS alert from Brain",
        "priority": "high"
      }
    }
  }'
```

### Test Email Alert:
```powershell
# Same as above, but Brain will send email if SMS fails or for lower priority
```

---

## 📊 Monitoring Dashboard

### Access Brain Dashboard:
- **URL:** http://localhost:3006/admin/brain
- **Shows:**
  - Real-time health status
  - Event log
  - Alert history
  - System metrics

### Metrics API:
```powershell
# Get current metrics
Invoke-RestMethod -Uri "http://localhost:3006/api/metrics" | ConvertTo-Json
```

---

## 🔍 Alert Configuration

### Customize Alert Thresholds:

Edit Brain configuration (if needed):
- **Health check interval:** `BRAIN_POLL_INTERVAL_MS=5000` (5 seconds)
- **Health timeout:** `BRAIN_HEALTH_TIMEOUT_MS=5000` (5 seconds)
- **Rate limit:** `BRAIN_RATE_LIMIT_PER_MIN=60`

### Alert Recipients:

Multiple recipients (comma-separated):
```env
ALERT_SMS_TO=+1234567890,+0987654321
ALERT_EMAIL_TO=alerts@domain.com,ops@domain.com
```

---

## ✅ Verification Checklist

- [ ] Sinch credentials configured
- [ ] Email provider configured (SendGrid or SMTP)
- [ ] Alert recipients set
- [ ] Test SMS alert works
- [ ] Test email alert works
- [ ] Brain dashboard accessible
- [ ] Metrics API responding
- [ ] Alerts trigger on failures

---

## 🎯 Success Criteria

**You'll know alerts are working when:**
- ✅ You receive SMS when critical issues occur
- ✅ You receive email digests
- ✅ Brain dashboard shows alert history
- ✅ Test alerts are received

---

**Once configured, Brain will automatically alert you when problems are detected!** 🚨

