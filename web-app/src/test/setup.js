import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

// 扩展 Vitest 的 expect
expect.extend(matchers);

// 每个测试后清理
afterEach(() => {
  cleanup();
});

// 模拟 localStorage
const localStorageMock = {
  getItem: vitest.fn(),
  setItem: vitest.fn(),
  removeItem: vitest.fn(),
  clear: vitest.fn(),
};

global.localStorage = localStorageMock;

// 模拟 window.matchMedia (用于主题检测)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vitest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vitest.fn(),
    removeListener: vitest.fn(),
    addEventListener: vitest.fn(),
    removeEventListener: vitest.fn(),
    dispatchEvent: vitest.fn(),
  })),
});

// 模拟 Web Speech API
global.speechSynthesis = {
  speak: vitest.fn(),
  cancel: vitest.fn(),
  pause: vitest.fn(),
  resume: vitest.fn(),
  getVoices: vitest.fn(() => []),
};

// 模拟 Chrome Storage API
global.chrome = {
  storage: {
    local: {
      get: vitest.fn((keys, callback) => {
        const result = {};
        callback?.(result);
        return Promise.resolve(result);
      }),
      set: vitest.fn((items, callback) => {
        callback?.();
        return Promise.resolve();
      }),
    },
  },
};
