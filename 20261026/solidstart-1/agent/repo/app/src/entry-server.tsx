// @refresh reload
import { createHandler, StartServer } from "@solidjs/start/server";

// "async" mode renders the whole page before responding, so the HTML is complete
// (and fragment links such as #moves resolve) without waiting for hydration.
export default createHandler(
  () => (
    <StartServer
      document={({ assets, children, scripts }) => (
        <html lang="en">
          <head>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            <link rel="icon" href="/favicon.ico" />
            {assets}
          </head>
          <body>
            <div id="app">{children}</div>
            {scripts}
          </body>
        </html>
      )}
    />
  ),
  { mode: "async" },
);
