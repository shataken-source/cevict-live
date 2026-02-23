# Accu-Solar BMS Live Telemetry Setup
## ECO-Worthy 12V 280Ah LiFePO4 → Bluetooth → MQTT → Accu-Solar

---

## Overview

The ECO-Worthy 12V 280Ah LiFePO4 batteries use a **JBD BMS** (Battery Management System)
with a built-in BLE (Bluetooth Low Energy) module, exposed under the device name `DP04S007L4S200A`.

The bridge script (`eco_worthy_bridge.py`) connects to the BMS via BLE, reads live telemetry
every 5 seconds, and publishes it to a local MQTT broker. Accu-Solar subscribes to that broker
and displays real data in all tabs.

```
ECO-Worthy Battery (JBD BMS BLE)
        ↓  Bluetooth
  eco_worthy_bridge.py  (Python, runs on your PC)
        ↓  MQTT publish
  Mosquitto Broker  (localhost:1883)
        ↓  MQTT subscribe
  Accu-Solar  (Controls → AmpinVT MQTT)
```

---

## Hardware

| Item | Detail |
|---|---|
| Battery | ECO-Worthy 12V 280Ah LiFePO4 |
| BMS | JBD (internal, BLE built-in) |
| BLE Device Name | `DP04S007L4S200A` |
| BLE Protocol | JBD (0xDD frame, 0x77 terminator) |
| BLE Service UUID | `0000ff00-0000-1000-8000-00805f9b34fb` |
| TX Characteristic | `0000ff01-0000-1000-8000-00805f9b34fb` (notify) |
| RX Characteristic | `0000ff02-0000-1000-8000-00805f9b34fb` (write) |

---

## Prerequisites

- Windows 10/11 with Bluetooth adapter
- Python 3.8+ (tested on 3.14)
- Mosquitto MQTT broker

---

## One-Time Setup

### 1. Install Python Dependencies

```powershell
pip install bleak paho-mqtt
```

### 2. Install Mosquitto MQTT Broker

```powershell
winget install mosquitto
```

Mosquitto installs as a Windows service and starts automatically on boot.

Verify it's running:
```powershell
Get-Service mosquitto
```

### 3. Open Firewall for MQTT

Run in an **Administrator** PowerShell:
```powershell
New-NetFirewallRule -DisplayName "Mosquitto MQTT" -Direction Inbound -Protocol TCP -LocalPort 1883 -Action Allow
```

### 4. Scan for Your Batteries

```powershell
cd C:\cevict-live\apps\accu-solar\scripts
python eco_worthy_bridge.py scan
```

Expected output (8 batteries found):
```
A5:C2:37:3C:76:D2  RSSI  -45  DP04S007L4S200A   ← strongest signal, use this one
A5:C2:37:46:27:CC  RSSI  -46  DP04S007L4S200A
A5:C2:37:41:1D:E0  RSSI  -47  DP04S007L4S200A
...
```

Use the address with the **highest RSSI** (least negative = closest).

---

## Running the Bridge

```powershell
cd C:\cevict-live\apps\accu-solar\scripts
$env:BMS_ADDRESS = "A5:C2:37:3C:76:D2"
python eco_worthy_bridge.py
```

Expected output every ~10 seconds:
```
2026-02-22 13:05:57 INFO MQTT connected (rc=0)
2026-02-22 13:05:57 INFO Published → 13.45V | 9.93A | SoC 71% | 133.6W | Temp 9.0°C | Cycles 27
2026-02-22 13:06:07 INFO Published → 13.45V | 10.64A | SoC 71% | 143.1W | Temp 9.0°C | Cycles 27
```

### Environment Variables

| Variable | Default | Description |
|---|---|---|
| `BMS_ADDRESS` | (required) | BLE MAC address of the BMS |
| `MQTT_BROKER` | `localhost` | MQTT broker hostname or IP |
| `MQTT_PORT` | `1883` | MQTT broker port |
| `POLL_INTERVAL` | `5` | Seconds between reads |

---

## Connecting Accu-Solar

1. Open Accu-Solar at **http://localhost:3208**
2. Go to **Controls** tab
3. Select **AmpinVT MQTT**
4. Set Broker: `localhost`, Port: `1883`
5. Click **Save**
6. Live battery data appears in all tabs immediately

