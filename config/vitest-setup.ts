/// <reference types="vitest/globals" />
/// <reference types="@testing-library/jest-dom/vitest" />

// Only import jest-dom matchers if in jsdom environment
if (typeof window !== "undefined") {
  // Dynamic import for jest-dom (only in jsdom environment)
  import("@testing-library/jest-dom/vitest").catch(() => {
    // Ignore import errors in node environment
  });
}
