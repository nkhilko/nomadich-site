const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const root = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const source = fs.readFileSync(path.join(root, "app.js"), "utf8");

test("the static checkout cannot submit or serialize customer input", () => {
  assert.doesNotMatch(html, /<(?:form\b|button\b[^>]*\btype="submit")/i);
  assert.match(html, /<fieldset[^>]+id="order-controls"[^>]+disabled>/);
  assert.match(html, /form-action 'none'; connect-src 'none'/);
  assert.match(html, /Реальные заказы не принимаются/);
  for (const tag of html.matchAll(/<(?:input|textarea)\b[^>]*>/g)) {
    if (!tag[0].includes('type="radio"')) assert.doesNotMatch(tag[0], /\bname=/);
  }
});

test("the application source contains no submission or persistence implementation", () => {
  assert.doesNotMatch(source, /\b(?:fetch|XMLHttpRequest|sendBeacon|WebSocket|localStorage|sessionStorage|indexedDB|FormData)\b|formspree|zapier/i);
  assert.doesNotMatch(source, /\b(?:window\.)?location\s*[.=]|history\.(?:pushState|replaceState)\b/);
});

test("pickup and courier share local completion and clear synthetic values", () => {
  for (const delivery of ["pickup", "courier"]) {
    const input = () => ({ value: "synthetic-data", reportValidity: () => true });
    const ids = ["customer-name", "customer-phone", "customer-email", "address-line1",
                 "address-notes", "preferred-time", "order-comment"];
    const fields = Object.fromEntries(ids.map(id => [id, input()]));
    const selected = { value: delivery, checked: true };
    const controls = {
      disabled: false,
      querySelector: () => selected,
      querySelectorAll: selector => selector.startsWith("input[name") ? [selected] : Object.values(fields),
    };
    const elements = {
      ...fields,
      "order-form": { querySelector: () => null },
      "order-controls": controls,
      "address-fields": {},
      "form-feedback": { replaceChildren() {}, scrollIntoView() {} },
    };
    const deny = () => { throw new Error("Network, storage and navigation are disabled"); };
    const context = vm.createContext({
      document: {
        addEventListener() {},
        querySelector: () => selected.checked ? selected : null,
        getElementById: id => elements[id],
      },
      fetch: deny, XMLHttpRequest: deny, navigator: { sendBeacon: deny },
      get localStorage() { return deny(); },
      get sessionStorage() { return deny(); },
      get location() { return deny(); },
      confirmation: null,
    });
    vm.runInContext(source, context);
    vm.runInContext(`
      showDemoConfirmation = method => confirmation = method;
      renderOrderItems = () => {};
      lineItems = [{ sku: "las-bris", qty: 2 }];
      completeCheckout();
    `, context);
    assert.equal(context.confirmation, delivery);
    assert.equal(vm.runInContext("lineItems.length", context), 0);
    assert.equal(selected.checked, false);
    assert.deepEqual(Object.values(fields).map(field => field.value), Array(ids.length).fill(""));
  }
});
