import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";

// Pause a real HTML transfer after the loading surface has arrived, before any
// search runtime. This tests first paint while the network is still delivering.
test("startup paints a lightweight status during transfer and releases it when controls are ready", async ({ page, baseURL }) => {
  const html = await readFile("public/flow-preview.html", "utf8");
  const boundary = html.indexOf('</button></div></div>', html.indexOf('id="flow-startup"')) + '</button></div></div>'.length;
  expect(boundary).toBeGreaterThan(0);
  let release!: () => void;
  const pending = new Promise<void>((resolve) => { release = resolve; });
  const server = createServer(async (request, response) => {
    if (request.url === "/flow-preview.html") {
      response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      response.write(html.slice(0, boundary));
      await pending;
      response.end(html.slice(boundary));
    } else {
      const upstream = await fetch(new URL(request.url!, baseURL!));
      response.writeHead(upstream.status, { "Content-Type": upstream.headers.get("content-type") ?? "application/octet-stream" });
      response.end(Buffer.from(await upstream.arrayBuffer()));
    }
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    await page.clock.install();
    await page.setViewportSize({ width:320, height:640 });
    await page.emulateMedia({ reducedMotion:"reduce" });
    await page.goto(`http://127.0.0.1:${(server.address() as { port:number }).port}/flow-preview.html`, { waitUntil:"commit" });
    await expect(page.locator("#flow-startup")).toBeVisible();
    await expect(page.locator('#flow-startup [role="status"]')).toContainText("آماده‌سازی");
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
    expect(await page.locator(".flow-startup .flow-loading-orbit").evaluate((node) => getComputedStyle(node).animationName)).toBe("none");
    await page.clock.fastForward(21000);
    await expect(page.locator("#flow-startup button")).toBeVisible();
    release();
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("#flow-startup")).toBeHidden();
    await page.locator("#major-search").fill("مهندسی کامپیوتر");
    await expect(page.locator("#major-results .result-item").first()).toContainText("مهندسی کامپیوتر");
  } finally {
    release();
    await page.goto("about:blank");
    await new Promise<void>((resolve) => { server.close(() => resolve()); server.closeAllConnections(); });
  }
});

test("startup surface never blocks the homepage without JavaScript", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled:false, viewport:{width:390,height:844} });
  try {
    const page = await context.newPage();
    await page.goto(`${baseURL}/flow-preview.html`);
    await expect(page.locator("#flow-startup")).toBeHidden();
    await expect(page.locator("#page-title")).toBeVisible();
    await expect(page.locator(".site-header .channel-link")).toBeVisible();
    await expect(page.locator(".flow-supports")).toBeVisible();
  } finally { await context.close(); }
});

test("article loading recovers from failure and ignores stale results after navigation or closing", async ({ page }) => {
  await page.goto("/flow-preview.html");
  const guides = await page.evaluate(() => JSON.parse(document.getElementById("aris-selection-guides-data")!.textContent!));
  let attempts = 0;
  await page.route(`**${guides[0].payloadURL}`, async (route) => {
    if (++attempts === 1) await route.abort(); else await route.continue();
  });
  await page.locator("#guide-grid .guide-card__hit").first().click();
  await expect(page.locator("#flow-guide-retry")).toBeVisible();
  await expect(page.locator("#flow-guide-loading")).toContainText("دریافت نشد");
  await page.locator("#flow-guide-retry").click();
  await expect(page.locator("#guide-reader-frame")).toBeVisible();
  expect(attempts).toBe(2);
  await page.evaluate(() => (window as unknown as { ArisSelectionModule:{close:() => void} }).ArisSelectionModule.close());
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  await page.route(`**${guides[1].payloadURL}`, async (route) => { await gate; await route.continue(); });
  await page.evaluate((id) => { void (window as unknown as {ArisSelectionModule:{open:(id:string) => Promise<void>}}).ArisSelectionModule.open(id); }, guides[1].id);
  await expect(page.locator("#flow-guide-loading")).toBeVisible();
  await page.evaluate((id) => (window as unknown as {ArisSelectionModule:{open:(id:string) => Promise<void>}}).ArisSelectionModule.open(id), guides[0].id);
  await expect(page.locator("#guide-reader-title")).toHaveText(guides[0].title);
  await expect(page.locator("#guide-reader-frame")).toBeVisible();
  release();
  await page.waitForResponse(`**${guides[1].payloadURL}`);
  await expect(page.locator("#guide-reader-title")).toHaveText(guides[0].title);
  expect(await page.frameLocator("#guide-reader-frame").locator("title").textContent()).toBe(guides[0].title);
  // An uncached, delayed result arriving after close must not reopen the dialog.
  let releaseClosed!: () => void;
  const closedGate = new Promise<void>((resolve) => { releaseClosed = resolve; });
  await page.route(`**${guides[2].payloadURL}`, async (route) => { await closedGate; await route.continue(); });
  await page.evaluate((id) => { void (window as unknown as {ArisSelectionModule:{open:(id:string) => Promise<void>}}).ArisSelectionModule.open(id); }, guides[2].id);
  await expect(page.locator("#flow-guide-loading")).toBeVisible();
  await page.locator("#guide-reader-close").click();
  releaseClosed();
  await page.waitForResponse(`**${guides[2].payloadURL}`);
  await expect(page.locator("#guide-reader")).toBeHidden();
  await expect(page.locator("#guide-reader-frame")).toHaveAttribute("srcdoc", "");
});