---

## MQTT Topics Published

| Topic | Example Value | Description |
|---|---|---|
| `accusolar/battery/voltage` | `13.45` | Pack voltage (V) |
| `accusolar/battery/current` | `9.93` | Current (A, negative = discharging) |
| `accusolar/battery/soc` | `71` | State of charge (%) |
| `accusolar/battery/power` | `133.6` | Power (W) |
| `accusolar/battery/temperature` | `9.0` | Avg temperature (°C) |
| `accusolar/battery/cycles` | `27` | Charge cycles |
| `accusolar/battery/capacity_remain` | `198.4` | Remaining capacity (Ah) |
| `accusolar/battery/capacity_full` | `280.0` | Full capacity (Ah) |
| `accusolar/battery/cells` | `[3.36, 3.36, ...]` | Individual cell voltages (V) |
| `accusolar/system/health` | `Normal` | Cell balance health |
| `accusolar/battery/status` | `{...}` | Full JSON snapshot |

Health levels based on cell voltage spread:
- `Normal` — spread < 50mV
- `Warning` — spread 50–100mV
- `Critical` — spread > 100mV

---

## Multiple Batteries

You have **8 batteries** all advertising BLE. The bridge connects to one at a time.
Each battery's BMS only allows one BLE connection simultaneously.

To monitor all 8, options:
1. **Rotate through them** — modify `POLL_INTERVAL` and cycle addresses (future enhancement)
2. **Raspberry Pi per battery** — each Pi runs the bridge for one battery, all publish to same broker
3. **RS485 bus** — wire all BMS units to a single RS485 adapter for aggregate data (most reliable)

---

## Auto-Start on Windows Boot

Create a scheduled task to run the bridge automatically:

```powershell
$action = New-ScheduledTaskAction -Execute "python.exe" `
    -Argument "C:\cevict-live\apps\accu-solar\scripts\eco_worthy_bridge.py" `
    -WorkingDirectory "C:\cevict-live\apps\accu-solar\scripts"

$trigger = New-ScheduledTaskTrigger -AtLogon

$settings = New-ScheduledTaskSettingsSet -RestartCount 10 -RestartInterval (New-TimeSpan -Minutes 1)

$env_vars = @(
    [System.Environment]::SetEnvironmentVariable("BMS_ADDRESS", "A5:C2:37:3C:76:D2", "Machine")
    [System.Environment]::SetEnvironmentVariable("MQTT_BROKER", "localhost", "Machine")
)

Register-ScheduledTask -TaskName "AccuSolar BMS Bridge" `
    -Action $action -Trigger $trigger -Settings $settings -RunLevel Highest
