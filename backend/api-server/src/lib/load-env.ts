import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

function cleanEnvValue(value: string): string {
  const trimmed = value.trim();

  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
}

function readEnvFile(filePath: string): void {
  const content = fs.readFileSync(filePath, "utf8");

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) continue;

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = cleanEnvValue(trimmed.slice(separatorIndex + 1));

    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function findEnvFile(startDirectory: string): string | null {
  let current = path.resolve(startDirectory);

  while (true) {
    const envPath = path.join(current, ".env");
    if (fs.existsSync(envPath)) return envPath;

    const parent = path.dirname(current);
    if (parent === current) return null;

    current = parent;
  }
}

const currentFileDirectory = path.dirname(fileURLToPath(import.meta.url));
const searchRoots = [process.cwd(), currentFileDirectory];

for (const root of searchRoots) {
  const envPath = findEnvFile(root);
  if (envPath) {
    readEnvFile(envPath);
    break;
  }
}
