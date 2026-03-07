"""
ECO-Worthy 12V 280Ah LiFePO4 → MQTT Bridge
Reads JBD BMS via BLE, publishes to MQTT for Accu-Solar

Install:  pip install bleak paho-mqtt
Usage:    python eco_worthy_bridge.py

If BMS_ADDRESS is not set:
  - On Windows: tries paired Bluetooth devices first (no scan). Connects to each
    and uses the first that has the JBD BMS service.
  - If no paired BMS found (or not Windows): scans for devices and picks the
    best BMS-like one by RSSI.

Env vars:
  BMS_ADDRESS=AA:BB:CC:DD:EE:FF   (optional; auto from paired or scan)
  MQTT_BROKER=192.168.1.100
  MQTT_PORT=1883
"""

import asyncio
import json
import os
import time
import struct
import logging
import urllib.request
import urllib.error
from datetime import datetime, timezone

try:
    from bleak import BleakClient, BleakScanner
    import paho.mqtt.client as mqtt
    from paho.mqtt.client import CallbackAPIVersion
except ImportError:
    print("Missing deps. Run: pip install bleak paho-mqtt")
    exit(1)

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("eco-worthy-bridge")

# ── Config ────────────────────────────────────────────────────────────────────
BMS_ADDRESS   = os.getenv("BMS_ADDRESS", "")          # Set this! e.g. "AA:BB:CC:DD:EE:FF"
MQTT_BROKER   = os.getenv("MQTT_BROKER", "localhost")
MQTT_PORT     = int(os.getenv("MQTT_PORT", "1883"))
POLL_INTERVAL = int(os.getenv("POLL_INTERVAL", "5"))  # seconds
# HTTP ingest endpoint (optional — sends data to Accu-Solar API for remote/Vercel access)
HTTP_INGEST_URL = os.getenv("HTTP_INGEST_URL", "http://localhost:3208/api/telemetry/ingest")
HTTP_INGEST_SECRET = os.getenv("HTTP_INGEST_SECRET", "")  # matches TELEMETRY_SECRET env var

# JBD BMS BLE UUIDs (confirmed via discover_uuids.py on DP04S007L4S200A)
BMS_SERVICE = "0000ff00-0000-1000-8000-00805f9b34fb"
BMS_TX_CHAR = "0000ff01-0000-1000-8000-00805f9b34fb"  # notify — data comes here
BMS_RX_CHAR = "0000ff02-0000-1000-8000-00805f9b34fb"  # write  — send commands here

# JBD command bytes (confirmed: ff02 read value showed JBD frame 0xDD,0xA5...)
CMD_BASIC_INFO = bytes([0xDD, 0xA5, 0x03, 0x00, 0xFF, 0xFD, 0x77])
CMD_CELL_INFO  = bytes([0xDD, 0xA5, 0x04, 0x00, 0xFF, 0xFC, 0x77])

# MQTT topics (matches Accu-Solar AmpinVT topics)
TOPICS = {
    "battery_voltage":  "accusolar/battery/voltage",
    "battery_current":  "accusolar/battery/current",
    "battery_soc":      "accusolar/battery/soc",
    "battery_power":    "accusolar/battery/power",
    "cell_voltages":    "accusolar/battery/cells",
    "temperature":      "accusolar/battery/temperature",
    "cycles":           "accusolar/battery/cycles",
    "capacity_remain":  "accusolar/battery/capacity_remain",
    "capacity_full":    "accusolar/battery/capacity_full",
    "status":           "accusolar/battery/status",
    "health":           "accusolar/system/health",
}

