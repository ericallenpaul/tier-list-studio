import { isIP } from "node:net";

const allowedProtocols = new Set(["http:", "https:"]);

const isLoopbackHostname = (hostname: string) => {
  if (hostname === "localhost") {
    return true;
  }

  const ipv6Hostname = hostname.startsWith("[") && hostname.endsWith("]") ? hostname.slice(1, -1) : hostname;

  if (isIP(ipv6Hostname) === 6) {
    return ipv6Hostname === "::1";
  }

  if (isIP(hostname) === 4) {
    return hostname.split(".")[0] === "127";
  }

  return false;
};

export const isAllowedDevServerUrl = (value: string) => {
  let devServerUrl: URL;

  try {
    devServerUrl = new URL(value);
  } catch {
    return false;
  }

  return allowedProtocols.has(devServerUrl.protocol) && isLoopbackHostname(devServerUrl.hostname);
};
