# Vercel Custom Domain Setup Guide
## Setting Up gulfcoastcharters.com on Vercel

### Prerequisites
- Vercel account with project deployed
- Access to your domain registrar (GoDaddy, Namecheap, Cloudflare, etc.)
- Domain: gulfcoastcharters.com

---

## Step 1: Add Domain in Vercel Dashboard

1. **Navigate to Project Settings**
   - Go to https://vercel.com/dashboard
   - Select your Gulf Coast Charters project
   - Click "Settings" → "Domains"

2. **Add Custom Domain**
   - Click "Add Domain"
   - Enter: `gulfcoastcharters.com`
   - Click "Add"
   - Also add: `www.gulfcoastcharters.com`

3. **Choose Primary Domain**
   - Select which should be primary (recommended: `gulfcoastcharters.com`)
   - Vercel will auto-redirect www to apex (or vice versa)

---

## Step 2: DNS Configuration

### Option A: Using Vercel Nameservers (Recommended - Easiest)

**Advantages:**
- Automatic SSL certificate management
- Fastest propagation
- No manual DNS records needed
- Built-in DDoS protection

**Steps:**
1. Vercel will provide nameservers:
   ```
   ns1.vercel-dns.com
   ns2.vercel-dns.com
   ```

2. **At Your Domain Registrar:**
   - Log into your registrar (GoDaddy, Namecheap, etc.)
   - Find "Nameservers" or "DNS Settings"
   - Change from default to "Custom Nameservers"
   - Enter Vercel's nameservers
   - Save changes

3. **Wait for Propagation:**
   - Usually 1-4 hours
   - Can take up to 48 hours
   - Check status: `nslookup gulfcoastcharters.com`

---

### Option B: Using A and CNAME Records (If keeping current nameservers)

**At Your Domain Registrar's DNS Management:**

#### For Root Domain (gulfcoastcharters.com):
```
Type: A
Name: @ (or leave blank)
Value: 76.76.21.21
TTL: 3600
```

#### For WWW Subdomain:
```
Type: CNAME
Name: www
Value: cname.vercel-dns.com
TTL: 3600
```

#### Alternative: ALIAS/ANAME Record (if supported)
```
Type: ALIAS (or ANAME)
Name: @
Value: cname.vercel-dns.com
TTL: 3600
```

**Note:** Some registrars (Cloudflare, DNSimple) support ALIAS records which are better than A records.

---

## Step 3: SSL Certificate Setup

### Automatic SSL (Vercel Handles This)

1. **After DNS Propagation:**
   - Vercel automatically provisions SSL certificate
   - Uses Let's Encrypt
   - Free and auto-renewing
   - Usually takes 1-5 minutes after DNS is verified

2. **Verify SSL Status:**
   - In Vercel Dashboard → Domains
   - Look for green checkmark next to domain
   - Status should show "Valid Configuration"

3. **Force HTTPS:**
   - Already configured in `vercel.json`
   - All HTTP traffic auto-redirects to HTTPS

---

## Step 4: Domain Verification

### Verify DNS Propagation

**Check DNS Resolution:**
```bash
# Check A record
nslookup gulfcoastcharters.com

# Check CNAME record
nslookup www.gulfcoastcharters.com

# Detailed DNS check
dig gulfcoastcharters.com

# Check from multiple locations
https://dnschecker.org
```

**Expected Results:**
- gulfcoastcharters.com → 76.76.21.21 (or Vercel IP)
- www.gulfcoastcharters.com → cname.vercel-dns.com

### Verify SSL Certificate

```bash
# Check SSL certificate
openssl s_client -connect gulfcoastcharters.com:443 -servername gulfcoastcharters.com

# Or visit in browser
https://www.ssllabs.com/ssltest/analyze.html?d=gulfcoastcharters.com
```

### Test in Browser

