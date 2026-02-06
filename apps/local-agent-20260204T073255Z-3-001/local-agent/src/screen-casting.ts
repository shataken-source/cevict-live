/**
 * Screen Casting Helper
 * Connects laptop to Samsung TV for display mirroring
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class ScreenCastingHelper {
  /**
   * Detect available displays and casting options
   */
  async detectDisplays(): Promise<any> {
    console.log('\n🖥️  DETECTING DISPLAYS...\n');
    
    try {
      // Check for connected displays on Windows
      const { stdout } = await execAsync('powershell -Command "Get-CimInstance -Namespace root\\wmi -ClassName WmiMonitorID | Select-Object -Property InstanceName"');
      
      console.log('Connected Displays:');
      console.log(stdout);
      
      return { displays: stdout };
    } catch (error: any) {
      console.error('Error detecting displays:', error.message);
      return { error: error.message };
    }
  }

  /**
   * Guide user through Samsung TV connection
   */
  async connectToSamsungTV(): Promise<string> {
    console.log('\n📺 SAMSUNG TV CONNECTION GUIDE\n');
    console.log('═'.repeat(60));
    
    const guide = `
🔵 OPTION 1: WIRELESS DISPLAY (MIRACAST) - RECOMMENDED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

On Your Samsung TV:
1. Press 'Source' button on remote
2. Select 'Screen Mirroring' or 'Smart View'
3. TV will wait for connection

On Your Laptop:
1. Press Windows + K (Connect shortcut)
2. Wait for your Samsung TV to appear in the list
3. Click on your TV name
4. Enter PIN if prompted (shown on TV)

✅ Your dashboard will now display on the TV!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔵 OPTION 2: HDMI CABLE (WIRED)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Connect HDMI cable from laptop to TV
2. Press Windows + P
3. Choose display mode:
   • Duplicate: Same content on both screens
   • Extend: TV as second monitor
   • Second screen only: TV only

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔵 OPTION 3: SAMSUNG SMART VIEW APP
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Download Samsung Smart View app on laptop
2. Make sure laptop and TV are on same WiFi network
3. Open Smart View app
4. Select your Samsung TV from list
5. Click 'Connect'

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔵 OPTION 4: BROWSER CASTING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

In Chrome/Edge browser:
1. Open trading dashboard (http://localhost:3011)
2. Click the three dots menu (⋮)
3. Click "Cast"
4. Select your Samsung TV
5. Choose "Cast tab" or "Cast desktop"

✅ Dashboard will cast to TV!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📱 BLUETOOTH AUDIO (Optional)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

If you want TV audio through Bluetooth:
1. Put TV in pairing mode (Settings > Sound > Audio Output)
2. On laptop: Settings > Bluetooth & devices
3. Click 'Add device' > 'Bluetooth'
4. Select your Samsung TV
5. Connect

Note: Bluetooth is for audio. For screen sharing, use Miracast/HDMI.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 BEST SETUP FOR TRADING DASHBOARD:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Recommended: Windows + P → "Extend"
• Laptop: Work on other tasks
• 75" TV: Full-screen trading dashboard
• Both displays active simultaneously

To make dashboard full-screen on TV:
1. Drag browser window to TV display
2. Press F11 for full-screen
3. Dashboard will fill entire 75" screen!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

TROUBLESHOOTING:
• TV not showing up? Make sure both devices on same WiFi
• Connection dropping? Use wired HDMI for stability
• Lag/delay? Reduce distance or use 5GHz WiFi

Let me know which option you want to use! I can provide more specific steps.
`;

    console.log(guide);
    return guide;
  }

  /**
   * Open Windows Connect panel
   */
  async openConnectPanel(): Promise<void> {
    console.log('\n🔌 Opening Windows Connect panel...\n');
    
    try {
      await execAsync('explorer.exe ms-settings:connecteddevices');
      console.log('✅ Connect panel opened! Look for your Samsung TV in the list.');
    } catch (error: any) {
      console.error('Error opening connect panel:', error.message);
    }
  }

  /**
   * Open display settings
   */
  async openDisplaySettings(): Promise<void> {
    console.log('\n🖥️  Opening Display settings...\n');
    
    try {
      await execAsync('control.exe desk.cpl');
      console.log('✅ Display settings opened!');
      console.log('   Click "Detect" to find your Samsung TV');
      console.log('   Then select display mode (Duplicate/Extend/Second screen only)');
    } catch (error: any) {
      console.error('Error opening display settings:', error.message);
    }
  }

  /**
   * Launch Smart View connection (if available)
   */
  async launchSmartView(): Promise<void> {
    console.log('\n📱 Attempting to launch Samsung Smart View...\n');
    
    try {
      // Try to find and launch Smart View app
      await execAsync('powershell -Command "Start-Process shell:AppsFolder\\(Get-AppxPackage -Name *Samsung*Smart* | Select-Object -ExpandProperty PackageFamilyName)!App"');
      console.log('✅ Smart View launched!');
    } catch (error: any) {
      console.log('⚠️  Smart View app not found.');
      console.log('   Download from: https://www.samsung.com/us/support/owners/app/smart-view');
    }
  }

  /**
   * Quick setup command
   */
  async quickSetup(): Promise<void> {
    console.log('\n🚀 QUICK SETUP FOR SAMSUNG TV\n');
    console.log('═'.repeat(60));
    
    console.log('\n1️⃣  Checking display connections...');
    await this.detectDisplays();
    
    console.log('\n2️⃣  Opening Windows project panel (Windows + K)...');
    try {
      // Simulate Windows + K
      await execAsync('powershell -Command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait(\'%{ESC}\'); Start-Sleep -Milliseconds 100; [System.Windows.Forms.SendKeys]::SendWait(\'^{k}\')"');
      console.log('✅ Project panel should be open now!');
      console.log('   → Look for your Samsung TV in the list');
      console.log('   → Click to connect');
    } catch (error: any) {
      console.log('⚠️  Automated panel opening failed.');
      console.log('   Please manually press: Windows Key + K');
    }
    
    console.log('\n3️⃣  Once connected, open trading dashboard:');
    console.log('   → Navigate to: http://localhost:3011');
    console.log('   → Press F11 for full-screen');
    console.log('   → Enjoy on 75" display! 🎉\n');
  }
}

export const screenCasting = new ScreenCastingHelper();

// CLI runner
if (import.meta.url === `file://${process.argv[1]}`) {
  const helper = new ScreenCastingHelper();
  
  console.log('📺 SAMSUNG TV SCREEN CASTING HELPER');
  console.log('   Connecting laptop to 75" Samsung TV\n');
  
  await helper.quickSetup();
}

