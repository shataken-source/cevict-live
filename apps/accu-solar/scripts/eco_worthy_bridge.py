"""
ECO-Worthy 12V 280Ah LiFePO4 → MQTT Bridge
Reads JBD BMS via BLE, publishes to MQTT for Accu-Solar

Install:  pip install bleak jbd-bms paho-mqtt
Usage:    python eco_worthy_bridge.py

Set your BLE address and MQTT broker below, or use env vars:
  BMS_ADDRESS=AA:BB:CC:DD:EE:FF
  MQTT_BROKER=192.168.1.100
  MQTT_PORT=1883
"""

import asyncio
import json
import os
import time
import struct
import logging
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


# ── Scanner ───────────────────────────────────────────────────────────────────
async def scan_for_bms():
    log.info("Scanning for BLE devices (10s)...")
    results = []

    def callback(device, adv_data):
        results.append((device, adv_data))

    async with BleakScanner(detection_callback=callback):
        await asyncio.sleep(10.0)

    # Deduplicate by address, keep highest RSSI
    seen: dict = {}
    for device, adv in results:
        rssi = adv.rssi if adv.rssi is not None else -999
        if device.address not in seen or rssi > seen[device.address][1]:
            seen[device.address] = (device, rssi, adv)

    log.info(f"Found {len(seen)} devices:")
    for addr, (device, rssi, adv) in sorted(seen.items(), key=lambda x: x[1][1], reverse=True):
        name = device.name or adv.local_name or "(unknown)"
        log.info(f"  {device.address}  RSSI {rssi:4d}  {name}")
    log.info("Look for: JBD, xiaoxiang, ECO, BMS, or unnamed devices near your battery.")


# ── Main Loop ─────────────────────────────────────────────────────────────────
async def main():
    if not BMS_ADDRESS:
        log.error("BMS_ADDRESS not set. Run scan first:")
        log.error("  python eco_worthy_bridge.py scan")
        return

    log.info(f"Connecting to BMS at {BMS_ADDRESS}")
    log.info(f"Publishing to MQTT {MQTT_BROKER}:{MQTT_PORT} every {POLL_INTERVAL}s")

    mqtt_client = make_mqtt_client()
    reader = JBDBmsReader(BMS_ADDRESS)
    fail_count = 0

    while True:
        try:
            result = await reader.poll()
            basic = result.get("basic")
            cells = result.get("cells")

            if basic:
                publish(mqtt_client, basic, cells)
                fail_count = 0
            else:
                log.warning("Empty BMS response — retrying next cycle")
                fail_count += 1

        except Exception as e:
            fail_count += 1
            log.error(f"BLE error (attempt {fail_count}): {e}")
            if fail_count >= 5:
                log.error("5 consecutive failures — check BMS is powered and in range")

        await asyncio.sleep(POLL_INTERVAL)


if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == "scan":
        asyncio.run(scan_for_bms())
    else:
        asyncio.run(main())
