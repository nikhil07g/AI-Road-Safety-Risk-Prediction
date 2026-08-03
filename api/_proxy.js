const RENDER_API_URL = process.env.RENDER_API_URL?.replace(/\/$/, "");

export async function proxyRequest(request, upstreamPath) {
  if (!RENDER_API_URL) {
    return Response.json(
      { detail: "RENDER_API_URL is not configured" },
      { status: 503 }
    );
  }

  const incomingUrl = new URL(request.url);
  const targetUrl = `${RENDER_API_URL}${upstreamPath}${incomingUrl.search}`;
  const headers = new Headers();
  for (const header of ["accept", "content-type"]) {
    const value = request.headers.get(header);
    if (value) headers.set(header, value);
  }

  const init = { method: request.method, headers };
  if (!["GET", "HEAD"].includes(request.method)) {
    init.body = await request.arrayBuffer();
  }

  try {
    const upstream = await fetch(targetUrl, init);
    const responseHeaders = new Headers();
    const contentType = upstream.headers.get("content-type");
    if (contentType) responseHeaders.set("content-type", contentType);
    return new Response(upstream.body, {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch {
    return Response.json(
      { detail: "The Render API could not be reached" },
      { status: 502 }
    );
  }
}
