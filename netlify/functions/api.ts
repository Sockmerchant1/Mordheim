import { handleCloudApiRequest } from "../../server/cloud/api.ts";
import { createTursoExecutor } from "../../server/cloud/turso.ts";

const db = createTursoExecutor();

export default async function handler(request: Request) {
  return handleCloudApiRequest(request, {
    db,
    applySchema: false
  });
}

export const config = {
  path: "/api/*"
};
