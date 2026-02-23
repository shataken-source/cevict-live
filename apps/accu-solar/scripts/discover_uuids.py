"""
Discover all BLE services and characteristics on a device.
Usage: python discover_uuids.py AA:BB:CC:DD:EE:FF
"""
import asyncio
import sys
from bleak import BleakClient

async def discover(address: str):
    print(f"\nConnecting to {address}...")
    async with BleakClient(address, timeout=15.0) as client:
        print(f"Connected: {client.is_connected}\n")
        for service in client.services:
            print(f"SERVICE: {service.uuid}  ({service.description})")
            for char in service.characteristics:
                props = ", ".join(char.properties)
                print(f"  CHAR:  {char.uuid}  [{props}]  ({char.description})")
                if "read" in char.properties:
                    try:
                        val = await client.read_gatt_char(char.uuid)
                        print(f"         VALUE: {val.hex()} = {list(val)}")
                    except Exception as e:
                        print(f"         READ ERROR: {e}")
            print()

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python discover_uuids.py AA:BB:CC:DD:EE:FF")
        sys.exit(1)
    asyncio.run(discover(sys.argv[1]))
