// app.js — НОМАДИЧ

// Product catalog
const products = [
  {
    id: "las-bris",
    name: "LAS BRISAS",
    country: "El Salvador",
    brew: "Эспрессо",
    notes: "молочный шоколад, грецкий орех, коричневый сахар",
    weightGr: 250,
    priceRsd: 2390,
    soldOut: false
  },
  {
    id: "korongo",
    name: "KORONGO",
    country: "Tanzania",
    brew: "Эспрессо",
    notes: "ананас, мёд, грецкий орех",
    weightGr: 250,
    priceRsd: 2390,
    soldOut: false
  },
  {
    id: "womens",
    name: "WOMEN’S CROWN",
    country: "Rwanda",
    brew: "Эспрессо",
    notes: "бузина, мёд, локва",
    weightGr: 250,
    priceRsd: 2390,
    soldOut: false
  },
  {
    id: "bochesa",
    name: "BOCHESA SIDAMA",
    country: "Ethiopia",
    brew: "Фильтр",
    notes: "нектарин, мандарин, мёд",
    weightGr: 250,
    priceRsd: 2390,
    soldOut: false
  },
  {
    id: "chambaku",
    name: "CHAMBAKÚ DECAF",
    country: "Colombia",
    brew: "Декаф",
    notes: "шоколад 80%, мусковадо, золотое яблоко",
    weightGr: 250,
    priceRsd: 2390,
    soldOut: false
  }
];

// State: array of { sku, qty }
let lineItems = [];

// Helpers
function getProductById(id) {
  return products.find((p) => p.id === id) || null;
}

function formatRsd(value) {
  if (isNaN(value)) return "0 RSD";
  const int = Math.round(value);
  const str = String(int);
  const withSpaces = str.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `${withSpaces} RSD`;
}

