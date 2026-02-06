/**
 * Utility functions for general purpose tasks
 */

class DataProcessor {
  constructor() {
    this.data = [];
  }

  addData(item) {
    this.data.push({
      ...item,
      timestamp: new Date(),
      id: this.generateId()
    });
  }

  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  processData() {
    return this.data.map(item => ({
      ...item,
      processed: true,
      processedAt: new Date()
    }));
  }

  getData() {
    return this.data;
  }

  clearData() {
    this.data = [];
  }
}

module.exports = DataProcessor;