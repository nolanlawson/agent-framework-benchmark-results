// @refresh reload
import { createHandler, StartServer } from "@solidjs/start/server";

export default createHandler(
  () => (
    <StartServer
      document={({ assets, children, scripts }) => (
        <html lang="en">
          <head>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            <meta name="theme-color" content="#c8102e" />
            <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
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
  // Wait for all data before responding, so every page arrives complete (with its title
  // and status code) rather than streaming in.
  { mode: "async" },
);