function scrollToOrder() {
  const orderSection = document.getElementById("order");
  if (orderSection && typeof orderSection.scrollIntoView === "function") {
    orderSection.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function ensureLineItemsPlaceholder(container) {
  if (!container) return;
  if (lineItems.length === 0) {
    container.innerHTML = "";
    const placeholder = document.createElement("p");
    placeholder.textContent = "Добавьте позиции из списка кофе выше.";
    placeholder.setAttribute("aria-live", "polite");
    container.appendChild(placeholder);
  }
}

function renderOrderItems() {
  const container = document.getElementById("order-items");
  if (!container) return;

  container.innerHTML = "";

  if (lineItems.length === 0) {
    ensureLineItemsPlaceholder(container);
    renderSummary();
    return;
  }

  lineItems.forEach((item, index) => {
    const product = getProductById(item.sku);
    const row = document.createElement("div");
    row.className = "order-item-row";
    row.dataset.index = String(index);

    const selectId = `order-item-product-${index}`;
    const qtyInputId = `order-item-qty-${index}`;

    row.innerHTML = `
      <div class="order-item-main">
        <div class="order-item-product">
          <label for="${selectId}">Кофе</label>
          <select id="${selectId}" class="order-item-select">
            ${products
              .map((p) => {
                const selected = p.id === item.sku ? "selected" : "";
                const disabled = p.soldOut ? "disabled" : "";
                const label = `${p.name} · ${p.brew} · ${formatRsd(p.priceRsd)}`;
                return `<option value="${p.id}" ${selected} ${disabled}>${label}</option>`;
              })
              .join("")}
          </select>
        </div>

        <div class="order-item-qty">
          <span class="order-item-qty-label">Количество</span>
          <div class="order-item-qty-controls" aria-label="Количество">
            <button type="button" class="qty-btn qty-decrease" aria-label="Уменьшить количество">−</button>
            <input
              id="${qtyInputId}"
              class="qty-input"
              type="number"
              min="1"
              max="10"
              value="${item.qty}"
              aria-label="Количество, от 1 до 10"
            />
            <button type="button" class="qty-btn qty-increase" aria-label="Увеличить количество">+</button>
          </div>
        </div>
      </div>

      <div class="order-item-meta">
        <button type="button" class="order-item-remove" aria-label="Удалить позицию">Удалить</button>
      </div>
    `;

    container.appendChild(row);
  });

  renderSummary();
}

function renderSummary() {
  const summaryEl = document.getElementById("order-summary");
  if (!summaryEl) return;

  const itemCountEl = summaryEl.querySelector('[data-summary="items-count"]');
  const totalAmountEl = summaryEl.querySelector('[data-summary="total-amount"]');

  const totalItems = lineItems.reduce((sum, item) => sum + item.qty, 0);
  const totalPrice = lineItems.reduce((sum, item) => {
    const product = getProductById(item.sku);
    return product ? sum + product.priceRsd * item.qty : sum;
  }, 0);

  if (itemCountEl) itemCountEl.textContent = String(totalItems);
  if (totalAmountEl) totalAmountEl.textContent = formatRsd(totalPrice);
}

function addOrIncrementProduct(sku) {
  const product = getProductById(sku);
  if (!product || product.soldOut) return;

  const existing = lineItems.find((item) => item.sku === sku);
  if (existing) {
    existing.qty = Math.min(existing.qty + 1, 10);
  } else {
    lineItems.push({ sku, qty: 1 });
  }
  renderOrderItems();
}

function addEmptyLineItem() {
  const available = products.find((p) => !p.soldOut);
  if (!available) return;
  lineItems.push({ sku: available.id, qty: 1 });
  renderOrderItems();
}

function setupProductButtons() {
  const buttons = document.querySelectorAll('button[data-sku], .btn[data-sku]');
  if (!buttons.length) return;

  buttons.forEach((btn) => {
    btn.addEventListener("click", (event) => {
      const target = event.currentTarget;
      if (!(target instanceof HTMLElement)) return;
      const sku = target.getAttribute("data-sku");
      if (!sku) return;

      const product = getProductById(sku);
      if (!product || product.soldOut) return;

      addOrIncrementProduct(sku);
      scrollToOrder();
    });
  });
}

function setupAddItemButton() {
  const addBtn = document.getElementById("add-item");
  if (!addBtn) return;

  addBtn.addEventListener("click", () => {
    addEmptyLineItem();
  });
}

function setupOrderItemsEvents() {
  const container = document.getElementById("order-items");
  if (!container) return;

  container.addEventListener("change", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    const row = target.closest(".order-item-row");
    if (!row) return;
    const index = Number(row.dataset.index);
    if (Number.isNaN(index) || !lineItems[index]) return;

    if (target.classList.contains("order-item-select")) {
      const select = target;
      const value = select.value;
      if (!value) return;
      const product = getProductById(value);
      if (!product || product.soldOut) return;
      lineItems[index].sku = value;
      renderSummary();
    }

    if (target.classList.contains("qty-input")) {
      const input = target;
      const raw = Number(input.value);
      let qty = isNaN(raw) ? 1 : raw;
      qty = Math.max(1, Math.min(10, qty));
      input.value = String(qty);
      lineItems[index].qty = qty;
      renderSummary();
    }
  });

  container.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    const row = target.closest(".order-item-row");
    if (!row) return;
    const index = Number(row.dataset.index);
    if (Number.isNaN(index) || !lineItems[index]) return;

    // Remove item
    if (target.classList.contains("order-item-remove")) {
      lineItems.splice(index, 1);
      renderOrderItems();
      return;
    }

    // Qty controls
    if (target.classList.contains("qty-decrease") || target.classList.contains("qty-increase")) {
      const item = lineItems[index];
      if (!item) return;

      const delta = target.classList.contains("qty-decrease") ? -1 : 1;
      let newQty = item.qty + delta;
      newQty = Math.max(1, Math.min(10, newQty));
      item.qty = newQty;
      renderOrderItems();
    }
  });
}

function updateAddressVisibility() {
  const addressFieldset = document.getElementById("address-fields");
  const addressInput = document.getElementById("address-line1");
  const isCourier = document.querySelector('input[name="fulfillment"]:checked')?.value === "courier";
  addressFieldset.hidden = !isCourier;
  addressFieldset.disabled = !isCourier;
  addressInput.required = isCourier;
}

function resetCheckoutFields() {
  const controls = document.getElementById("order-controls");
  controls.querySelectorAll('input:not([type="radio"]), textarea').forEach((field) => {
    field.value = "";
  });
  controls.querySelectorAll('input[name="fulfillment"]').forEach((option) => {
    option.checked = false;
  });
  updateAddressVisibility();
}

function setupFulfillmentToggle() {
  document.querySelectorAll('input[name="fulfillment"]').forEach((radio) => {
    radio.addEventListener("change", updateAddressVisibility);
  });
  updateAddressVisibility();
}

