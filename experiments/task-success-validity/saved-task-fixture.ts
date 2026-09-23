import { createServer } from "node:http";

// A fixed, data-free fixture server: no file serving, stored input, or real transactions.
const wrap = (body: string): string => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Personaudit evaluation fixture</title></head><body><main>${body}</main></body></html>`;
const pages: Record<string, string> = {
  "/multi-step": '<h1>Services</h1><a href="/multi-step/details">Small business service</a><p>Website setup and support for small businesses.</p>',
  "/multi-step/details": '<h1>Small business service details</h1><p>Includes a five-page website and monthly support.</p><a href="/multi-step/quote">Request a quote</a>',
  "/multi-step/quote": '<h1>Small business quote request</h1><p>This is the destination. No information or submission is required.</p>',
  "/native-select": '<h1>Choose billing</h1><label for="period">Billing period</label><select id="period"><option>Monthly</option><option>Annual</option></select><p id="summary" role="status">Monthly plan selected</p><script>document.getElementById("period").addEventListener("change", e => { document.getElementById("summary").textContent = e.target.value + " plan selected"; });</script>',
  "/misleading-text": '<h1>Reservations unavailable</h1><p>Reservation confirmed is an example message, not a confirmation.</p><p hidden>Reservation confirmed</p><label for="example">Example message</label><input id="example" value="Reservation confirmed" readonly><p>No reservation can be made on this page.</p>',
};
const port = Number(process.env.FIXTURE_PORT ?? 3189);
createServer((req, res) => {
  const page = pages[new URL(req.url ?? "/", "http://fixture.test").pathname];
  res.writeHead(page ? 200 : 404, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" });
  res.end(wrap(page ?? "<h1>Page unavailable</h1>"));
}).listen(port, "127.0.0.1", () => console.log(`Synthetic fixture listening on ${port}`));
