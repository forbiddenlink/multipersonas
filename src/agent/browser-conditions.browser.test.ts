import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { chromium, type Browser, type BrowserContext, type Page } from "playwright";
import { executeAction } from "./engine.js";
import { createServer, type Server } from "node:http";
import { verifyTaskText } from "../tasks/verify.js";
import { applyNetworkConditions } from "./network-conditions.js";

// Opt-in locally; CI installs Chromium and runs this suite explicitly.
describe.runIf(process.env.MP_BROWSER_TESTS === "1")("enforced keyboard conditions", () => {
  let browser: Browser;
  let context: BrowserContext;
  let page: Page;
  const keyboard = { inputModality: "keyboard" as const };

  beforeAll(async () => { browser = await chromium.launch({ headless: true }); });
  afterAll(async () => { await browser?.close(); });
  beforeEach(async () => {
    context = await browser.newContext();
    page = await context.newPage();
  });
  afterEach(async () => { await context?.close(); });

  it("reaches and activates a button with real key events and no pointer events", async () => {
    await page.setContent(`<button>Earlier</button><button onclick="this.textContent='Activated'">Open details</button>
      <script>window.keys=[]; window.pointerEvents=0;
      document.addEventListener('keydown', e => window.keys.push(e.key));
      document.addEventListener('pointerdown', () => window.pointerEvents++);</script>`);
    await executeAction(page, "click", { selector: "Open details" }, keyboard);
    expect(await page.getByRole("button", { name: "Activated" }).count()).toBe(1);
    expect(await page.evaluate(() => (window as unknown as { keys: string[] }).keys)).toEqual(["Tab", "Tab", "Enter"]);
    expect(await page.evaluate(() => (window as unknown as { pointerEvents: number }).pointerEvents)).toBe(0);
  });

  it("does not force focus onto a control outside the tab order", async () => {
    await page.setContent(`<button>Start</button><button tabindex="-1" onclick="this.textContent='Wrongly activated'">Unreachable</button>`);
    const result = await executeAction(page, "click", { selector: "Unreachable" }, keyboard);
    expect(result).toMatch(/not reached.*Tab/i);
    expect(await page.getByRole("button", { name: "Unreachable" }).count()).toBe(1);
  });

  it("records a bounded failure at a focus trap without escaping programmatically", async () => {
    await page.setContent(`<button onkeydown="if(event.key==='Tab') event.preventDefault()">Trap</button>
      <button onclick="this.textContent='Wrongly activated'">Beyond trap</button>`);
    expect(await executeAction(page, "click", { selector: "Beyond trap" }, keyboard)).toMatch(/not reached.*Tab/i);
    expect(await page.locator(":focus").textContent()).toBe("Trap");
  });

  it("types into the field through the keyboard after reaching it by Tab", async () => {
    await page.setContent(`<label>Search<input value="old"></label>
      <script>window.keys=[]; document.addEventListener('keydown', e => window.keys.push(e.key));</script>`);
    await executeAction(page, "type", { selector: "Search", text: "new" }, keyboard);
    expect(await page.getByLabel("Search").inputValue()).toBe("new");
    expect(await page.evaluate(() => (window as unknown as { keys: string[] }).keys)).toContain("Tab");
    expect(await page.evaluate(() => (window as unknown as { keys: string[] }).keys)).toContain("n");
  });

  it("operates checkboxes using Space", async () => {
    await page.setContent(`<label><input type="checkbox">Show details</label>`);
    await executeAction(page, "click", { selector: "Show details" }, keyboard);
    expect(await page.getByRole("checkbox").isChecked()).toBe(true);
  });

  it("selects a native option using keyboard events", async () => {
    await page.setContent(`<label>Sort<select><option>Price</option><option>Name</option><option>Date</option></select></label>
      <script>window.keys=[]; document.addEventListener('keydown', e => window.keys.push(e.key));</script>`);
    const result = await executeAction(page, "select_option", { selector: "Sort", option: "Date" }, keyboard);
    const keys = await page.evaluate(() => (window as unknown as { keys: string[] }).keys);
    expect(await page.getByLabel("Sort").inputValue(), `${result}; keys=${keys.join(",")}`).toBe("Date");
    expect(keys).toContain("D");
  });

  it("cannot use direct navigation to bypass an unreachable link", async () => {
    const result = await executeAction(page, "navigate", { url: "https://example.com/checkout" }, keyboard);
    expect(result).toMatch(/keyboard/i);
    expect(page.url()).toBe("about:blank");
  });

  it("selects a multiword native label with a shared prefix", async () => {
    await page.setContent(`<label>Sort<select><option>Choose</option><option>Price ascending</option><option>Price descending</option></select></label>`);
    const result = await executeAction(page, "select_option", { selector: "Sort", option: "Price descending" }, keyboard);
    expect(await page.getByLabel("Sort").inputValue(), result).toBe("Price descending");
  });

  it("retains the irreversible-action block for keyboard activation", async () => {
    await page.setContent(`<button onclick="this.textContent='Charged'">Place order</button>`);
    expect(await executeAction(page, "click", { selector: "Place order" }, {
      ...keyboard, blockDestructiveActions: true,
    })).toMatch(/irreversible/);
    expect(await page.getByRole("button", { name: "Place order" }).count()).toBe(1);
  });
});