function createFormMessageContainer(form) {
  const existing = form.querySelector(".form-message");
  if (existing) return existing;

  const container = document.createElement("div");
  container.className = "form-message";
  container.setAttribute("aria-live", "polite");
  container.style.marginTop = "16px";
  container.style.fontSize = "14px";
  form.appendChild(container);
  return container;
}

function showFormMessage(form, text, type) {
  if (!form) return;
  const container = createFormMessageContainer(form);
  container.textContent = text || "";
  container.style.color = type === "error" ? "#b00020" : "#111111";
}

function clearFormMessage(form) {
  if (!form) return;
  const container = form.querySelector(".form-message");
  if (container) container.textContent = "";
}

function showDemoConfirmation(fulfillment) {
  const feedbackRoot = document.getElementById("form-feedback");
  if (!feedbackRoot) return;

  const delivery = fulfillment === "courier" ? "Доставка курьером" : "Самовывоз";
  feedbackRoot.replaceChildren();

  const panel = document.createElement("div");
  panel.className = "feedback";

  const titleEl = document.createElement("p");
  titleEl.className = "feedback-title";
  titleEl.textContent = "Демо-заказ завершён";
  panel.appendChild(titleEl);

  const text = document.createElement("p");
  text.className = "feedback-text";
  text.textContent = `${delivery}. Реальный заказ не создан. Данные не отправлены и очищены.`;
  panel.appendChild(text);

  const actions = document.createElement("div");
  actions.className = "feedback-actions";

  const backLink = document.createElement("a");
  backLink.href = "#coffee";
  backLink.className = "btn secondary";
  backLink.textContent = "Вернуться к кофе";
  actions.appendChild(backLink);

  const newOrderBtn = document.createElement("button");
  newOrderBtn.type = "button";
  newOrderBtn.className = "btn primary";
  newOrderBtn.textContent = "Начать новое демо";
  newOrderBtn.addEventListener("click", () => {
    resetCheckoutFields();
    lineItems = [];
    renderOrderItems();
    clearFormMessage(document.getElementById("order-form"));
    feedbackRoot.replaceChildren();
    scrollToOrder();
  });
  actions.appendChild(newOrderBtn);
  panel.appendChild(actions);
  feedbackRoot.appendChild(panel);
}

function completeCheckout() {
  const form = document.getElementById("order-form");
  const controls = document.getElementById("order-controls");
  if (controls.disabled) return;
  clearFormMessage(form);
  document.getElementById("form-feedback").replaceChildren();

  if (lineItems.length === 0) {
    showFormMessage(form, "Добавьте хотя бы одну позицию в корзину.", "error");
    return;
  }

  const fulfillment = controls.querySelector('input[name="fulfillment"]:checked')?.value;
  if (!fulfillment) {
    showFormMessage(form, "Выберите доставку или самовывоз.", "error");
    return;
  }

  const fields = ["customer-name", "customer-phone", "customer-email"];
  if (fulfillment === "courier") fields.push("address-line1");
  for (const id of fields) {
    const field = document.getElementById(id);
    if (!field.value.trim() || !field.reportValidity()) {
      showFormMessage(form, "Проверьте примеры данных в обязательных полях.", "error");
      field.focus();
      return;
    }
  }

  resetCheckoutFields();
  lineItems = [];
  renderOrderItems();
  showDemoConfirmation(fulfillment);
  const feedback = document.getElementById("form-feedback");
  feedback.scrollIntoView({ behavior: "smooth", block: "center" });
}

document.addEventListener("DOMContentLoaded", () => {
  const checkout = document.getElementById("order-form");
  setupProductButtons();
  setupAddItemButton();
  setupOrderItemsEvents();
  setupFulfillmentToggle();
  renderOrderItems();
  document.getElementById("complete-checkout").addEventListener("click", completeCheckout);
  checkout.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.isComposing &&
        event.target instanceof HTMLInputElement && event.target.id !== "" &&
        ["text", "email", "tel"].includes(event.target.type)) {
      event.preventDefault();
      completeCheckout();
    }
  });
  window.addEventListener("pagehide", resetCheckoutFields);
  document.getElementById("order-controls").disabled = false;
  document.getElementById("checkout-unavailable").hidden = true;
});
