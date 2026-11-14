// GET /api-docs — Swagger UI for public/openapi.json. Served as plain HTML so it needs no React dependency;
// swagger-ui-dist is pinned to an exact version on jsDelivr.
const SWAGGER_VERSION = "5.17.14";
// Subresource Integrity: the browser refuses these files if the CDN ever serves different bytes (#63).
// Hashes from https://data.jsdelivr.com/v1/package/npm/swagger-ui-dist@5.17.14, checked against the files.
const CSS_INTEGRITY = "sha256-QBcPDuhZ0X+SExunBzKaiKBw5PZodNETZemnfSMvYRc=";
const JS_INTEGRITY = "sha256-wuSp7wgUSDn/R8FCAgY+z+TlnnCk5xVKJr1Q2IDIi6E=";

const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>HandUp API docs</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@${SWAGGER_VERSION}/swagger-ui.css" integrity="${CSS_INTEGRITY}" crossorigin="anonymous" />
    <style>body { margin: 0; background: #fff; } .topbar { display: none; }</style>
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@${SWAGGER_VERSION}/swagger-ui-bundle.js" integrity="${JS_INTEGRITY}" crossorigin="anonymous"></script>
    <script>
      window.ui = SwaggerUIBundle({ url: "/openapi.json", dom_id: "#swagger-ui", deepLinking: true });
    </script>
  </body>
</html>`;

export function GET(): Response {
  return new Response(html, { headers: { "content-type": "text/html; charset=utf-8" } });
}
