import { describe, expect, it } from "vitest";

import { isAllowedDevServerUrl } from "../../src/main/windows/devServerUrl";

describe("isAllowedDevServerUrl", () => {
  it.each([
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://127.12.0.5:5173",
    "http://[::1]:5173"
  ])("accepts loopback dev URL %s", (url) => {
    expect(isAllowedDevServerUrl(url)).toBe(true);
  });

  it.each([
    "http://127.evil.com:5173",
    "http://127.0.0.1.evil.com:5173",
    "ws://127.0.0.1:5173",
    "file:///tmp/index.html",
    "http://192.168.0.10:5173",
    "http://example.com:5173"
  ])("rejects non-loopback or unsupported dev URL %s", (url) => {
    expect(isAllowedDevServerUrl(url)).toBe(false);
  });
});
