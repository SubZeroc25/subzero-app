import { describe, it, expect } from "vitest";

describe("Environment Variables", () => {
  it("should have EXPO_PUBLIC_APP_ID set", () => {
    const appId = process.env.EXPO_PUBLIC_APP_ID || process.env.VITE_APP_ID;
    expect(appId).toBeDefined();
    expect(appId).toBeTruthy();
    expect(typeof appId).toBe("string");
    expect(appId!.length).toBeGreaterThan(0);
  });

  it("should have VITE_APP_ID set", () => {
    expect(process.env.VITE_APP_ID).toBeDefined();
    expect(process.env.VITE_APP_ID).toBeTruthy();
  });
});
