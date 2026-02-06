class PowerSensor {
  constructor() {
    this.voltage = 12.6;
    this.current = 0;
    this.temperature = 25;
  }

  readData() {
    // Simulate sensor readings
    this.voltage = 11.8 + Math.random() * 1.2;
    this.current = -Math.random() * 10;
    this.temperature = 20 + Math.random() * 15;

    return {
      voltage: this.voltage,
      current: this.current,
      temperature: this.temperature,
      timestamp: new Date()
    };
  }

  calculatePower() {
    return Math.abs(this.voltage * this.current);
  }

  getStateOfCharge() {
    // Estimate battery level from voltage
    if (this.voltage >= 12.7) return 100;
    if (this.voltage >= 12.5) return 90;
    if (this.voltage >= 12.3) return 70;
    if (this.voltage >= 12.0) return 50;
    if (this.voltage >= 11.8) return 30;
    return 10;
  }
}

module.exports = PowerSensor;