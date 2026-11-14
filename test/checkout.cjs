const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("playwright");

const repo = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(repo, "index.html"), "utf8");
const source = fs.readFileSync(path.join(repo, "app.js"), "utf8");
const origin = "http://checkout.test";
const mock = origin + "/mock-order";

async function run() {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ["--no-sandbox", "--disable-background-networking"] });
  try {
    for (const mode of ["no-js", "missing", "failed", "working"]) {
      const context = await browser.newContext({ javaScriptEnabled: mode !== "no-js", serviceWorkers: "block" });
      const page = await context.newPage();
      const submitted = [];
      const unexpected = [];
      await context.route("**/*", async route => {
        const req = route.request();
        const url = req.url();
        if (url === origin + "/" && req.method() === "GET") return route.fulfill({ contentType: "text/html", body: html });
        if (url === origin + "/app.js") {
          if (mode === "missing") return route.abort();
          let code = mode === "failed" ? 'throw new Error("Synthetic initialization failure");' : source;
          code = code.replace(/const FORMSPREE_URL = "[^"]*";/, `const FORMSPREE_URL = "${mock}";`);
          return route.fulfill({ contentType: "text/javascript", body: code });
        }
        if (url === mock) {
          submitted.push({ method: req.method(), payload: req.postDataJSON() });
          return route.fulfill({ json: { ok: true }, headers: { "access-control-allow-origin": origin } });
        }
        if (req.isNavigationRequest() || req.method() !== "GET") unexpected.push(url);
        return route.abort();
      });
      await page.goto(origin + "/");
      const button = page.locator('#order-form button[type="submit"]');
      const name = page.locator("#customer-name");
      if (mode !== "working") {
        assert.equal(await button.isDisabled(), true, mode);
        assert.equal(await name.isDisabled(), true, mode);
        await button.dispatchEvent("click");
        await name.press("Enter");
        assert.equal(page.url(), origin + "/", mode);
        assert.deepEqual(submitted, [], mode);
        assert.deepEqual(unexpected, [], mode);
      } else {
        assert.equal(await button.isEnabled(), true);
        for (const fulfillment of ["pickup", "courier"]) {
          await page.locator("button[data-sku], .btn[data-sku]").first().click();
          await name.fill("Synthetic Recipient");
          await page.locator('#order-form input[type="email"]').fill("sample@example.invalid");
          await page.locator('#order-form input[type="tel"]').fill("000000000");
          await page.locator('input[value="courier"]').check();
          await page.locator("#address-line1").fill("100 Synthetic Street");
          await page.locator("#address-notes").fill("Fictional note");
          await page.locator("#preferred-time").fill("Synthetic window");
          await page.locator("#order-comment").fill("Fictional delivery comment");
          await page.locator('input[value="pickup"]').check();
          // Programmatically populate the hidden inputs, as autofill can do.
          await page.locator("#address-line1").evaluate(el => el.value = "100 Synthetic Street");
          if (fulfillment === "courier") await page.locator('input[value="courier"]').check();
          const response = page.waitForResponse(mock);
          if (fulfillment === "pickup") await name.press("Enter");
          else await button.click();
          await response;
          const { method, payload } = submitted.at(-1);
          assert.equal(method, "POST");
          assert.equal(payload.fulfillment, fulfillment);
          for (const key of ["address", "preferredTime", "comment"]) {
            assert.equal(Object.hasOwn(payload, key), fulfillment === "courier");
          }
          if (fulfillment === "courier") assert.equal(payload.address.line1, "100 Synthetic Street");
          await page.waitForFunction(() => !document.querySelector('#order-form button[type="submit"]').disabled);
        }
        assert.equal(submitted.length, 2);
        assert.deepEqual(unexpected, []);
      }
      await context.close();
    }
  } finally {
    await browser.close();
  }
}
run().then(() => console.log("Checkout smoke passed"), error => { console.error(error); process.exitCode = 1; });