1. Visit: https://gulfcoastcharters.com
2. Visit: https://www.gulfcoastcharters.com
3. Visit: http://gulfcoastcharters.com (should redirect to HTTPS)
4. Check for green padlock icon
5. Click padlock → Certificate should show "Let's Encrypt"

---

## Troubleshooting Common Issues

### Issue 1: "Domain Not Verified" in Vercel

**Symptoms:**
- Red X next to domain in Vercel dashboard
- "Invalid Configuration" message

**Solutions:**
1. **Check DNS Records:**
   ```bash
   nslookup gulfcoastcharters.com
   ```
   - Should return Vercel's IP (76.76.21.21)
   - If not, DNS records are incorrect

2. **Wait for Propagation:**
   - DNS changes take time (up to 48 hours)
   - Check propagation: https://dnschecker.org

3. **Remove and Re-add Domain:**
   - In Vercel Dashboard, remove domain
   - Wait 5 minutes
   - Add domain again

4. **Clear DNS Cache:**
   ```bash
   # Windows
   ipconfig /flushdns
   
   # Mac
   sudo dscacheutil -flushcache; sudo killall -HUP mDNSResponder
   
   # Linux
   sudo systemd-resolve --flush-caches
   ```

---

### Issue 2: SSL Certificate Not Provisioning

**Symptoms:**
- "Not Secure" warning in browser
- Certificate error messages
- Domain verified but no HTTPS

**Solutions:**
1. **Verify DNS is Correct:**
   - SSL won't provision until DNS is fully propagated
   - Use dnschecker.org to verify global propagation

2. **Check CAA Records:**
   - Some registrars have CAA records blocking Let's Encrypt
   - Add CAA record allowing Let's Encrypt:
   ```
   Type: CAA
   Name: @
   Value: 0 issue "letsencrypt.org"
   ```

3. **Remove Conflicting Records:**
   - Remove any existing A records pointing elsewhere
   - Remove any AAAA records (IPv6)
   - Keep only Vercel's DNS records

4. **Contact Vercel Support:**
   - If SSL doesn't provision after 24 hours
   - Use Vercel dashboard chat support

---

### Issue 3: "Too Many Redirects" Error

**Symptoms:**
- Browser shows "ERR_TOO_MANY_REDIRECTS"
- Page keeps loading but never displays

**Solutions:**
1. **Check Cloudflare SSL Settings (if using Cloudflare):**
   - Set SSL/TLS mode to "Full" or "Full (Strict)"
   - NOT "Flexible"

2. **Disable Cloudflare Proxy (temporarily):**
   - In Cloudflare DNS, click orange cloud to make it gray
   - This bypasses Cloudflare proxy
   - Test if site works

3. **Check for Redirect Loops:**
   - Remove any custom redirects in registrar
   - Vercel handles all redirects automatically

---

### Issue 4: WWW Not Redirecting to Apex (or vice versa)

**Symptoms:**
- www.gulfcoastcharters.com and gulfcoastcharters.com show different content
- One works, the other doesn't

**Solutions:**
1. **Add Both Domains in Vercel:**
   - Add gulfcoastcharters.com
   - Add www.gulfcoastcharters.com
   - Vercel will auto-redirect between them

2. **Set Redirect in Vercel:**
   - In Vercel Dashboard → Domains
   - Click three dots next to domain
   - Select "Redirect to..." option
   - Choose primary domain

3. **Verify CNAME Record:**
   ```bash
   nslookup www.gulfcoastcharters.com
   ```
   - Should show: cname.vercel-dns.com

---

### Issue 5: Old Site Still Showing

**Symptoms:**
- Domain points to old hosting/content
- Changes not reflecting

**Solutions:**
1. **Clear Browser Cache:**
   - Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
   - Or open in incognito/private window

2. **Check DNS Records:**
   - Ensure A record points to Vercel (76.76.21.21)
   - Remove any old A records pointing to previous host

3. **Disable Old Hosting:**
   - Cancel/pause old hosting service
   - Remove old DNS records completely

