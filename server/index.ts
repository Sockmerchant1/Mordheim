import { mkdirSync } from "node:fs";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { handleCloudApiRequest } from "./cloud/api.ts";
import { createSqliteExecutor } from "./cloud/sqlite.ts";
import { createTursoExecutor } from "./cloud/turso.ts";

const rootDir = dirname(fileURLToPath(new URL("../package.json", import.meta.url)));
const localDir = join(rootDir, ".local");
mkdirSync(localDir, { recursive: true });

const db = process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN
  ? createTursoExecutor()
  : createSqliteExecutor(join(localDir, "mordheim-cloud.sqlite"));

const server = createServer(async (request, response) => {
  try {
    if (request.method === "OPTIONS") {
      writeWebResponse(response, await handleCloudApiRequest(toWebRequest(request), { db, applySchema: true }));
      return;
    }
    writeWebResponse(response, await handleCloudApiRequest(toWebRequest(request), { db, applySchema: true }));
  } catch (error) {
    response.writeHead(500, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ error: error instanceof Error ? error.message : "Unexpected error" }));
  }
});

const port = Number(process.env.PORT ?? 5174);
server.listen(port, "127.0.0.1", () => {
  console.log(`Mordheim cloud API listening on http://127.0.0.1:${port}`);
});

function toWebRequest(request: IncomingMessage): Request {
  const url = new URL(request.url ?? "/", "http://127.0.0.1");
  const headers = new Headers();
  for (const [key, value] of Object.entries(request.headers)) {
    if (Array.isArray(value)) headers.set(key, value.join(", "));
    else if (value) headers.set(key, value);
  }
  return new Request(url, {
    method: request.method,
    headers,
    body: request.method === "GET" || request.method === "HEAD" ? undefined : request as unknown as BodyInit,
    duplex: "half"
  } as RequestInit & { duplex: "half" });
}

async function writeWebResponse(response: ServerResponse, webResponse: Response) {
  response.writeHead(webResponse.status, Object.fromEntries(webResponse.headers.entries()));
  response.end(Buffer.from(await webResponse.arrayBuffer()));
}