```

---

## Raspberry Pi — Buyer's Guide & Complete Setup

Use a Pi when your batteries are in a **garage, shed, or RV** beyond your PC's Bluetooth range (~10 feet).
The Pi sits next to the batteries, reads BLE, and forwards data over WiFi to your MQTT broker on the PC.

---

### Which Pi to Buy

| Model | Price | RAM | BLE | WiFi | Best For |
|---|---|---|---|---|---|
| **Pi Zero 2W** ⭐ | ~$15 | 512MB | ✅ Built-in | ✅ Built-in | This use case — tiny, low power, perfect |
| Pi 3A+ | ~$25 | 512MB | ✅ Built-in | ✅ Built-in | If Zero 2W is out of stock |
| Pi 4B (2GB) | ~$45 | 2GB | ✅ Built-in | ✅ Built-in | Overkill for BMS bridge, but works |
| Pi Zero W (v1) | ~$10 | 512MB | ✅ Built-in | ✅ Built-in | Works but single-core, slower |
| Pi Zero (no W) | ~$5 | 512MB | ❌ None | ❌ None | **Do not buy** — no BLE or WiFi |

**Recommendation: Pi Zero 2W.** Quad-core, built-in BLE + WiFi, draws only 0.4W idle.
One per battery bank if you want to monitor all 8 independently.

---

### Where to Buy

- **rpilocator.com** — real-time stock tracker across all US retailers (best starting point)
- **Adafruit** — https://www.adafruit.com/product/5291 — reliable, ships fast
- **Vilros** — https://vilros.com — often has kits with SD card + power supply included
- **PiShop.us** — https://www.pishop.us
- **Amazon** — search "Raspberry Pi Zero 2W" — verify it's the 2W not the original Zero W

> **Note:** Pi Zero 2W was hard to find in 2022–2023 but is widely available as of 2025.

---

### What to Buy (Complete Kit)

| Item | Notes | Approx Cost |
|---|---|---|
| Raspberry Pi Zero 2W | The board itself | $15 |
| MicroSD card 16GB+ | Samsung Endurance or SanDisk — avoid cheap no-name | $8 |
| Micro USB power supply 5V 2.5A | Official Pi supply or any quality phone charger | $8 |
| Micro USB to USB-A adapter | Only needed if you want to plug in a keyboard initially | $3 |
| Mini HDMI to HDMI adapter | Only needed for monitor — not required for headless setup | $5 |
| **Total (headless setup)** | No keyboard/monitor needed | **~$31** |

---

### Step 1 — Flash the OS (Headless, No Monitor Needed)

1. Download **Raspberry Pi Imager**: https://www.raspberrypi.com/software/
2. Insert microSD card into your PC
3. Open Imager → **Choose Device** → `Raspberry Pi Zero 2W`
4. **Choose OS** → `Raspberry Pi OS (other)` → `Raspberry Pi OS Lite (64-bit)`
   - "Lite" = no desktop, command line only — perfect for this
5. **Choose Storage** → select your SD card
6. Click the **gear icon ⚙** (or "Edit Settings") before writing:

   | Setting | Value |
   |---|---|
   | Hostname | `bms-bridge` |
   | Enable SSH | ✅ Use password authentication |
   | Username | `pi` |
   | Password | (set something you'll remember) |
   | WiFi SSID | Your home WiFi name |
   | WiFi Password | Your home WiFi password |
   | WiFi Country | US |
   | Locale | Set your timezone |

7. Click **Save** → **Write** → confirm → wait ~3 minutes
8. Eject SD card → insert into Pi → plug in power

---

### Step 2 — First Boot & SSH

Wait **60–90 seconds** for first boot, then from your PC:

```powershell
ssh pi@bms-bridge.local
```

If `bms-bridge.local` doesn't resolve (common on some routers):
```powershell
# Find the Pi's IP from your router's device list, then:
ssh pi@192.168.x.xxx
```

Accept the fingerprint prompt → enter your password → you're in.

---

### Step 3 — Update & Install Dependencies

```bash
sudo apt update && sudo apt full-upgrade -y
sudo apt install -y python3-pip python3-venv bluetooth bluez
sudo systemctl enable bluetooth
sudo systemctl start bluetooth

# Create isolated Python environment
python3 -m venv ~/bms-env
source ~/bms-env/bin/activate
pip install bleak paho-mqtt
```

Add yourself to the bluetooth group (avoids needing sudo for BLE):
```bash
sudo usermod -a -G bluetooth pi
# Log out and back in for this to take effect:
exit
ssh pi@bms-bridge.local
```

---

### Step 4 — Copy the Bridge Script

From your **PC** (PowerShell):
```powershell
scp C:\cevict-live\apps\accu-solar\scripts\eco_worthy_bridge.py pi@bms-bridge.local:/home/pi/
```

---

### Step 5 — Scan for Batteries

```bash
source ~/bms-env/bin/activate
python3 eco_worthy_bridge.py scan
```

Expected output:
```
A5:C2:37:3C:76:D2  RSSI  -38  DP04S007L4S200A   ← much stronger from 2 feet away
A5:C2:37:46:27:CC  RSSI  -42  DP04S007L4S200A
...
```

RSSI will be much stronger from the Pi (sitting next to batteries) than from your PC.

---

### Step 6 — Test the Bridge

```bash
source ~/bms-env/bin/activate
export BMS_ADDRESS="A5:C2:37:3C:76:D2"
export MQTT_BROKER="192.168.8.152"    # your PC's IP (where Mosquitto runs)
export MQTT_PORT="1883"
python3 eco_worthy_bridge.py
```

You should see:
```
INFO MQTT connected (rc=0)
INFO Published → 13.45V | 9.93A | SoC 71% | 133.6W | Temp 9.0°C | Cycles 27
```

---

### Step 7 — Auto-Start on Boot (systemd)

```bash
sudo nano /etc/systemd/system/bms-bridge.service
```

Paste this (update `BMS_ADDRESS` and `MQTT_BROKER` for your setup):

```ini
[Unit]
Description=ECO-Worthy BMS → MQTT Bridge
After=network.target bluetooth.target
Wants=bluetooth.target

