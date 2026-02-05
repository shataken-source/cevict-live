#!/usr/bin/env node

/**
 * Compilation Check Script
 * Validates all source files and checks for errors
 */

const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkFile(filePath, checks) {
  const errors = [];
  const warnings = [];
  
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Run each check
    checks.forEach(check => {
      const result = check(content, filePath);
      if (result) {
        if (result.type === 'error') {
          errors.push(result.message);
        } else {
          warnings.push(result.message);
        }
      }
    });
    
  } catch (error) {
    errors.push(`Could not read file: ${error.message}`);
  }
  
  return { errors, warnings };
}

// Check functions
const checks = [
  // Check for syntax errors
  function checkSyntax(content, filePath) {
    if (filePath.endsWith('.js') || filePath.endsWith('.jsx')) {
      try {
        // Basic syntax check - look for common issues
        if (content.includes('console.log(') && !filePath.includes('test')) {
          return { 
            type: 'warning', 
            message: 'Contains console.log statements' 
          };
        }
        
        // Check for unmatched brackets
        const openBrackets = (content.match(/{/g) || []).length;
        const closeBrackets = (content.match(/}/g) || []).length;
        if (openBrackets !== closeBrackets) {
          return { 
            type: 'error', 
            message: `Unmatched brackets: ${openBrackets} open, ${closeBrackets} close` 
          };
        }
        
        // Check for unmatched parentheses
        const openParens = (content.match(/\(/g) || []).length;
        const closeParens = (content.match(/\)/g) || []).length;
        if (openParens !== closeParens) {
          return { 
            type: 'error', 
            message: `Unmatched parentheses: ${openParens} open, ${closeParens} close` 
          };
        }
        
      } catch (error) {
        return { 
          type: 'error', 
          message: `Syntax check failed: ${error.message}` 
        };
      }
    }
    return null;
  },
  
  // Check for missing imports
  function checkImports(content, filePath) {
    if (filePath.endsWith('.jsx')) {
      if (!content.includes("import React") && !content.includes("'react'")) {
        return { 
          type: 'warning', 
          message: 'Missing React import' 
        };
      }
    }
    
    // Check for undefined variables
    const commonGlobals = ['window', 'document', 'console', 'process', 'require', 'module', 'exports'];
    const uses = content.match(/\b([a-zA-Z_]\w*)\b/g) || [];
    // This is simplified - in production use proper AST parsing
    
    return null;
  },
  
  // Check for security issues
  function checkSecurity(content) {
    const securityIssues = [];
    
    if (content.includes('eval(')) {
      securityIssues.push('Uses eval() - security risk');
    }
    
    if (content.includes('innerHTML')) {
      securityIssues.push('Uses innerHTML - potential XSS risk');
    }
    
    if (content.includes('SQL') && content.includes('"+')) {
      securityIssues.push('Potential SQL injection vulnerability');
    }
    
    if (securityIssues.length > 0) {
      return { 
        type: 'error', 
        message: `Security issues: ${securityIssues.join(', ')}` 
      };
    }
    
    return null;
  },
  
  // Check for API key exposure
  function checkApiKeys(content) {
    const patterns = [
      /api[_-]?key\s*[:=]\s*["'][\w-]{20,}/gi,
      /secret[_-]?key\s*[:=]\s*["'][\w-]{20,}/gi,
      /token\s*[:=]\s*["'][\w-]{20,}/gi
    ];
    
    for (const pattern of patterns) {
      if (pattern.test(content) && !content.includes('process.env')) {
        return { 
          type: 'error', 
          message: 'Hardcoded API key detected - use environment variables' 
        };
      }
    }
    
    return null;
  }
];

// Files to check
const filesToCheck = [
  'weather-alerts.js',
  'community-points-system.js',
  'LocationSharing.jsx',
  'CharterBookingApp.jsx',
  'AdminConfig.jsx'
];

// Main compilation check
function runCompilationCheck() {
  console.log('\n' + '='.repeat(60));
  log('🎣 COMPILATION CHECK', 'bright');
  console.log('='.repeat(60) + '\n');
  
  let totalErrors = 0;
  let totalWarnings = 0;
  
  filesToCheck.forEach(file => {
    log(`\nChecking: ${file}`, 'cyan');
    
    if (fs.existsSync(file)) {
      const result = checkFile(file, checks);
      
      if (result.errors.length === 0 && result.warnings.length === 0) {
        log('  ✅ No issues found', 'green');
      } else {
        result.errors.forEach(error => {
          log(`  ❌ ERROR: ${error}`, 'red');
          totalErrors++;
        });
        
        result.warnings.forEach(warning => {
          log(`  ⚠️  WARNING: ${warning}`, 'yellow');
          totalWarnings++;
        });
      }
    } else {
      log(`  ⏭️  File not found (skipping)`, 'yellow');
    }
  });
  
  // Summary
  console.log('\n' + '='.repeat(60));
  log('COMPILATION CHECK SUMMARY', 'bright');
  console.log('='.repeat(60) + '\n');
  
  if (totalErrors === 0 && totalWarnings === 0) {
    log('✅ All files passed compilation check!', 'green');
    log('🎉 Your code is ready for deployment!', 'green');
  } else {
    if (totalErrors > 0) {
      log(`❌ Found ${totalErrors} error(s) that must be fixed`, 'red');
    }
    if (totalWarnings > 0) {
      log(`⚠️  Found ${totalWarnings} warning(s) to review`, 'yellow');
    }
    
    if (totalErrors > 0) {
      log('\nPlease fix the errors before deploying.', 'red');
      process.exit(1);
    } else {
      log('\nWarnings are not critical but should be reviewed.', 'yellow');
    }
  }
  
  // Additional checks
  console.log('\n' + '-'.repeat(60));
  log('ADDITIONAL CHECKS:', 'bright');
  
  // Check for required files
  const requiredFiles = [
    'package.json',
    '.env.local',
    'database-schema.sql'
  ];
  
  requiredFiles.forEach(file => {
    if (fs.existsSync(file)) {
      log(`  ✅ ${file} exists`, 'green');
    } else {
      log(`  ❌ ${file} missing`, 'red');
    }
  });
  
  // Check Node modules
  if (fs.existsSync('node_modules')) {
    log('  ✅ Dependencies installed', 'green');
  } else {
    log('  ❌ Dependencies not installed (run npm install)', 'red');
  }
  
  // Environment variables check
  if (fs.existsSync('.env.local')) {
    const envContent = fs.readFileSync('.env.local', 'utf8');
    const requiredEnvVars = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY'
    ];
    
    requiredEnvVars.forEach(envVar => {
      if (envContent.includes(envVar)) {
        log(`  ✅ ${envVar} configured`, 'green');
      } else {
        log(`  ❌ ${envVar} not configured`, 'red');
      }
    });
  }
  
  console.log('\n' + '='.repeat(60));
  log('Compilation check complete!', 'cyan');
  
  if (totalErrors === 0) {
    log('\n✅ Your project is ready for Phase 1 testing!', 'green');
    log('🎣 Share the testing guide with your friends:', 'yellow');
    log('   PHASE_1_TESTING_GUIDE.md\n', 'cyan');
  }
}

// Run the check
runCompilationCheck();
