/**
 * Simple Test Framework
 * Lightweight testing utilities for Alpha Hunter
 */

export interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration: number;
}

export class TestSuite {
  private tests: Array<{ name: string; fn: () => Promise<void> | void }> = [];
  private beforeEachFn: (() => Promise<void> | void) | null = null;
  private afterEachFn: (() => Promise<void> | void) | null = null;
  private results: TestResult[] = [];

  beforeEach(fn: () => Promise<void> | void) {
    this.beforeEachFn = fn;
  }

  afterEach(fn: () => Promise<void> | void) {
    this.afterEachFn = fn;
  }

  it(name: string, fn: () => Promise<void> | void) {
    this.tests.push({ name, fn });
  }

  async run(): Promise<TestResult[]> {
    this.results = [];
    
    for (const test of this.tests) {
      const start = Date.now();
      
      try {
        if (this.beforeEachFn) await this.beforeEachFn();
        await test.fn();
        if (this.afterEachFn) await this.afterEachFn();
        
        this.results.push({
          name: test.name,
          passed: true,
          duration: Date.now() - start
        });
      } catch (error: any) {
        if (this.afterEachFn) {
          try {
            await this.afterEachFn();
          } catch {}
        }
        
        this.results.push({
          name: test.name,
          passed: false,
          error: error.message || String(error),
          duration: Date.now() - start
        });
      }
    }
    
    return this.results;
  }

  getResults(): TestResult[] {
    return this.results;
  }
}

let currentSuite: TestSuite | null = null;

export function describe(name: string, fn: () => void): TestSuite {
  const suite = new TestSuite();
  currentSuite = suite;
  fn();
  currentSuite = null;
  return suite;
}

export function it(name: string, fn: () => Promise<void> | void) {
  if (!currentSuite) {
    throw new Error('it() must be called inside describe()');
  }
  currentSuite.it(name, fn);
}

export function beforeEach(fn: () => Promise<void> | void) {
  if (!currentSuite) {
    throw new Error('beforeEach() must be called inside describe()');
  }
  currentSuite.beforeEach(fn);
}

export function afterEach(fn: () => Promise<void> | void) {
  if (!currentSuite) {
    throw new Error('afterEach() must be called inside describe()');
  }
  currentSuite.afterEach(fn);
}

export function expect(actual: any) {
  return {
    toBe(expected: any) {
      if (actual !== expected) {
        throw new Error(`Expected ${actual} to be ${expected}`);
      }
    },
    toBeDefined() {
      if (actual === undefined) {
        throw new Error(`Expected ${actual} to be defined`);
      }
    },
    toBeGreaterThan(expected: number) {
      if (actual <= expected) {
        throw new Error(`Expected ${actual} to be greater than ${expected}`);
      }
    },
    toBeGreaterThanOrEqual(expected: number) {
      if (actual < expected) {
        throw new Error(`Expected ${actual} to be greater than or equal to ${expected}`);
      }
    },
    toBeLessThan(expected: number) {
      if (actual >= expected) {
        throw new Error(`Expected ${actual} to be less than ${expected}`);
      }
    },
    toBeLessThanOrEqual(expected: number) {
      if (actual > expected) {
        throw new Error(`Expected ${actual} to be less than or equal to ${expected}`);
      }
    },
    toEqual(expected: any) {
      if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(actual)} to equal ${JSON.stringify(expected)}`);
      }
    }
  };
}

// Mock jest for compatibility
export const jest = {
  fn: () => ({
    mockResolvedValue: (value: any) => ({
      mockResolvedValue: () => value,
      mockRejectedValue: (error: any) => ({ mockRejectedValue: () => error })
    }),
    mockRejectedValue: (error: any) => ({
      mockRejectedValue: () => error
    })
  })
};

