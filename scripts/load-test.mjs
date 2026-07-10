#!/usr/bin/env node

const args = new Set(process.argv.slice(2));

if (args.has("--help") || args.has("-h")) {
  console.log(`
INDESA load test

Uso:
  BASE_URL=http://localhost:4000 REQUESTS=300 CONCURRENCY=30 pnpm load:test

Variables:
  BASE_URL      URL base del backend. Default: http://localhost:4000
  REQUESTS      Total de solicitudes. Default: 200
  CONCURRENCY   Solicitudes simultaneas. Default: 20
  ENDPOINTS     Lista separada por coma. Default: /api/healthz,/api/productos,/api/categorias
`);
  process.exit(0);
}

const baseUrl = (process.env.BASE_URL || "http://localhost:4000").replace(/\/+$/, "");
const requests = Number(process.env.REQUESTS || 200);
const concurrency = Number(process.env.CONCURRENCY || 20);
const endpoints = (process.env.ENDPOINTS || "/api/healthz,/api/productos,/api/categorias")
  .split(",")
  .map((endpoint) => endpoint.trim())
  .filter(Boolean);

if (!Number.isFinite(requests) || requests <= 0) {
  throw new Error("REQUESTS debe ser un numero mayor a 0.");
}

if (!Number.isFinite(concurrency) || concurrency <= 0) {
  throw new Error("CONCURRENCY debe ser un numero mayor a 0.");
}

const durations = [];
const statusCounts = new Map();
let completed = 0;
let nextRequest = 0;

function percentile(values, p) {
  if (values.length === 0) return 0;
  const index = Math.ceil((p / 100) * values.length) - 1;
  return values[Math.max(0, Math.min(index, values.length - 1))];
}

async function hit(index) {
  const endpoint = endpoints[index % endpoints.length];
  const started = performance.now();

  try {
    const response = await fetch(`${baseUrl}${endpoint}`, {
      headers: { accept: "application/json" },
    });
    statusCounts.set(response.status, (statusCounts.get(response.status) || 0) + 1);
    await response.arrayBuffer();
  } catch {
    statusCounts.set("ERR", (statusCounts.get("ERR") || 0) + 1);
  } finally {
    durations.push(performance.now() - started);
    completed += 1;
  }
}

async function worker() {
  while (nextRequest < requests) {
    const current = nextRequest;
    nextRequest += 1;
    await hit(current);
  }
}

const startedAt = performance.now();
await Promise.all(Array.from({ length: Math.min(concurrency, requests) }, worker));
const totalMs = performance.now() - startedAt;
const sorted = durations.toSorted((a, b) => a - b);

console.log("Load test INDESA");
console.table({
  baseUrl,
  endpoints: endpoints.join(", "),
  requests: completed,
  concurrency,
  totalSeconds: (totalMs / 1000).toFixed(2),
  requestsPerSecond: (completed / (totalMs / 1000)).toFixed(2),
  avgMs: (durations.reduce((sum, value) => sum + value, 0) / durations.length).toFixed(2),
  p95Ms: percentile(sorted, 95).toFixed(2),
  p99Ms: percentile(sorted, 99).toFixed(2),
});
console.log("Estados HTTP:", Object.fromEntries(statusCounts));
