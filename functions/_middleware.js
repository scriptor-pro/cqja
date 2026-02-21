const ASSET_PATTERN = /\.(?:css|js|mjs|svg|xml|txt|woff2?|ttf|otf|eot|ico|webp|png|jpe?g|gif)$/i;

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

export async function onRequest(context) {
  const response = await context.next();
  const url = new URL(context.request.url);
  const headers = new Headers(response.headers);

  const expiryHeaders = buildExpiryHeaders(url.pathname);
  for (const [name, value] of Object.entries(expiryHeaders)) {
    headers.set(name, value);
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