# ── JBD BMS Parser ───────────────────────────────────────────────────────────
def parse_basic_info(data: bytes) -> dict | None:
    """Parse JBD 0x03 basic info response."""
    if len(data) < 27 or data[0] != 0xDD or data[1] != 0x03:
        log.debug(f"parse_basic_info: bad header {data[:4].hex() if data else 'empty'}")
        return None
    try:
        voltage_raw = struct.unpack_from(">H", data, 4)[0]
        current_raw = struct.unpack_from(">h", data, 6)[0]  # signed
        remain_raw  = struct.unpack_from(">H", data, 8)[0]
        full_raw    = struct.unpack_from(">H", data, 10)[0]
        cycles      = struct.unpack_from(">H", data, 12)[0]
        soc         = data[23]
        num_temps   = data[26]

        voltage = voltage_raw / 100.0
        current = current_raw / 100.0
        remain  = remain_raw  / 100.0
        full    = full_raw    / 100.0
        power   = round(voltage * current, 1)

        temps = []
        for i in range(num_temps):
            raw = struct.unpack_from(">H", data, 27 + i * 2)[0]
            temps.append(round((raw - 2731) / 10.0, 1))

        return {
            "voltage":          round(voltage, 2),
            "current":          round(current, 2),
            "soc":              soc,
            "power":            power,
            "capacity_remain":  round(remain, 2),
            "capacity_full":    round(full, 2),
            "cycles":           cycles,
            "temperatures":     temps,
            "temp_avg":         round(sum(temps) / len(temps), 1) if temps else 25.0,
        }
    except Exception as e:
        log.warning(f"parse_basic_info error: {e}")
        return None


def parse_cell_info(data: bytes) -> list[float] | None:
    """Parse JBD 0x04 cell voltages response."""
    if len(data) < 6 or data[0] != 0xDD or data[1] != 0x04:
        return None
    try:
        num_cells = data[3] // 2
        cells = []
        for i in range(num_cells):
            raw = struct.unpack_from(">H", data, 4 + i * 2)[0]
            cells.append(round(raw / 1000.0, 3))
        return cells if cells else None
    except Exception as e:
        log.warning(f"parse_cell_info error: {e}")
        return None


# ── BLE Reader ────────────────────────────────────────────────────────────────
class JBDBmsReader:
    def __init__(self, address: str):
        self.address = address
        self._response_buf = bytearray()
        self._response_event = asyncio.Event()
        self._last_response = bytearray()

    def _on_notify(self, _sender, data: bytearray):
        self._response_buf.extend(data)
        # JBD frames end with 0x77
        if 0x77 in self._response_buf:
            idx = self._response_buf.index(0x77)
            self._last_response = bytearray(self._response_buf[:idx + 1])
            self._response_buf = self._response_buf[idx + 1:]
            self._response_event.set()

    async def read_register(self, client: BleakClient, cmd: bytes, timeout: float = 8.0) -> bytes:
        self._response_event.clear()
        self._response_buf.clear()
        log.debug(f"→ CMD: {cmd.hex()}")
        try:
            await client.write_gatt_char(BMS_RX_CHAR, cmd, response=True)
        except Exception:
            await client.write_gatt_char(BMS_RX_CHAR, cmd, response=False)
        try:
            await asyncio.wait_for(self._response_event.wait(), timeout)
        except asyncio.TimeoutError:
            log.warning(f"BLE read timeout — buf so far: {self._response_buf.hex() if self._response_buf else 'empty'}")
            return b""
        return bytes(self._last_response)

    async def poll(self) -> dict:
        async with BleakClient(self.address, timeout=20.0) as client:
            log.debug(f"Connected, pairing...")
            try:
                await client.pair()
            except Exception:
                pass  # pairing optional, continue anyway
            await asyncio.sleep(0.5)  # settle after connect
            await client.start_notify(BMS_TX_CHAR, self._on_notify)
            await asyncio.sleep(0.3)  # settle after subscribe
            basic_raw = await self.read_register(client, CMD_BASIC_INFO)
            cell_raw  = await self.read_register(client, CMD_CELL_INFO)
            await client.stop_notify(BMS_TX_CHAR)

        basic = parse_basic_info(basic_raw) if basic_raw else None
        cells = parse_cell_info(cell_raw)   if cell_raw  else None
        return {"basic": basic, "cells": cells}