[Service]
User=pi
WorkingDirectory=/home/pi
Environment="BMS_ADDRESS=A5:C2:37:3C:76:D2"
Environment="MQTT_BROKER=192.168.8.152"
Environment="MQTT_PORT=1883"
Environment="POLL_INTERVAL=5"
ExecStart=/home/pi/bms-env/bin/python3 /home/pi/eco_worthy_bridge.py
Restart=always
RestartSec=15
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

Save (`Ctrl+X` → `Y` → Enter), then enable:

```bash
sudo systemctl daemon-reload
sudo systemctl enable bms-bridge
sudo systemctl start bms-bridge
```

Check it's running:
```bash
sudo systemctl status bms-bridge
```

Expected:
```
● bms-bridge.service - ECO-Worthy BMS → MQTT Bridge
     Loaded: loaded (/etc/systemd/system/bms-bridge.service; enabled)
     Active: active (running) since ...
```

View live logs:
```bash
journalctl -u bms-bridge -f
```

---

### Step 8 — Verify from PC

On your PC, confirm MQTT messages are arriving:
```powershell
# Install mosquitto clients if not already present
# Then subscribe to all accusolar topics:
mosquitto_sub -h localhost -t "accusolar/#" -v
```

You should see a stream of values every 5 seconds.

---

### Pi Power Consumption

| State | Draw |
|---|---|
| Pi Zero 2W idle | ~0.4W |
| Pi Zero 2W running bridge | ~0.8W |
| Per day | ~20Wh |
| Per month | ~0.6 kWh |

Negligible — less than a night light. Can be powered from a small USB port on your inverter or a $10 USB wall adapter.

---

### Multiple Batteries — One Pi Per Battery

You have 8 batteries. To monitor all 8 independently:

```
Battery 1 (A5:C2:37:3C:76:D2) → Pi #1 → MQTT topic: accusolar/battery/1/...
Battery 2 (A5:C2:37:46:27:CC) → Pi #2 → MQTT topic: accusolar/battery/2/...
...
```

Each Pi runs the same `eco_worthy_bridge.py` with a different `BMS_ADDRESS` and topic prefix.
All publish to the same Mosquitto broker on your PC.

**Cost for 8 Pis:** ~$120 total — reasonable for a full battery bank monitoring system.

Alternatively, a **single Pi can poll all 8 in sequence** — I can add that to the bridge script
when you're ready (connects to each BMS one at a time, ~10s per battery, full cycle ~80s).

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `Characteristic not found` | Wrong UUIDs — run `discover_uuids.py` to confirm |
| `BLE read timeout` | Pair battery in Windows Bluetooth settings first |
| `MQTT connection refused` | Run `Get-Service mosquitto` — start if stopped |
| `No devices in scan` | Move PC within 10 feet of battery, retry |
| BLE permission error (Pi) | `sudo usermod -a -G bluetooth pi` then reboot |
| Pi can't reach PC MQTT | Ping `192.168.8.152` from Pi — check same WiFi |
| Port 1883 blocked | Add firewall rule (see setup step 3) |

---

## Scripts Reference

| Script | Usage |
|---|---|
| `eco_worthy_bridge.py` | Main bridge — BLE → MQTT |
| `eco_worthy_bridge.py scan` | Scan for nearby BLE devices |
| `discover_uuids.py AA:BB:CC:DD:EE:FF` | Dump all BLE services/characteristics |
| `setup-bms-bridge.ps1` | Full automated setup wizard |
| `setup-bms-bridge.ps1 -Scan` | Just scan |
| `setup-bms-bridge.ps1 -Run` | Just run bridge |

---

## Live Data Confirmed

First successful reading — Feb 22, 2026:
```
13.45V | 9.93A | SoC 71% | 133.6W | Temp 9.0°C | Cycles 27
```

Battery address: `A5:C2:37:3C:76:D2` (strongest of 8 units)
