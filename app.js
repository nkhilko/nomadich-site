// app.js — НОМАДИЧ

const FORMSPREE_URL = "https://formspree.io/f/xvzbybjv";
const ZAPIER_HOOK_URL = "";

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
  } else {
    window.location.hash = "#order";
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

function setupFulfillmentToggle() {
  const fulfillmentRadios = document.querySelectorAll('input[name="fulfillment"]');
  if (!fulfillmentRadios.length) return;

  const addressFieldset = document.getElementById("address-fields");
  const addressInput = document.getElementById("address-line1");

  function updateAddressVisibility() {
    let fulfillmentValue = "";
    fulfillmentRadios.forEach((radio) => {
      if (radio instanceof HTMLInputElement && radio.checked) {
        fulfillmentValue = radio.value;
      }
    });

    const isCourier = fulfillmentValue === "courier";

    if (addressFieldset) {
      addressFieldset.style.display = isCourier ? "" : "none";
    }

    if (addressInput instanceof HTMLInputElement) {
      addressInput.required = isCourier;
      if (!isCourier) {
        addressInput.setCustomValidity("");
      }
    }
  }

  fulfillmentRadios.forEach((radio) => {
    radio.addEventListener("change", updateAddressVisibility);
  });

  // Initial state
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

function renderFeedback(type, options = {}) {
  const feedbackRoot = document.getElementById("form-feedback");
  if (!feedbackRoot) return;

  const { title, text, showActions } = options;

  feedbackRoot.innerHTML = "";

  if (!title && !text) return;

  const panel = document.createElement("div");
  panel.className = "feedback";

  const titleEl = document.createElement("p");
  titleEl.className = "feedback-title";
  titleEl.textContent = title || "";
  panel.appendChild(titleEl);

  if (text) {
    const textEl = document.createElement("p");
    textEl.className = "feedback-text";
    textEl.textContent = text;
    panel.appendChild(textEl);
  }

  if (showActions) {
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
    newOrderBtn.textContent = "Новый заказ";
    newOrderBtn.addEventListener("click", () => {
      const form = document.getElementById("order-form");
      if (form instanceof HTMLFormElement) {
        form.reset();
      }
      lineItems = [];
      renderOrderItems();
      feedbackRoot.innerHTML = "";
      const helper = document.getElementById("submit-helper");
      if (helper) helper.style.display = "";
      scrollToOrder();
    });

    actions.appendChild(newOrderBtn);
    panel.appendChild(actions);
  }

  feedbackRoot.appendChild(panel);
}

function buildPayload(form) {
  const nameInput = form.querySelector('input[data-field="name"]');
  const phoneInput = form.querySelector('input[data-field="phone"]');
  const emailInput = form.querySelector('input[data-field="email"]');
  const addressInput = form.querySelector('input[data-field="address_line1"]');
  const addressNotesInput = form.querySelector('input[data-field="address_notes"]');
  const preferredTimeInput = form.querySelector('input[data-field="preferred_time"]');
  const commentInput = form.querySelector('textarea[data-field="comment"]');
  const fulfillmentRadios = form.querySelectorAll('input[name="fulfillment"]');

  let fulfillment = "";
  fulfillmentRadios.forEach((radio) => {
    if (radio instanceof HTMLInputElement && radio.checked) {
      fulfillment = radio.value;
    }
  });

  const itemsDetailed = lineItems.map((item) => {
    const product = getProductById(item.sku);
    if (!product) {
      return {
        sku: item.sku,
        name: "Неизвестно",
        brew: "",
        qty: item.qty,
        priceRsd: 0,
        lineTotalRsd: 0
      };
    }
    const lineTotal = product.priceRsd * item.qty;
    return {
      sku: product.id,
      name: product.name,
      brew: product.brew,
      qty: item.qty,
      priceRsd: product.priceRsd,
      lineTotalRsd: lineTotal
    };
  });

  const totalItems = lineItems.reduce((sum, item) => sum + item.qty, 0);
  const totalPrice = lineItems.reduce((sum, item) => {
    const product = getProductById(item.sku);
    return product ? sum + product.priceRsd * item.qty : sum;
  }, 0);

  return {
    timestamp: new Date().toISOString(),
    customer: {
      name: nameInput instanceof HTMLInputElement ? nameInput.value.trim() : "",
      phone: phoneInput instanceof HTMLInputElement ? phoneInput.value.trim() : "",
      email: emailInput instanceof HTMLInputElement ? emailInput.value.trim() : ""
    },
    fulfillment,
    ...(fulfillment === "courier" ? {
      address: {
        line1: addressInput instanceof HTMLInputElement ? addressInput.value.trim() : "",
        notes: addressNotesInput instanceof HTMLInputElement ? addressNotesInput.value.trim() : ""
      },
      preferredTime: preferredTimeInput instanceof HTMLInputElement ? preferredTimeInput.value.trim() : "",
      comment: commentInput instanceof HTMLTextAreaElement ? commentInput.value.trim() : ""
    } : {}),
    items: itemsDetailed,
    totals: {
      itemsCount: totalItems,
      amountRsd: totalPrice,
      formattedAmount: formatRsd(totalPrice)
    }
  };
}

async function handleFormSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  if (!(form instanceof HTMLFormElement)) return;

  clearFormMessage(form);

  const submitButton = form.querySelector('button[type="submit"]');
  const honeypot = form.querySelector('input[data-field="company"]');
  const nameInput = form.querySelector('input[data-field="name"]');
  const phoneInput = form.querySelector('input[data-field="phone"]');
  const emailInput = form.querySelector('input[data-field="email"]');
  const addressInput = form.querySelector('input[data-field="address_line1"]');
  const fulfillmentRadios = form.querySelectorAll('input[name="fulfillment"]');

  // Honeypot spam check
  if (honeypot instanceof HTMLInputElement && honeypot.value.trim() !== "") {
    return;
  }

  // Items validation
  if (lineItems.length === 0) {
    showFormMessage(form, "Добавьте хотя бы одну позицию в заказ.", "error");
    return;
  }

  const totalItems = lineItems.reduce((sum, item) => sum + item.qty, 0);
  if (totalItems === 0) {
    showFormMessage(form, "Количество позиций должно быть больше нуля.", "error");
    return;
  }

  // Required fields
  if (!(nameInput instanceof HTMLInputElement) || !nameInput.value.trim()) {
    showFormMessage(form, "Укажите, пожалуйста, ваше имя.", "error");
    if (nameInput) nameInput.focus();
    return;
  }

  if (!(phoneInput instanceof HTMLInputElement) || !phoneInput.value.trim()) {
    showFormMessage(form, "Укажите, пожалуйста, ваш телефон.", "error");
    if (phoneInput) phoneInput.focus();
    return;
  }

  if (!(emailInput instanceof HTMLInputElement) || !emailInput.value.trim()) {
    showFormMessage(form, "Укажите, пожалуйста, ваш email.", "error");
    if (emailInput) emailInput.focus();
    return;
  }

  let fulfillment = "";
  fulfillmentRadios.forEach((radio) => {
    if (radio instanceof HTMLInputElement && radio.checked) {
      fulfillment = radio.value;
    }
  });

  if (!fulfillment) {
    showFormMessage(form, "Выберите способ получения: курьер или самовывоз.", "error");
    return;
  }

  // Address required if courier
  if (fulfillment === "courier") {
    if (!(addressInput instanceof HTMLInputElement) || !addressInput.value.trim()) {
      showFormMessage(form, "Укажите, пожалуйста, адрес для доставки.", "error");
      if (addressInput) addressInput.focus();
      return;
    }
  }

  const payload = buildPayload(form);

  // If Formspree URL is not configured
  if (FORMSPREE_URL.includes("XXXX")) {
    showFormMessage(
      form,
      "Форма заказа ещё не настроена. Укажите рабочий Formspree endpoint в коде.",
      "error"
    );
    return;
  }

  // Disable submit during sending
  if (submitButton instanceof HTMLButtonElement) {
    submitButton.disabled = true;
  }

  try {
    const response = await fetch(FORMSPREE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error("Request failed");
    }

    if (ZAPIER_HOOK_URL && typeof ZAPIER_HOOK_URL === "string") {
      try {
        await fetch(ZAPIER_HOOK_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(payload)
        });
      } catch {
        // Silent Zapier error
      }
    }

    clearFormMessage(form);
    form.reset();
    lineItems = [];
    renderOrderItems();
    setupFulfillmentToggle();
    renderFeedback("success", {
      title: "Спасибо! Заказ получен.",
      text: "Мы скоро свяжемся для подтверждения доставки/самовывоза.",
      showActions: true
    });
    const el = document.getElementById("form-feedback");
    if (el) {
      const y = el.getBoundingClientRect().top + window.scrollY - 80;
      window.scrollTo({ top: y, behavior: "smooth" });
    }
    const helper = document.getElementById("submit-helper");
    if (helper) helper.style.display = "none";
  } catch {
    renderFeedback("error", {
      title: "Ошибка отправки.",
      text: "Попробуйте ещё раз или свяжитесь с нами."
    });
    clearFormMessage(form);
  } finally {
    if (submitButton instanceof HTMLButtonElement) {
      submitButton.disabled = false;
    }
  }
}

function setupFormSubmit() {
  const form = document.getElementById("order-form");
  if (!(form instanceof HTMLFormElement)) return;
  form.addEventListener("submit", handleFormSubmit);
}

// Init
document.addEventListener("DOMContentLoaded", () => {
  setupProductButtons();
  setupAddItemButton();
  setupOrderItemsEvents();
  setupFulfillmentToggle();
  renderOrderItems();
  setupFormSubmit();
  document.getElementById("order-controls").disabled = false;
});