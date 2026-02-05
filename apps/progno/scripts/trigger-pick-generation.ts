/**
 * Trigger pick generation by calling the cron endpoint locally
 */

async function main() {
  console.log('\n╔══════════════════════════════════════════════╗')
  console.log('║   📊 TRIGGERING PICK GENERATION   ║')
  console.log('╚══════════════════════════════════════════════╝\n')

  const port = process.env.PORT || 3008
  const url = `http://localhost:${port}/api/cron/generate-picks`

  console.log(`🌐 Calling: ${url}\n`)

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.CRON_SECRET || 'progno-cron-secret-2025'}`
      }
    })

    const data = await response.json()

    if (response.ok && data.success) {
      console.log('✅ SUCCESS!\n')
      console.log(`📊 Total Picks: ${data.summary?.total || data.picks?.length || 0}`)
      console.log(`🆓 Free Tier:   ${data.summary?.free || 0}`)
      console.log(`💎 Pro Tier:    ${data.summary?.pro || 0}`)
      console.log(`⭐ Elite Tier:  ${data.summary?.elite || 0}`)
      console.log(`\n📅 Timestamp: ${data.timestamp}`)

      if (data.message) {
        console.log(`\n💬 Message: ${data.message}`)
      }
    } else {
      console.log('❌ FAILED!')
      console.log(`Error: ${data.error || data.message || 'Unknown error'}`)
    }
  } catch (error: any) {
    console.log('❌ FAILED!')
    console.log(`Error: ${error.message}`)
    console.log('\n⚠️ Make sure the dev server is running:')
    console.log('   npm run dev')
  }

  console.log('\n')
}

main()

