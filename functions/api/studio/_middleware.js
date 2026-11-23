// Runs before every /api/studio/* route. Nothing in this folder is reachable without a
// verified Cloudflare Access sign-in (see ../../_lib/studio-auth.js).
import { checkStudioAuth } from "../../_lib/studio-auth.js";

export async function onRequest(context) {
  const denied = await checkStudioAuth(context);
  if (denied) return denied;
  return context.next();
}
