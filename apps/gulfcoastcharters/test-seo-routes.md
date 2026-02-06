# SEO Routes - Test Plan

**Feature:** `/api/sitemap.xml` and `/api/robots.txt` Routes  
**Status:** ✅ Implemented - Ready for Testing

---

## ✅ Implementation Complete

### Routes Created
- ✅ `pages/api/sitemap.xml.ts` - XML sitemap API route
- ✅ `pages/api/robots.txt.ts` - Robots.txt API route
- ✅ All main routes included in sitemap
- ✅ Proper priority and changefreq settings
- ✅ Robots.txt with appropriate disallow rules
- ✅ Sitemap reference in robots.txt

---

## 🧪 Test Plan

### Test 1: Sitemap Route Accessibility

**Action:** Navigate to sitemap
```
http://localhost:3000/api/sitemap.xml
```

**Expected:**
- ✅ Returns valid XML
- ✅ Content-Type is text/xml
- ✅ All routes included
- ✅ Valid XML structure

**Verify:**
- Check XML format
- Verify all routes
- Test in browser

---

### Test 2: Robots.txt Route Accessibility

**Action:** Navigate to robots.txt
```
http://localhost:3000/api/robots.txt
```

**Expected:**
- ✅ Returns valid robots.txt
- ✅ Content-Type is text/plain
- ✅ Disallow rules present
- ✅ Sitemap reference included

**Verify:**
- Check robots.txt format
- Verify disallow rules
- Test in browser

---

### Test 3: Sitemap Content

**Action:** Review sitemap XML

**Expected:**
- ✅ All main routes included
- ✅ Priorities set correctly
- ✅ Changefreq set appropriately
- ✅ URLs are absolute
- ✅ Valid XML structure

**Verify:**
- Check route completeness
- Verify priority values
- Test XML validation

---

### Test 4: Robots.txt Content

**Action:** Review robots.txt

**Expected:**
- ✅ User-agent: * present
- ✅ Allow: / present
- ✅ Admin routes disallowed
- ✅ API routes disallowed
- ✅ Sitemap reference correct

**Verify:**
- Check disallow rules
- Verify sitemap reference
- Test format

---

### Test 5: Cache Headers

**Action:** Check response headers

**Expected:**
- ✅ Cache-Control header set
- ✅ Appropriate cache duration
- ✅ Stale-while-revalidate present

**Verify:**
- Check headers
- Verify cache settings
- Test caching behavior

---

## 🔧 Next Steps

1. **Add Dynamic Routes** - Include dynamic routes (captains/[id], vessels/[id], etc.)
2. **Add Blog Posts** - Include blog posts in sitemap
3. **Add Last Modified** - Include lastmod dates
4. **Add Images** - Include images in sitemap
5. **Add News Sitemap** - Separate news sitemap if needed

---

## 📝 Notes

- Sitemap includes all main routes
- Priorities range from 0.3 to 1.0
- Changefreq set based on content type
- Robots.txt disallows admin and API routes
- Ready for search engine submission

---

**Routes are ready to test!** 🧪
