const GRAPH_API_VERSION = "v23.0";
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

type FacebookResponse = { id?: string; post_id?: string; error?: { message?: string; type?: string; code?: number } };

async function request(path: string, body: Record<string, string>, accessToken: string) {
  const response = await fetch(`${GRAPH_API_BASE}${path}`, { method: "POST", body: new URLSearchParams({ ...body, access_token: accessToken }) });
  const json = (await response.json()) as FacebookResponse;
  if (!response.ok || json.error) {
    throw new Error(`Facebook Page API gagal: ${json.error?.message ?? `HTTP ${response.status}`}`);
  }
  return json;
}

export function createFacebookPhotoPost(pageId: string, input: { imageUrl: string; caption: string; accessToken: string }) {
  return request(`/${pageId}/photos`, { url: input.imageUrl, caption: input.caption }, input.accessToken);
}

export function createFacebookTextPost(pageId: string, input: { message: string; accessToken: string }) {
  return request(`/${pageId}/feed`, { message: input.message }, input.accessToken);
}