# ── MQTT Publisher ────────────────────────────────────────────────────────────
def make_mqtt_client() -> mqtt.Client:
    client = mqtt.Client(CallbackAPIVersion.VERSION2, client_id="accu-solar-bms-bridge")
    client.on_connect = lambda c, u, f, rc, props=None: log.info(f"MQTT connected (rc={rc})")
    client.on_disconnect = lambda c, u, dc, rc=None, props=None: log.warning(f"MQTT disconnected (rc={rc})")
    client.connect(MQTT_BROKER, MQTT_PORT, keepalive=60)
    client.loop_start()
    return client


def publish(client: mqtt.Client, basic: dict, cells: list[float] | None):
    def pub(topic: str, value):
        client.publish(topic, str(value), retain=True)

    pub(TOPICS["battery_voltage"],  basic["voltage"])
    pub(TOPICS["battery_current"],  basic["current"])
    pub(TOPICS["battery_soc"],      basic["soc"])
    pub(TOPICS["battery_power"],    basic["power"])
    pub(TOPICS["temperature"],      basic["temp_avg"])
    pub(TOPICS["cycles"],           basic["cycles"])
    pub(TOPICS["capacity_remain"],  basic["capacity_remain"])
    pub(TOPICS["capacity_full"],    basic["capacity_full"])

    if cells:
        pub(TOPICS["cell_voltages"], json.dumps(cells))
        spread = round(max(cells) - min(cells), 3)
        health = "Critical" if spread > 0.1 else "Warning" if spread > 0.05 else "Normal"
        pub(TOPICS["health"], health)

    status = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "voltage":   basic["voltage"],
        "current":   basic["current"],
        "soc":       basic["soc"],
        "power":     basic["power"],
        "temp":      basic["temp_avg"],
        "cycles":    basic["cycles"],
        "cells":     cells,
    }
    client.publish(TOPICS["status"], json.dumps(status), retain=True)

    log.info(
        f"Published → {basic['voltage']}V | {basic['current']}A | "
        f"SoC {basic['soc']}% | {basic['power']}W | "
        f"Temp {basic['temp_avg']}°C | Cycles {basic['cycles']}"
    )


def publish_http(basic: dict, cells: list[float] | None):
    """POST telemetry to the Accu-Solar HTTP API for remote/Vercel access."""
    if not HTTP_INGEST_URL:
        return
    try:
        payload = {
            "voltage":         basic["voltage"],
            "current":         basic["current"],
            "soc":             basic["soc"],
            "power":           basic["power"],
            "temperature":     basic["temp_avg"],
            "cycles":          basic["cycles"],
            "capacity_remain": basic["capacity_remain"],
            "capacity_full":   basic["capacity_full"],
            "cells":           cells,
            "health":          "Normal",
            "timestamp":       datetime.now(timezone.utc).isoformat(),
        }
        if cells:
            spread = round(max(cells) - min(cells), 3)
            payload["health"] = "Critical" if spread > 0.1 else "Warning" if spread > 0.05 else "Normal"

        data = json.dumps(payload).encode("utf-8")
        headers = {"Content-Type": "application/json"}
        if HTTP_INGEST_SECRET:
            headers["Authorization"] = f"Bearer {HTTP_INGEST_SECRET}"

        req = urllib.request.Request(HTTP_INGEST_URL, data=data, headers=headers, method="POST")
        with urllib.request.urlopen(req, timeout=5) as resp:
            if resp.status == 200:
                log.debug("HTTP ingest OK")
            else:
                log.warning(f"HTTP ingest status {resp.status}")
    except urllib.error.URLError as e:
        log.debug(f"HTTP ingest failed (non-fatal): {e.reason}")
    except Exception as e:
        log.debug(f"HTTP ingest error (non-fatal): {e}")


# ── Scanner ───────────────────────────────────────────────────────────────────
BMS_NAME_HINTS = ("JBD", "xiaoxiang", "ECO", "BMS", "DP04", "Daly", "JK ")

