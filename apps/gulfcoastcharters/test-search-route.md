# Search Route - Test Plan

**Feature:** `/search` Route  
**Status:** ✅ Implemented - Ready for Testing

---

## ✅ Implementation Complete

### Route Created
- ✅ `pages/search.tsx` - Unified search page
- ✅ Search across vessels, captains, and bookings
- ✅ Filter tabs (All, Vessels, Captains, Bookings)
- ✅ URL query parameter support (`?q=term&type=vessels`)
- ✅ Real-time search results
- ✅ Grouped results by type
- ✅ Navigation to detail pages

---

## 🧪 Test Plan

### Test 1: Search Route Accessibility

**Action:** Navigate to search page
```
http://localhost:3000/search
```

**Expected:**
- ✅ Page loads without errors
- ✅ Search form displays
- ✅ Filter tabs display
- ✅ Empty state shows when no search performed

**Verify:**
- Check browser console for errors
- Verify all UI elements render

---

### Test 2: Basic Search Functionality

**Action:** 
1. Enter search term (e.g., "fishing")
2. Click "Search" button

**Expected:**
- ✅ Loading state shows
- ✅ Results display after search completes
- ✅ Results grouped by type (Vessels, Captains, Bookings)
- ✅ Each result shows relevant information
- ✅ Results are clickable and navigate to detail pages

**Verify:**
- Check that results match search term
- Verify navigation works
- Check that images/avatars display

---

### Test 3: Filter Tabs

**Action:** 
1. Perform a search
2. Click different filter tabs (Vessels, Captains, Bookings)

**Expected:**
- ✅ Results filter by selected type
- ✅ Tab state updates correctly
- ✅ URL updates with `type` parameter
- ✅ Results count updates

**Verify:**
- Test each tab
- Verify filtering works correctly
- Check URL parameters

---

### Test 4: URL Query Parameters

**Action:** Navigate directly with query parameters
```
http://localhost:3000/search?q=fishing&type=vessels
```

**Expected:**
- ✅ Search query pre-filled
- ✅ Correct tab selected
- ✅ Search automatically executes
- ✅ Results display

**Verify:**
- Test with different query combinations
- Verify URL updates when search changes

---

### Test 5: Vessel Search

**Action:** Search for vessels

**Expected:**
- ✅ Searches both `vessels` and `boats` tables
- ✅ Shows vessel name, type, location
- ✅ Displays price, rating, capacity
- ✅ Shows vessel image or placeholder
- ✅ Links to `/vessels/[id]`

**Verify:**
- Check vessel results display correctly
- Verify all metadata shows
- Test navigation to vessel details

---

### Test 6: Captain Search

**Action:** Search for captains

**Expected:**
- ✅ Searches both `captain_profiles` and `captains` tables
- ✅ Shows captain name, location
- ✅ Displays bio/specialties
- ✅ Shows avatar or placeholder
- ✅ Shows rating if available
- ✅ Links to `/captains/[id]`

**Verify:**
- Check captain results display correctly
- Verify all metadata shows
- Test navigation to captain profile

---

### Test 7: Booking Search

**Action:** Search for bookings (must be logged in)

**Expected:**
- ✅ Only shows user's own bookings
- ✅ Shows charter name, date, status
- ✅ Displays guest count and price
- ✅ Shows booking status badge
- ✅ Links to `/bookings/[id]`
- ✅ If not logged in, no booking results

**Verify:**
- Test as logged-in user
- Test as guest (should not show bookings)
- Verify booking details display

---

### Test 8: Empty Results

**Action:** Search for term with no matches
```
http://localhost:3000/search?q=xyz123nonexistent
```

**Expected:**
- ✅ Shows "No results found" message
- ✅ Suggests adjusting search terms
- ✅ No errors in console

---

### Test 9: Search Performance

**Action:** Perform multiple searches quickly

**Expected:**
- ✅ Loading states show correctly
- ✅ No duplicate results
- ✅ Results update correctly
- ✅ No memory leaks

---

### Test 10: Special Characters

**Action:** Search with special characters
```
http://localhost:3000/search?q=test%20&%20more
```

**Expected:**
- ✅ Handles special characters correctly
- ✅ No errors
- ✅ Results display properly

---

## 🔧 Next Steps

1. **Add Search Suggestions** - Autocomplete/search suggestions
2. **Add Advanced Filters** - Price range, date range, rating filters
3. **Add Search History** - Remember recent searches
4. **Add Keyboard Shortcuts** - Quick search access
5. **Add Search Analytics** - Track popular searches

---

## 📝 Notes

- Search queries both new and legacy tables (vessels/boats, captain_profiles/captains)
- Bookings search requires authentication
- URL parameters sync with search state
- Results are grouped and displayed by type
- All results link to their respective detail pages

---

**Route is ready to test!** 🧪
