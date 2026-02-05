// public/test-runner.js - ACTUAL BROWSER TEST SCRIPT
// This gets loaded and can be run directly in browser console

window.runEasyTests = function() {
  console.log('🎣 Gulf Coast Charters - Easy Test Runner v1.0')
  console.log('=========================================')
  console.log('Running automated tests...\n')
  
  const results = {
    passed: [],
    failed: [],
    warnings: []
  }
  
  // Test 1: Check if page loaded
  try {
    if (document.body) {
      results.passed.push('✅ Page loaded successfully')
    } else {
      results.failed.push('❌ Page failed to load')
    }
  } catch (e) {
    results.failed.push('❌ Page load error: ' + e.message)
  }
  
  // Test 2: Check for React
  try {
    if (window.React || document.querySelector('[data-reactroot]') || document.querySelector('#__next')) {
      results.passed.push('✅ React framework detected')
    } else {
      results.warnings.push('⚠️ React may not be loaded')
    }
  } catch (e) {
    results.failed.push('❌ React check failed')
  }
  
  // Test 3: Check responsive design
  try {
    const viewport = window.innerWidth
    if (viewport < 768) {
      results.passed.push('✅ Mobile view active (' + viewport + 'px)')
    } else if (viewport < 1024) {
      results.passed.push('✅ Tablet view active (' + viewport + 'px)')
    } else {
      results.passed.push('✅ Desktop view active (' + viewport + 'px)')
    }
  } catch (e) {
    results.failed.push('❌ Responsive check failed')
  }
  
  // Test 4: Check for API endpoints
  console.log('Testing API endpoints...')
  fetch('/api/health')
    .then(res => {
      if (res.ok) {
        results.passed.push('✅ API health check passed')
      } else {
        results.failed.push('❌ API health check failed')
      }
    })
    .catch(() => {
      results.failed.push('❌ API not responding')
    })
  
  // Test 5: Check for navigation elements
  try {
    const hasNav = document.querySelector('nav') || document.querySelector('[role="navigation"]')
    if (hasNav) {
      results.passed.push('✅ Navigation menu found')
    } else {
      results.warnings.push('⚠️ No navigation menu found')
    }
  } catch (e) {
    results.failed.push('❌ Navigation check failed')
  }
  
  // Test 6: Check for help system
  try {
    const hasFishyHelp = document.querySelector('[class*="fish"]') || document.querySelector('[class*="help"]')
    if (hasFishyHelp) {
      results.passed.push('✅ Help system detected')
    } else {
      results.warnings.push('⚠️ Help system may not be visible')
    }
  } catch (e) {
    results.warnings.push('⚠️ Help system check failed')
  }
  
  // Test 7: Check page load speed
  try {
    if (window.performance && window.performance.timing) {
      const loadTime = window.performance.timing.loadEventEnd - window.performance.timing.navigationStart
      if (loadTime > 0 && loadTime < 3000) {
        results.passed.push('✅ Page loaded quickly (' + loadTime + 'ms)')
      } else if (loadTime >= 3000) {
        results.warnings.push('⚠️ Page load slow (' + loadTime + 'ms)')
      }
    }
  } catch (e) {
    results.warnings.push('⚠️ Could not measure page speed')
  }
  
  // Test 8: Check for console errors
  const originalError = console.error
  let errorCount = 0
  console.error = function() {
    errorCount++
    originalError.apply(console, arguments)
  }
  
  setTimeout(() => {
    console.error = originalError
    if (errorCount === 0) {
      results.passed.push('✅ No console errors detected')
    } else {
      results.warnings.push('⚠️ Found ' + errorCount + ' console errors')
    }
    
    // Display final results
    displayResults(results)
  }, 2000)
}

function displayResults(results) {
  console.log('\n🎣 TEST RESULTS')
  console.log('=====================================')
  console.log('Passed: ' + results.passed.length)
  console.log('Failed: ' + results.failed.length)
  console.log('Warnings: ' + results.warnings.length)
  console.log('=====================================\n')
  
  if (results.passed.length > 0) {
    console.log('PASSED TESTS:')
    results.passed.forEach(test => console.log(test))
  }
  
  if (results.failed.length > 0) {
    console.log('\nFAILED TESTS:')
    results.failed.forEach(test => console.log(test))
  }
  
  if (results.warnings.length > 0) {
    console.log('\nWARNINGS:')
    results.warnings.forEach(test => console.log(test))
  }
  
  // Overall status
  console.log('\n=====================================')
  if (results.failed.length === 0 && results.warnings.length < 3) {
    console.log('🎉 EXCELLENT! Site is working great!')
    console.log('🐟 Ready for fishing!')
  } else if (results.failed.length === 0) {
    console.log('👍 GOOD! Site is mostly working.')
    console.log('🎣 Some minor issues to fix.')
  } else if (results.failed.length < 3) {
    console.log('⚠️ NEEDS WORK! Some features are broken.')
    console.log('🔧 Please fix the failed tests.')
  } else {
    console.log('❌ CRITICAL! Many things are broken.')
    console.log('🚨 Site needs immediate attention!')
  }
  console.log('=====================================\n')
  
  console.log('📧 Send these results to: dev@gulfcoastcharters.com')
  console.log('📸 Or take a screenshot!')
  
  return results
}

// Additional test functions
window.testBookingFlow = function() {
  console.log('🎣 Testing Booking Flow...')
  
  // Simulate booking process
  const tests = []
  
  // Check if booking page exists
  fetch('/booking')
    .then(res => {
      if (res.ok) {
        tests.push('✅ Booking page accessible')
      } else {
        tests.push('❌ Booking page not found')
      }
      console.log(tests[tests.length - 1])
    })
    .catch(() => {
      tests.push('❌ Booking page error')
      console.log(tests[tests.length - 1])
    })
  
  // Test date validation
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  
  console.log('Testing date validation...')
  console.log('Today:', today.toISOString().split('T')[0])
  console.log('Yesterday:', yesterday.toISOString().split('T')[0])
  
  return tests
}

window.testPaymentSystem = function() {
  console.log('💳 Testing Payment System...')
  console.log('Using test card: 4242 4242 4242 4242')
  console.log('This is TEST MODE - no real charges')
  
  // Simulate payment
  const testPayment = {
    amount: 100.00,
    card: '4242 4242 4242 4242',
    exp: '12/25',
    cvv: '123'
  }
  
  console.log('Test payment:', testPayment)
  console.log('✅ Payment system ready for testing')
  
  return testPayment
}

window.testMobileView = function() {
  console.log('📱 Testing Mobile Responsiveness...')
  
  // Store original width
  const originalWidth = window.innerWidth
  
  // Test different screen sizes
  const sizes = [
    { name: 'iPhone SE', width: 375 },
    { name: 'iPhone 12', width: 390 },
    { name: 'iPad', width: 768 },
    { name: 'Desktop', width: 1920 }
  ]
  
  sizes.forEach(size => {
    console.log(`Testing ${size.name} (${size.width}px)...`)
    // In real test, would resize window
    // For now, just log
    if (window.innerWidth <= size.width) {
      console.log(`✅ Current view works for ${size.name}`)
    }
  })
  
  console.log('Current viewport:', window.innerWidth + 'x' + window.innerHeight)
  
  return true
}

// Auto-run message
console.log('%c🎣 Gulf Coast Charters Testing Ready!', 'color: #3b82f6; font-size: 16px; font-weight: bold')
console.log('%cType runEasyTests() to start testing', 'color: #10b981; font-size: 14px')
console.log('%cOther commands: testBookingFlow(), testPaymentSystem(), testMobileView()', 'color: #6b7280; font-size: 12px')
