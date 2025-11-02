import "reflect-metadata";
import path from "path";
import { fileURLToPath } from "url";
import { config } from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const envPath = path.resolve(path.dirname(__filename), "../../../.env");
config({ path: envPath });

// Delegate to the primary entry point to ensure consistent bootstrap logic
await import("./index.js");
