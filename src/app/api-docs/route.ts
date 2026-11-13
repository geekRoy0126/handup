// GET /api-docs — Swagger UI for public/openapi.json. Served as plain HTML so it needs no React dependency;
// swagger-ui-dist is pinned to an exact version on jsDelivr.
const SWAGGER_VERSION = "5.17.14";

const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>HandUp API docs</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@${SWAGGER_VERSION}/swagger-ui.css" />
    <style>body { margin: 0; background: #fff; } .topbar { display: none; }</style>
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@${SWAGGER_VERSION}/swagger-ui-bundle.js" crossorigin></script>
    <script>
      window.ui = SwaggerUIBundle({ url: "/openapi.json", dom_id: "#swagger-ui", deepLinking: true });
    </script>
  </body>
</html>`;

export function GET(): Response {
  return new Response(html, { headers: { "content-type": "text/html; charset=utf-8" } });
}
