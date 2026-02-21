const ASSET_PATTERN = /\.(?:css|js|mjs|svg|xml|txt|woff2?|ttf|otf|eot|ico|webp|png|jpe?g|gif)$/i;
const TEXT_LIKE_PATTERN = /(text\/|application\/(?:javascript|json|xml|rss\+xml))/i;

function buildExpiryHeaders(urlPath) {
  const now = Date.now();
  const isAsset = ASSET_PATTERN.test(urlPath);

  if (isAsset) {
    const expiresAt = new Date(now + 365 * 24 * 60 * 60 * 1000);
    return {
      "Cache-Control": "public, max-age=31536000, immutable",
      Expires: expiresAt.toUTCString(),
    };
  }

  const expiresAt = new Date(now + 10 * 60 * 1000);
  return {
    "Cache-Control": "public, max-age=600",
    Expires: expiresAt.toUTCString(),
  };
}

function shouldCompress(request, response) {
  if (!request.headers.get("accept-encoding")?.includes("gzip")) {
    return false;
  }

  if (response.headers.has("content-encoding")) {
    return false;
  }

  if (!response.ok || !response.body) {
    return false;
  }

  const contentType = response.headers.get("content-type") || "";
  return TEXT_LIKE_PATTERN.test(contentType);
}

export async function onRequest(context) {
  const response = await context.next();
  const url = new URL(context.request.url);
  const headers = new Headers(response.headers);

  const expiryHeaders = buildExpiryHeaders(url.pathname);
  for (const [name, value] of Object.entries(expiryHeaders)) {
    headers.set(name, value);
  }

  if (!shouldCompress(context.request, response)) {
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  }

  headers.set("Content-Encoding", "gzip");
  headers.append("Vary", "Accept-Encoding");
  headers.delete("Content-Length");
  headers.delete("ETag");

  const gzippedBody = response.body.pipeThrough(new CompressionStream("gzip"));

  return new Response(gzippedBody, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
