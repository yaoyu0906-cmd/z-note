/** Inserted into a brand-new Page block so the preview immediately behaves
 *  like an actual embedded .html page — full document structure, not a
 *  bare fragment — rather than showing a blank white iframe until the
 *  user writes boilerplate themselves. */
export const DEFAULT_PAGE_BLOCK_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Page</title>
  <style>
    body {
      font-family: system-ui, sans-serif;
      margin: 0;
      padding: 24px;
      color: #1a1a1a;
    }
  </style>
</head>
<body>
  <h1>Hello, page!</h1>
  <p>This block renders as a real embedded HTML page — edit the code to change it.</p>
</body>
</html>
`;
