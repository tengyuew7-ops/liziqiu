# Food choice CloudBase function

This directory is an ordinary CloudBase function for the Node.js 20 runtime.
Its entry is `index.main`. It uses `@cloudbase/node-sdk` 3.18.3 and initializes
the SDK with the explicit CloudBase environment ID and the PostgreSQL
`service_role` API Key supplied through the server-only `CLOUDBASE_APIKEY`
function environment variable. The PostgreSQL client explicitly selects the
`public` schema because Node SDK 3.18.3 otherwise uses the environment ID as
its profile header. The function fails during cold start when that variable is
missing, empty, or padded with whitespace.
The application code never returns the credential to a caller or logs it.

## Deploy

1. Package `index.js`, `handler.js`, `validation.js`, and `package.json` at the
   root of a ZIP archive.
2. Upload the archive as an ordinary CloudBase function with the Node.js 20
   runtime and handler `index.main`, with automatic dependency installation on.
3. In the function configuration, enable **API Key 设置** and select the
   PostgreSQL API Key whose role is `service_role`. CloudBase injects it as
   `CLOUDBASE_APIKEY` at runtime. Do not use a Publishable/`anon` key, put its
   value in the ZIP, commit it, or expose it in browser code.
4. In HTTP Gateway, route the public food-choice endpoint to this function.
5. Disable the gateway's own CORS validation for this route. The function
   handles CORS and only permits `https://tengyuew7-ops.github.io`.
6. Run the updated [`../schema.sql`](../schema.sql) migration to remove direct
   anonymous inserts before switching the website to this endpoint.

Do not deploy this code as a Web/HTTP cloud function. Keep the API Key only in
the ordinary function's environment variables, and restrict console access to
the function configuration.

Supported requests:

- `GET`: health response.
- `OPTIONS`: CORS preflight for `POST`.
- `POST`: validates and stores one food-choice record.

The request body limit is 4096 bytes. Responses never include database or SDK
error details.
