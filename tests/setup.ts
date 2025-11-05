/**
 * Test setup file for Vitest
 * Provides global test utilities and mocks
 */

import { expect, afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import * as matchers from "@testing-library/jest-dom/matchers";

// Extend Vitest's expect with jest-dom matchers (only if in jsdom environment)
if (typeof window !== "undefined") {
  expect.extend(matchers);
}

// Cleanup after each test (only if in jsdom environment)
afterEach(() => {
  if (typeof window !== "undefined") {
    cleanup();
  }
});

// Mock window.matchMedia (used by Radix UI components) - only in jsdom environment
if (typeof window !== "undefined") {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => {},
    }),
  });
}

// Mock IntersectionObserver (used by some components) - only in jsdom environment
if (typeof window !== "undefined") {
  global.IntersectionObserver = class IntersectionObserver {
    constructor() {}
    disconnect() {}
    observe() {}
    takeRecords() {
      return [];
    }
    unobserve() {}
  } as any;

  // Mock ResizeObserver (used by Radix UI)
  global.ResizeObserver = class ResizeObserver {
    constructor() {}
    disconnect() {}
    observe() {}
    unobserve() {}
  } as any;
}