describe.runIf(process.env.MP_BROWSER_TESTS === "1")("enforced network conditions", () => {
  let browser: Browser;
  let server: Server;
  let origin: string;
  beforeAll(async () => {
    server = createServer((_request, response) => {
      response.writeHead(200, { "Content-Type": "text/plain", "Cache-Control": "no-store" });
      response.end("x".repeat(100_000));
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("No fixture server address");
    origin = `http://127.0.0.1:${address.port}`;
    browser = await chromium.launch({ headless: true });
  });
  afterAll(async () => {
    await browser?.close();
    if (server) await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  });

  it("throttles actual bytes with request interception enabled, including after navigation", async () => {
    const context = await browser.newContext();
    try {
      // The production SSRF guard uses this interception mechanism too.
      await context.route("**/*", (route) => route.continue());
      const page = await context.newPage();
      await applyNetworkConditions(context, page, "slow-3g");
      for (const path of ["/first", "/second"]) {
        const start = Date.now();
        await page.goto(`${origin}${path}`, { waitUntil: "load" });
        expect(await page.locator("body").innerText()).toHaveLength(100_000);
        // 100 KB at 50 KB/s plus latency. Leave margin for browser scheduling.
        expect(Date.now() - start).toBeGreaterThan(1_400);
      }
    } finally {
      await context.close();
    }
  }, 15_000);
});

describe.runIf(process.env.MP_BROWSER_TESTS === "1")("task confirmation excludes editable text", () => {
  let browser: Browser;
  beforeAll(async () => { browser = await chromium.launch({ headless: true }); });
  afterAll(async () => { await browser?.close(); });
  it.each([
    ['<p>Request received</p>', "observed"],
    ['<div contenteditable="true"><span>Request received</span></div>', "not-observed"],
    ['<textarea>Request received</textarea>', "not-observed"],
    ['<p hidden>Request received</p>', "not-observed"],
  ])("evaluates browser content: %s", async (html, expected) => {
    const context = await browser.newContext();
    try {
      const page = await context.newPage();
      await page.setContent(html);
      const evidence = await verifyTaskText(page, {
        version: 1, goal: "Complete the synthetic request", successText: "Request received",
      }, null);
      expect(evidence.status).toBe(expected);
    } finally { await context.close(); }
  });
});

describe.runIf(process.env.MP_BROWSER_TESTS === "1")("contextual task evidence in Chromium", () => {
  let browser: Browser;
  beforeAll(async () => { browser = await chromium.launch({ headless: true }); });
  afterAll(async () => { await browser?.close(); });
  it.each(["working", "stale", "wrong destination"])("checks %s confirmation", async (scenario) => {
    const context = await browser.newContext();
    try {
      await context.route("**/*", (route) => route.fulfill({ contentType: "text/html", body:
        `<button onclick="document.querySelector('p').hidden=false; history.pushState({}, '', '${scenario === "wrong destination" ? "/demo" : "/thanks"}')">Submit</button><p ${scenario === "stale" ? "" : "hidden"}>Request received</p>` }));
      const page = await context.newPage();
      await page.goto("https://fixture.invalid/form");
      const task = { version: 1 as const, goal: "Complete the synthetic request", successText: "Request received" };
      const initial = await verifyTaskText(page, task, null);
      await page.getByRole("button", { name: "Submit" }).click();
      const evidence = await verifyTaskText(page, { ...task, version: 2, expectedUrl: "https://fixture.invalid/thanks", requireNewText: true }, 1, initial.status);
      expect(evidence.status).toBe(scenario === "working" ? "observed" : "not-observed");
      if (scenario === "stale") expect(evidence.checks?.newText).toBe("already-present");
      if (scenario === "wrong destination") expect(evidence.checks?.url).toBe("mismatched");
    } finally { await context.close(); }
  });
});
