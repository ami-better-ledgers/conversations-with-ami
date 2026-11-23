// /api/studio/thumbnail-requests (behind Cloudflare Access, see _middleware.js)
//   GET            list what's waiting (no photos)
//   GET ?id=N      one request, including the photo as a data: URL
//   DELETE ?id=N   dismiss it
import { listRequests, getRequest, deleteRequest } from "../../_lib/thumbnail-requests.js";

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });

export async function onRequest(context) {
  const db = context.env.DB;
  if (!db) return json({ error: "Database isn't connected." }, 503);
  const url = new URL(context.request.url);
  const id = Number.parseInt(url.searchParams.get("id"), 10);
  try {
    if (context.request.method === "GET") {
      if (Number.isInteger(id)) {
        const r = await getRequest(db, id);
        if (!r) return json({ error: "Not found." }, 404);
        return json({
          request: {
            id: r.id, episode: r.episode, kind: r.kind, hook: r.hook, guest: r.guest, company: r.company,
            photo: r.photo_b64 ? `data:${r.photo_type};base64,${r.photo_b64}` : "",
          },
        });
      }
      return json({ waiting: await listRequests(db) });
    }
    if (context.request.method === "DELETE") {
      if (!Number.isInteger(id)) return json({ error: "id required." }, 400);
      await deleteRequest(db, id);
      return json({ ok: true });
    }
  } catch (err) {
    return json({ error: "Something went wrong. Please try again." }, 500);
  }
  return json({ error: "Method not allowed." }, 405);
}
