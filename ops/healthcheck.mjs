#!/usr/bin/env node

const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 4_000);

try {
  const response = await fetch("http://127.0.0.1:4321/", {
    redirect: "manual",
    signal: controller.signal,
  });
  if (response.status < 200 || response.status >= 400) {
    process.exitCode = 1;
  }
} catch {
  process.exitCode = 1;
} finally {
  clearTimeout(timeout);
}