def _is_likely_bms(device, adv) -> bool:
    name = (device.name or getattr(adv, "local_name", None) or "").upper()
    for hint in BMS_NAME_HINTS:
        if hint.upper() in name:
            return True
    service_uuids = getattr(adv, "service_uuids", set()) or set()
    if service_uuids and BMS_SERVICE.lower() in {str(u).lower() for u in service_uuids}:
        return True
    return False


async def scan_for_bms() -> list[tuple[str, int, str]]:
    """Scan for BLE devices; return list of (address, rssi, name) for BMS-like devices, best RSSI first."""
    log.info("Scanning for BLE devices (10s)...")
    results: list = []

    def callback(device, adv_data):
        results.append((device, adv_data))

    async with BleakScanner(detection_callback=callback):
        await asyncio.sleep(10.0)

    seen: dict = {}
    for device, adv in results:
        rssi = adv.rssi if adv.rssi is not None else -999
        if device.address not in seen or rssi > seen[device.address][1]:
            seen[device.address] = (device, rssi, adv)

    bms_candidates = []
    for addr, (dev, rssi, adv) in seen.items():
        name = dev.name or getattr(adv, "local_name", None) or "(unknown)"
        if _is_likely_bms(dev, adv):
            bms_candidates.append((addr, rssi, name))
    if not bms_candidates:
        bms_candidates = [(addr, rssi, dev.name or getattr(adv, "local_name", None) or "(unknown)")
                          for addr, (dev, rssi, adv) in seen.items()]
    bms_candidates.sort(key=lambda x: x[1], reverse=True)

    all_sorted = sorted(seen.items(), key=lambda x: x[1][1], reverse=True)
    log.info(f"Found {len(seen)} devices total, {len(bms_candidates)} BMS-like:")
    for addr, (dev, rssi, adv) in all_sorted[:20]:
        name = dev.name or getattr(adv, "local_name", None) or "(unknown)"
        mark = " *" if addr in [c[0] for c in bms_candidates] else ""
        log.info(f"  {addr}  RSSI {rssi:4d}  {name}{mark}")
    if not bms_candidates:
        log.info("Look for: JBD, xiaoxiang, ECO, BMS, or DP04 devices near your battery.")
    return bms_candidates


async def scan_and_pick_best() -> str | None:
    """Run scan and return the best BMS address (highest RSSI), or None."""
    candidates = await scan_for_bms()
    if not candidates:
        return None
    return candidates[0][0]


# ── Paired devices (Windows) ───────────────────────────────────────────────────
def get_paired_ble_addresses() -> list[tuple[str, str]]:
    """Return list of (address, name) for paired Bluetooth devices. Windows only."""
    if os.name != "nt":
        return []
    try:
        import winreg
        key_path = r"SYSTEM\CurrentControlSet\Services\BTHPORT\Parameters\Devices"
        key = winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, key_path)
        result = []
        for i in range(winreg.QueryInfoKey(key)[0]):
            raw_addr = winreg.EnumKey(key, i)
            if len(raw_addr) != 12 or not all(c in "0123456789ABCDEFabcdef" for c in raw_addr):
                continue
            addr = ":".join([raw_addr[j : j + 2].upper() for j in range(0, 12, 2)])
            name = ""
            try:
                dev_key = winreg.OpenKey(key, raw_addr)
                name_val, _ = winreg.QueryValueEx(dev_key, "Name")
                winreg.CloseKey(dev_key)
                if isinstance(name_val, bytes):
                    name = name_val.decode("utf-16-le", errors="ignore").strip("\x00") or "(unknown)"
                elif isinstance(name_val, str):
                    name = name_val or "(unknown)"
            except (OSError, TypeError):
                name = "(unknown)"
            result.append((addr, name))
        winreg.CloseKey(key)
        return result
    except Exception as e:
        log.debug(f"Could not read paired devices from registry: {e}")
        return []


