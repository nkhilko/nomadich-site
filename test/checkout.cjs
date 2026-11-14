const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("playwright");

const root = path.join(__dirname, "..");
const origin = "http://checkout.test";
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const source = fs.readFileSync(path.join(root, "app.js"), "utf8");
const files = new Map([["/", ["index.html", "text/html"]], ["/styles.css", ["styles.css", "text/css"]],
                       ["/assets/favicon.png", ["assets/favicon.png", "image/png"]]]);
for (const match of html.matchAll(/src="(assets\/[\w.-]+\.jpg)"/g)) files.set("/" + match[1], [match[1], "image/jpeg"]);

async function check(browser, mode) {
  const context = await browser.newContext({ javaScriptEnabled: mode !== "no-js", serviceWorkers: "block" });
  try {
    const page = await context.newPage();
    const unexpected = [];
    const navs = [];
    page.on("framenavigated", frame => { if (frame === page.mainFrame()) navs.push(frame.url()); });
    await context.route("**/*", route => {
      const request = route.request();
      const url = new URL(request.url());
      if (url.origin === origin && !url.search && request.method() === "GET") {
        if (url.pathname === "/app.js") {
          if (mode === "missing") return route.abort();
          const body = mode === "failed"
            ? source.replace("  setupFulfillmentToggle();", '  throw new Error("Synthetic initialization failure");')
            : source;
          return route.fulfill({ contentType: "text/javascript", body });
        }
        const asset = files.get(url.pathname);
        if (asset) {
          const [file, type] = asset;
          const full = path.join(root, file);
          return fs.existsSync(full)
            ? route.fulfill({ path: full, contentType: type })
            : route.fulfill({ status: 404 });
        }
      }
      unexpected.push({ url: request.url(), method: request.method() });
      return route.abort();
    });
    await page.goto(origin + "/");
    const button = page.locator("#complete-checkout");
    const name = page.locator("#customer-name");
    const feedback = page.locator("#form-feedback");
    const fields = ["customer-name", "customer-phone", "customer-email", "address-line1",
                    "address-notes", "preferred-time", "order-comment"];
    assert.equal(await page.locator("form").count(), 0, mode);
    const stableUrl = page.url();

    if (mode !== "working") {
      assert.equal(await button.isDisabled(), true, mode);
      assert.equal(await name.isDisabled(), true, mode);
      if (mode !== "no-js") {
        await button.dispatchEvent("click");
        await name.dispatchEvent("keydown", { key: "Enter", bubbles: true });
      }
      const box = await button.boundingBox();
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
      await page.keyboard.press("Enter");
      assert.equal(await feedback.innerText(), "", mode);
    } else {
      assert.equal(await button.isEnabled(), true);
      await button.click();
      assert.match(await page.locator(".form-message").innerText(), /Добавьте/);
      for (const delivery of ["pickup", "courier"]) {
        await page.locator("button[data-sku]").first().click();
        const total = page.locator('[data-summary="total-amount"]');
        assert.equal(await total.innerText(), "2 390 RSD");
        await page.locator(".qty-increase").click();
        assert.equal(await total.innerText(), "4 780 RSD");
        await page.locator("#add-item").click();
        assert.equal(await total.innerText(), "7 170 RSD");
        await page.locator(".order-item-remove").last().click();
        assert.equal(await total.innerText(), "4 780 RSD");
        await name.fill("Synthetic Recipient");
        await page.locator("#customer-phone").fill("000000000");
        await page.locator("#customer-email").fill("sample@example.invalid");
        await page.locator('input[value="courier"]').check();
        if (delivery === "courier") {
          await button.click();
          assert.match(await page.locator(".form-message").innerText(), /обязательных полях/);
        }
        await page.locator("#address-line1").fill("100 Synthetic Street");
        await page.locator("#address-notes").fill("Fictional note");
        await page.locator("#preferred-time").fill("Synthetic window");
        await page.locator("#order-comment").fill("Fictional delivery comment");
        await page.locator('input[value="pickup"]').check();
        assert.equal(await page.locator("#address-line1").isDisabled(), true);
        assert.equal(await page.locator("#address-fields").isHidden(), true);
        if (delivery === "courier") {
          await page.locator('input[value="courier"]').check();
          assert.equal(await page.locator("#address-line1").inputValue(), "100 Synthetic Street");
          await button.click();
        } else {
          await name.press("Enter");
        }
        assert.match(await feedback.innerText(), /Демо-заказ завершён/);
        assert.match(await feedback.innerText(), delivery === "courier" ? /Доставка курьером/ : /Самовывоз/);
        assert.doesNotMatch(await feedback.innerText(), /Synthetic|Fictional|sample@example/);
        for (const id of fields) assert.equal(await page.locator("#" + id).inputValue(), "", id);
        assert.equal(await total.innerText(), "0 RSD");
        await feedback.getByRole("button", { name: "Начать новое демо" }).click();
      }
      await name.fill("Synthetic value before page exit");
      await page.evaluate(() => window.dispatchEvent(new Event("pagehide")));
      assert.equal(await name.inputValue(), "");
      assert.deepEqual(await page.evaluate(() => [localStorage.length, sessionStorage.length]), [0, 0]);
      assert.deepEqual(await context.cookies(), []);
    }
    assert.equal(page.url(), stableUrl, mode);
    assert.deepEqual(navs, [origin + "/"], mode);
    assert.deepEqual(unexpected, [], mode);
    console.log(`PASS ${mode}: no submission request or navigation`);
  } finally {
    await context.close();
  }
}

async function run() {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ["--disable-background-networking"] });
  try {
    for (const mode of ["no-js", "missing", "failed", "working"]) await check(browser, mode);
  } finally {
    await browser.close();
  }
}
run().catch(error => { console.error(error); process.exitCode = 1; });
