# Food choice CloudBase function

This directory is an ordinary CloudBase function for the Node.js 20 runtime.
Its entry is `index.main`. It uses `@cloudbase/node-sdk` 3.18.3 and calls
`tcb.init({})`; node-sdk resolves the current function environment and reads the
server credentials injected into an ordinary event function. The function
contains no API key or Publishable Key.

## Deploy

1. Package `index.js`, `handler.js`, `validation.js`, and `package.json` at the
   root of a ZIP archive.
2. Upload the archive as an ordinary CloudBase function with the Node.js 20
   runtime and handler `index.main`, with automatic dependency installation on.
3. In HTTP Gateway, route the public food-choice endpoint to this function.
4. Disable the gateway's own CORS validation for this route. The function
   handles CORS and only permits `https://tengyuew7-ops.github.io`.
5. Run the updated `cloudbase-schema.sql` migration to remove direct anonymous
   inserts before switching the website to this endpoint.

Do not deploy this code as a Web/HTTP cloud function. That runtime does not
inject the ordinary function credentials used by `@cloudbase/node-sdk`.

Supported requests:

- `GET`: health response.
- `OPTIONS`: CORS preflight for `POST`.
- `POST`: validates and stores one food-choice record.

The request body limit is 4096 bytes. Responses never include database or SDK
error details.
