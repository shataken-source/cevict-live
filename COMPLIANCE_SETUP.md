# SmokersRights Compliance Setup Guide

## Critical Legal Requirements for 2026

This guide outlines the mandatory compliance requirements for operating SmokersRights.com in the tobacco/nicotine space. Failure to implement these requirements correctly will result in FDA warning letters, legal liability, and potential felony charges.

## 🔴 IMMEDIATE ACTION REQUIRED

### 1. Age Verification System

**Provider**: AgeChecker.net (Recommended for MVP)
**API Key**: Required for production deployment

```bash
# Add to .env.local
AGECHECKER_API_KEY=your_production_api_key_here
AGECHECKER_WEBHOOK_SECRET=your_webhook_secret_here
```

**Verification Methods**:
- **Soft Gate**: Cookie-based 7-day verification (SEO-friendly)
- **Hard Verification**: Database match with fallback to manual ID review
- **Biometric Option**: Available for enterprise customers

### 2. Legal Compliance Environment Variables

```bash
# Age Verification
AGECHECKER_API_KEY=your_api_key_here
AGECHECKER_WEBHOOK_SECRET=webhook_secret
AGE_VERIFICATION_ENABLED=true
MINIMUM_AGE=21

# Legal Compliance
JENKINS_ACT_ENABLED=true
FELONY_RISK_WARNINGS_ENABLED=true
COMPLIANCE_LOGGING_ENABLED=true

# Geographic Restrictions
ALLOWED_STATES=AL,FL,MS,LA,TN,KY,AR,GA,WV,SC
BLOCKED_COUNTRIES=XX,YY,ZZ

# Data Protection
ENCRYPTION_KEY=your_32_character_encryption_key
COMPLIANCE_DATA_RETENTION_DAYS=2555  # 7 years as required
```

## 🚨 High-Risk State Warnings

### Alabama (HB 445) - FELONY RISK
- **Vaping Products**: Class C Felony
- **Smokable Hemp**: Class C Felony
- **Penalties**: Up to 10 years imprisonment, $15,000 fine

### Florida (Stat 386.203) - RESTRICTED
- **Vaping**: Restricted in certain areas
- **Age Limit**: 21+ strictly enforced

### Mississippi (Code 97-32-29) - MISDEMEANOR
- **Vaping**: Misdemeanor charges
- **Local Restrictions**: Varies by county

### Louisiana (RS 40:1300) - RESTRICTED
- **Vaping**: Specific restrictions apply
- **Local Ordinances**: Check parish-level laws

## 📋 Implementation Checklist

### ✅ Completed Items
- [x] Age verification service integration
- [x] Compliance middleware implementation
- [x] Database schema for verification tracking
- [x] Felony risk warning system
- [x] Jenkins Act reporting framework
- [x] Audit logging system

### 🔄 In Progress
- [ ] Multi-tenant auth separation
- [ ] ISR implementation for performance
- [ ] Premium subscription system
- [ ] Email newsletter funnel

### ⏳ Pending
- [ ] SEO landing pages
- [ ] Geographic IP blocking
- [ ] Automated compliance reporting

## 🔧 Technical Implementation

### Age Verification Flow

1. **Soft Gate (Layer 1)**
   - Cookie-based 7-day verification
   - Excludes search crawlers for SEO
   - Sets `pref_age_verified` cookie

2. **Hard Verification (Layer 2)**
   - Full identity verification via AgeChecker.net
   - Database match against government records
   - Manual review fallback with ID upload

3. **Compliance Logging**
   - All verification attempts logged
   - IP addresses and user agents tracked
   - Audit trail for legal requirements

### Jenkins Act Compliance

**Monthly Reporting Requirements**:
- Customer name and address
- Product type and tobacco weight
- Order totals and shipping information
- Filed by 10th of each month

**Automation**:
- Cron job compiles reports automatically
- CSV formatting for state submissions
- Email notifications for compliance team

### Database Schema

**Critical Tables**:
- `unified_users` - Extended with verification fields
- `verification_attempts` - Audit trail for all attempts
- `jenkins_act_reports` - Federal compliance reporting
- `compliance_logs` - Complete audit trail
- `felony_warnings` - Risk warnings by state/product

## 🛡️ Security Requirements

### Data Protection
- **Encryption**: All PII encrypted at rest
- **Access Logs**: Every data access logged
- **Retention**: 7 years minimum retention
- **Deletion**: Secure deletion after retention period

### API Security
- **Authentication**: Service role only for compliance APIs
- **Rate Limiting**: Prevent abuse of verification system
- **Monitoring**: Real-time compliance monitoring
- **Alerts**: Automatic alerts for compliance violations

## 📊 Monitoring & Reporting

### Compliance Dashboard
- Verification success rates
- Failed attempt monitoring
- Geographic access patterns
- Jenkins Act reporting status

### Automated Alerts
- Verification failure spikes
- Access from blocked regions
- Unusual pattern detection
- Report deadline reminders

## 🚀 Deployment Instructions

### 1. Environment Setup
```bash
# Install required dependencies
npm install @agechecker/net

# Set environment variables
cp .env.example .env.local
# Edit .env.local with your keys
```

### 2. Database Migration
```bash
# Apply compliance schema
supabase db push
```

### 3. Age Checker Configuration
1. Sign up at [AgeChecker.net](https://agechecker.net)
2. Get API keys for sandbox and production
3. Configure webhook endpoints
4. Test verification flow

### 4. Testing
```bash
# Test soft gate
curl http://localhost:3000/age-verify

# Test full verification
curl http://localhost:3000/age-verify/full

# Test compliance logging
curl -X POST http://localhost:3000/api/compliance/log \
  -H "Content-Type: application/json" \
  -d '{"action": "test", "details": {}}'
```

## ⚖️ Legal Disclaimer

**IMPORTANT**: This implementation is for informational purposes only. You must:

1. **Consult Legal Counsel**: Review with qualified tobacco law attorneys
2. **State-Specific Compliance**: Each state has unique requirements
3. **Regular Updates**: Laws change frequently; update compliance regularly
4. **Document Everything**: Maintain detailed compliance records

## 🆘 Emergency Contacts

### Compliance Issues
- **Legal Team**: [Your legal contact]
- **AgeChecker Support**: support@agechecker.net
- **Emergency Compliance**: [24/7 contact]

### Regulatory Agencies
- **FDA Tobacco Division**: 1-877-CTP-HELP
- **State Tobacco Control**: [State-specific contacts]
- **FTC Advertising**: 1-877-FTC-HELP

## 📈 Success Metrics

### Compliance KPIs
- **Verification Success Rate**: Target >95%
- **False Positive Rate**: Target <2%
- **Report Filing Timeliness**: 100% on-time
- **Audit Trail Completeness**: 100% coverage

### Business Impact
- **Legal Risk**: Minimized through compliance
- **User Trust**: Enhanced through transparency
- **Market Access**: Expanded through proper licensing
- **Insurance**: Lower premiums through compliance

---

**⚠️ WARNING**: Operating without proper compliance can result in:
- FDA warning letters and fines
- State-level felony charges
- Civil liability lawsuits
- Payment processor termination
- Domain seizure

**Next Steps**: 
1. Obtain AgeChecker.net API keys
2. Deploy compliance middleware
3. Test all verification flows
4. Set up monitoring and alerts
5. Consult with legal counsel

This compliance system is designed for the 2026 regulatory environment and must be kept current with changing laws and regulations.