async def device_has_jbd_service(address: str) -> bool:
    """Connect to address and return True if the JBD BMS service is present."""
    try:
        async with BleakClient(address, timeout=8.0) as client:
            await client.get_services()
            for s in client.services:
                if s.uuid and BMS_SERVICE.lower() in str(s.uuid).lower():
                    return True
            return False
    except Exception:
        return False


async def try_paired_first() -> str | None:
    """If Windows: get paired devices, try each that looks like a BMS until one has JBD service. Return address or None."""
    paired = get_paired_ble_addresses()
    if not paired:
        return None
    log.info(f"Found {len(paired)} paired Bluetooth device(s) — trying those first (no scan)...")
    # Prefer devices with BMS-like names
    def bms_rank(item: tuple[str, str]) -> tuple[int, str]:
        addr, name = item
        name_upper = name.upper()
        for hint in BMS_NAME_HINTS:
            if hint.upper() in name_upper:
                return (0, addr)
        return (1, addr)
    paired_sorted = sorted(paired, key=bms_rank)
    for addr, name in paired_sorted:
        log.info(f"  Trying paired: {addr}  ({name})...")
        if await device_has_jbd_service(addr):
            log.info(f"  ✓ {addr} has JBD BMS service — using it.")
            return addr
    log.info("  No paired device had JBD BMS service — will scan if needed.")
    return None


# ── Main Loop ─────────────────────────────────────────────────────────────────
AUTO_SCAN_AFTER_FAILURES = 3  # After this many BLE failures, auto-scan and try best device

async def main():
    current_address = BMS_ADDRESS
    if not current_address:
        # Prefer paired devices (Windows): try them first, no scan
        current_address = await try_paired_first()
        if not current_address:
            log.info("No paired BMS found (or not Windows) — scanning for devices...")
            current_address = await scan_and_pick_best()
        if not current_address:
            log.error("No BLE devices found. Run with battery on and in range:")
            log.error("  python eco_worthy_bridge.py scan")
            return
        log.info(f"Auto-selected: {current_address}")
        log.info(f"  To use this device next time: $env:BMS_ADDRESS = \"{current_address}\"  (PowerShell)")

    log.info(f"Connecting to BMS at {current_address}")
    log.info(f"Publishing to MQTT {MQTT_BROKER}:{MQTT_PORT} every {POLL_INTERVAL}s")

    mqtt_client = make_mqtt_client()
    reader = JBDBmsReader(current_address)
    fail_count = 0

    while True:
        try:
            result = await reader.poll()
            basic = result.get("basic")
            cells = result.get("cells")

            if basic:
                publish(mqtt_client, basic, cells)
                publish_http(basic, cells)
                fail_count = 0
            else:
                log.warning("Empty BMS response — retrying next cycle")
                fail_count += 1

        except Exception as e:
            fail_count += 1
            log.error(f"BLE error (attempt {fail_count}): {e}")

            if fail_count == AUTO_SCAN_AFTER_FAILURES:
                log.info("Auto-scanning for BMS (device may have moved or re-advertised)...")
                try:
                    new_address = await scan_and_pick_best()
                    if new_address and new_address != current_address:
                        log.info(f"Switching to {new_address} (was {current_address})")
                        log.info(f"  To use this device next time: $env:BMS_ADDRESS = \"{new_address}\"  (PowerShell)")
                        current_address = new_address
                        reader = JBDBmsReader(current_address)
                        fail_count = 0
                    elif new_address:
                        log.info("Same device still best — retrying...")
                        fail_count = 0
                    else:
                        log.warning("No BMS found in scan. Ensure battery is on and in range.")
                except Exception as scan_err:
                    log.warning(f"Auto-scan failed: {scan_err}")

            if fail_count >= 5:
                log.error("5 consecutive failures — check BMS is powered, in range, and not connected to another app.")

        await asyncio.sleep(POLL_INTERVAL)


if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == "scan":
        asyncio.run(scan_for_bms())
    else:
        asyncio.run(main())
