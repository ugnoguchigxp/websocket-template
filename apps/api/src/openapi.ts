import { writeFileSync } from "fs";
import { join } from "path";
import { logger } from "@logger";
import { generateOpenApiDocument } from "trpc-openapi";
import { appRouter } from "./routers/index.js";

const doc = generateOpenApiDocument(appRouter, {
	title: "WS RPC BBS API",
	version: "1.0.0",
	baseUrl: "http://localhost:3001",
});

const out = join(process.cwd(), "../../openapi.json");
writeFileSync(out, JSON.stringify(doc, null, 2));
logger.info("OpenAPI spec generated", { path: out });
