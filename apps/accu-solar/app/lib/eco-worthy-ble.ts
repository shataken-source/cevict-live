/**
 * Eco-Worthy 12V LiFePO4 BLE decoder (0xA1 / 0xA2 style packets).
 * Matches Eco-Worthy app: Total Voltage, Current, Power, SOC, Status, Remaining/Available AH, Single Cell Voltage.
 */

export type EcoWorthyDecoded = {
  voltage?: number;       // V (Total Voltage)
  current?: number;       // A (positive = charging)
  power?: number;        // W (Total Power)
  soc?: number;          // 0–100 %
  tempC?: number;        // °C
  cycleCount?: number;
  status?: "charging" | "discharging" | "idle";
  remainingCapacityAh?: number;
  availableCapacityAh?: number;  // e.g. 280
  cellVoltages?: number[];       // per-cell V, e.g. [3.31, 3.32, 3.31, 3.31]
  cellCount?: number;            // e.g. 4
  header: 0xa1 | 0xa2;
};

function u16le(bytes: Uint8Array, off: number): number | undefined {
  if (off < 0 || off + 2 > bytes.length) return undefined;
  return bytes[off]! | (bytes[off + 1]! << 8);
}

function i16le(bytes: Uint8Array, off: number): number | undefined {
  const u = u16le(bytes, off);
  if (u == null) return undefined;
  return u & 0x8000 ? u - 0x10000 : u;
}

/**
 * Decode one Eco-Worthy BLE packet (A1 or A2).
 * Tries common layouts; returns partial result if only some fields look valid.
 */
export function decodeEcoWorthyPacket(bytes: Uint8Array): EcoWorthyDecoded | null {
  if (bytes.length < 4) return null;
  const header = bytes[0];
  if (header !== 0xa1 && header !== 0xa2) return null;

  const out: EcoWorthyDecoded = { header: header as 0xa1 | 0xa2 };

  // Common layout (A1): [0xA1, len, V_lo, V_hi, I_lo, I_hi, SOC, temp?, ...]
  // Voltage: 2 bytes LE, unit often 0.01 V → 13.00 V = 1300
  const v = u16le(bytes, 2);
  if (v != null && v >= 800 && v <= 16000) {
    out.voltage = v * 0.01;
  }

  // Current: 2 bytes signed LE, 0.01 A
  const i = i16le(bytes, 4);
  if (i != null && i >= -50000 && i <= 50000) {
    out.current = i * 0.01;
  }

  // SoC: single byte 0–100
  if (bytes.length > 6) {
    const soc = bytes[6]!;
    if (soc >= 0 && soc <= 100) out.soc = soc;
  }

  // Temp: often byte 7 (signed or offset). 20–30 °C typical; allow -20..60
  if (bytes.length > 7) {
    const t = bytes[7]!;
    if (t >= 0 && t <= 100) out.tempC = t; // raw as °C if in range
    else if (t >= 128 && t <= 255) out.tempC = t - 256; // signed
  }

  // Optional: cycle count sometimes later in packet
  if (bytes.length >= 12) {
    const cycles = u16le(bytes, 10);
    if (cycles != null && cycles <= 20000) out.cycleCount = cycles;
  }

  // Power = V * I (when both present)
  if (out.voltage != null && out.current != null) {
    out.power = Math.round(out.voltage * out.current * 100) / 100;
  }
  // Status from current sign (matches Eco-Worthy app: Charging / Discharging)
  if (out.current != null) {
    if (out.current > 0.1) out.status = "charging";
    else if (out.current < -0.1) out.status = "discharging";
    else out.status = "idle";
  }

  // Remaining capacity (AH) and available/full capacity — common offsets 8–9, 10–11 (0.01 Ah)
  if (bytes.length >= 12) {
    const remaining = u16le(bytes, 8);
    if (remaining != null && remaining <= 40000) out.remainingCapacityAh = remaining * 0.01;
    const available = u16le(bytes, 10);
    if (available != null && available >= 20000 && available <= 40000) out.availableCapacityAh = available * 0.01;  // 280 Ah = 28000
  }

  // A2 packet: single cell voltages (4 cells × 2 bytes LE, 0.001 V) starting at offset 2
  if (header === 0xa2 && bytes.length >= 10) {
    const cells: number[] = [];
    for (let i = 0; i < 4; i++) {
      const off = 2 + i * 2;
      const mv = u16le(bytes, off);
      if (mv != null && mv >= 2500 && mv <= 3700) cells.push(mv * 0.001);
    }
    if (cells.length) {
      out.cellVoltages = cells;
      out.cellCount = cells.length;
    }
  }

  return out;
}

export type BlePacket = {
  ts: number;
  deviceId: string;
  charUuid: string;
  bytes: number[];
};

/**
 * Merge A1 (main) + A2 (cells) into one decoded object for the selected device.
 */
export function decodeLatestEcoWorthy(
  packets: BlePacket[],
  deviceId: string
): EcoWorthyDecoded | null {
  const forDevice = packets.filter((p) => p.deviceId === deviceId);
  if (!forDevice.length) return null;

  const a1Packets = forDevice.filter((p) => p.bytes[0] === 0xa1);
  const a2Packets = forDevice.filter((p) => p.bytes[0] === 0xa2);
  const latestA1 = a1Packets.length ? a1Packets.reduce((a, b) => (a.ts >= b.ts ? a : b)) : null;
  const latestA2 = a2Packets.length ? a2Packets.reduce((a, b) => (a.ts >= b.ts ? a : b)) : null;

  const decodedA1 = latestA1 ? decodeEcoWorthyPacket(new Uint8Array(latestA1.bytes)) : null;
  const decodedA2 = latestA2 ? decodeEcoWorthyPacket(new Uint8Array(latestA2.bytes)) : null;

  if (!decodedA1 && !decodedA2) return null;
  if (decodedA1 && !decodedA2) return decodedA1;
  if (decodedA2 && !decodedA1) return decodedA2;

  return {
    ...decodedA1,
    ...decodedA2,
    header: 0xa1,
    cellVoltages: decodedA2!.cellVoltages ?? decodedA1!.cellVoltages,
    cellCount: decodedA2!.cellCount ?? decodedA1!.cellCount,
  } as EcoWorthyDecoded;
}