4. **Wait for DNS Propagation:**
   - Check multiple DNS servers: https://dnschecker.org
   - Some ISPs cache DNS longer than others

---

### Issue 6: Subdomain Not Working

**Symptoms:**
- staging.gulfcoastcharters.com not resolving
- Other subdomains not accessible

**Solutions:**
1. **Add Subdomain in Vercel:**
   - Go to project → Settings → Domains
   - Add: staging.gulfcoastcharters.com
   - Vercel provides DNS instructions

2. **Add CNAME Record:**
   ```
   Type: CNAME
   Name: staging
   Value: cname.vercel-dns.com
   TTL: 3600
   ```

3. **Assign to Correct Project:**
   - In Vercel, you can have multiple projects
   - Ensure subdomain is assigned to correct project
   - Production: gulfcoastcharters.com → main project
   - Staging: staging.gulfcoastcharters.com → staging project

---

## DNS Configuration by Registrar

### GoDaddy
1. Log in → My Products → Domain → DNS
2. Click "Add" for new record
3. Select record type (A or CNAME)
4. Enter values, Save

### Namecheap
1. Log in → Domain List → Manage
2. Advanced DNS tab
3. Add New Record
4. Select type, enter values, Save

### Cloudflare
1. Log in → Select domain
2. DNS tab
3. Add record
4. **Important:** Set proxy status to "DNS only" (gray cloud)

### Google Domains
1. Log in → My Domains → Manage
2. DNS tab → Custom records
3. Add record with values

---

## Verification Checklist

- [ ] Domain added in Vercel dashboard
- [ ] DNS records configured at registrar
- [ ] DNS propagation complete (check dnschecker.org)
- [ ] Green checkmark in Vercel dashboard
- [ ] SSL certificate provisioned
- [ ] https://gulfcoastcharters.com loads correctly
- [ ] https://www.gulfcoastcharters.com redirects properly
- [ ] http:// redirects to https://
- [ ] Green padlock shows in browser
- [ ] No certificate warnings
- [ ] All pages load correctly
- [ ] Environment variables set in Vercel

---

## Advanced Configuration

### Custom SSL Certificate (Enterprise)
If you need a custom SSL certificate:
1. Upgrade to Vercel Pro or Enterprise
2. Upload certificate in Settings → Domains
3. Requires: certificate, private key, CA bundle

### Apex Domain with CNAME Flattening
Some DNS providers support CNAME flattening:
- Cloudflare: Automatic
- AWS Route 53: Use ALIAS record
- DNSimple: Use ALIAS record

### Multiple Domains
To point multiple domains to same site:
1. Add each domain in Vercel
2. Set primary domain
3. Others will redirect automatically

---

## Support Resources

- **Vercel Documentation:** https://vercel.com/docs/concepts/projects/domains
- **DNS Checker:** https://dnschecker.org
- **SSL Test:** https://www.ssllabs.com/ssltest/
- **Vercel Support:** https://vercel.com/support
- **Community:** https://github.com/vercel/vercel/discussions

---

## Quick Reference: Common Commands

```bash
# Check DNS resolution
nslookup gulfcoastcharters.com

# Detailed DNS info
dig gulfcoastcharters.com

# Check SSL certificate
openssl s_client -connect gulfcoastcharters.com:443

# Flush DNS cache (Mac)
sudo dscacheutil -flushcache; sudo killall -HUP mDNSResponder

# Flush DNS cache (Windows)
ipconfig /flushdns

# Trace DNS propagation
dig gulfcoastcharters.com +trace
```

---

## Timeline Expectations

| Step | Expected Time |
|------|---------------|
| Add domain in Vercel | Instant |
| Configure DNS records | 5-10 minutes |
| DNS propagation | 1-48 hours (usually 1-4 hours) |
| SSL certificate provisioning | 1-5 minutes after DNS verified |
| Full setup completion | 2-24 hours typical |

---

**Last Updated:** November 2025
**Domain:** gulfcoastcharters.com
**Platform:** Vercel
