const currency = new Intl.NumberFormat("es-CR", {
  style: "currency",
  currency: "CRC",
  maximumFractionDigits: 0,
});

const shippingFee = 3000;
const catalogVersion = "2026-05-07-colores-detalle";
const isAdmin = new URLSearchParams(window.location.search).get("admin") === "1";
const sellerPhone = "50660760919";
const sinpePhone = "72592308";
const sinpeName = "Yader Fernando Flores Lopez";
const colorSwatches = {
  "Negro": "#111111",
  "Azul oscuro": "#17294f",
  "Musgo": "#566b45",
  "Cafe": "#6b4631",
  "Gasolina": "#0f5c63",
  "Fucsia": "#d21f7a",
  "Blanco": "#f8f5ef",
  "Rey": "#174fb8",
  "Magenta": "#b2168a",
  "Rojo oscuro": "#6f1d22",
  "Manzana": "#77b82a",
};

const storageKeys = {
  products: "whatsapp-shop-products",
  productVersion: "whatsapp-shop-product-version",
  cart: "whatsapp-shop-cart",
  seller: "whatsapp-shop-seller",
  sinpePhone: "whatsapp-shop-sinpe-phone",
  sinpeName: "whatsapp-shop-sinpe-name",
};

let products = loadProducts();
let cart = loadJSON(storageKeys.cart, []);
let activeDesign = "Todos";
let searchTerm = "";

const grid = document.querySelector("#productGrid");
const tabs = document.querySelector("#categoryTabs");
const cartDrawer = document.querySelector("#cartDrawer");
const overlay = document.querySelector("#overlay");
const cartItems = document.querySelector("#cartItems");
const productDialog = document.querySelector("#productDialog");
const settingsDialog = document.querySelector("#settingsDialog");
const orderDialog = document.querySelector("#orderDialog");
const imageDialog = document.querySelector("#imageDialog");

function loadJSON(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) || fallback;
  } catch {
    return fallback;
  }
}

function loadProducts() {
  if (localStorage.getItem(storageKeys.productVersion) !== catalogVersion) {
    localStorage.setItem(storageKeys.products, JSON.stringify(window.INITIAL_PRODUCTS || []));
    localStorage.setItem(storageKeys.productVersion, catalogVersion);
  }
  return loadJSON(storageKeys.products, window.INITIAL_PRODUCTS || []);
}

function saveProducts() {
  localStorage.setItem(storageKeys.products, JSON.stringify(products));
  localStorage.setItem(storageKeys.productVersion, catalogVersion);
}

function saveCart() {
  localStorage.setItem(storageKeys.cart, JSON.stringify(cart));
}

function formatList(value) {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

function cleanText(value, max = 160) {
  return String(value || "").replace(/[<>]/g, "").trim().slice(0, max);
}

function renderCategories() {
  const designs = ["Todos", ...new Set(products.map((product) => product.design || product.category))];
  tabs.innerHTML = designs
    .map((design) => `<button class="tab ${design === activeDesign ? "active" : ""}" type="button" data-design="${design}">${design}</button>`)
    .join("");
}

function filteredProducts() {
  return products.filter((product) => {
    const design = product.design || product.category;
    const inDesign = activeDesign === "Todos" || design === activeDesign;
    const haystack = `${product.name} ${product.category} ${design}`.toLowerCase();
    return inDesign && haystack.includes(searchTerm.toLowerCase());
  }).sort((a, b) => (a.sortOrder || 9999) - (b.sortOrder || 9999));
}

function renderProducts() {
  const visible = filteredProducts();
  document.querySelector("#productTotal").textContent = visible.length;
  grid.innerHTML = visible.map(renderProductCard).join("");
}

function renderColorGuide() {
  const colorList = document.querySelector("#colorList");
  if (!colorList) return;
  const colors = [...new Set(products.flatMap((product) => product.colors || []))];
  colorList.innerHTML = colors.map((color) => `
    <span class="color-chip">
      <span class="swatch" style="--swatch: ${colorSwatches[color] || "#d8d0c7"}"></span>
      ${color}
    </span>
  `).join("");
}

function renderProductCard(product) {
  const sizes = product.sizes.map((size) => `<option value="${size}">${size}</option>`).join("");
  const colors = product.colors.map((color) => `<option value="${color}">${color}</option>`).join("");
  const editButton = isAdmin
    ? `<button class="ghost-btn edit-btn" type="button" aria-label="Editar ${product.name}">Editar</button>`
    : "";
  return `
    <article class="product-card" data-id="${product.id}">
      <img class="product-image" src="${product.image}" alt="${product.name}" loading="lazy" />
      <div class="product-body">
        <div class="product-meta">
          <span class="category-label">${product.design || product.category}</span>
          <span class="price">${currency.format(product.price)}</span>
        </div>
        <h3>${product.name}</h3>
        <div class="options">
          <select class="size-select" aria-label="Talla">${sizes}</select>
          <select class="color-select" aria-label="Color">${colors}</select>
        </div>
        <div class="qty-row">
          <input class="qty-input" type="number" min="1" value="1" aria-label="Cantidad" />
          <input class="note-input" type="text" placeholder="Nota opcional" aria-label="Nota" />
        </div>
        <div class="card-actions ${isAdmin ? "" : "customer-actions"}">
          <button class="primary-btn add-btn" type="button">Agregar</button>
          ${editButton}
        </div>
      </div>
    </article>
  `;
}

function renderCart() {
  document.querySelector("#cartCount").textContent = cart.reduce((sum, item) => sum + item.quantity, 0);
  document.querySelector("#cartSubtotal").textContent = currency.format(cartSubtotal());
  document.querySelector("#shippingTotal").textContent = currency.format(deliveryTotal());
  document.querySelector("#cartTotal").textContent = currency.format(cartSubtotal());
  document.querySelector("#shippingRow").style.display = "none";
  document.querySelector("#orderSubtotal").textContent = currency.format(cartSubtotal());
  document.querySelector("#orderShippingTotal").textContent = currency.format(deliveryTotal());
  document.querySelector("#orderTotal").textContent = currency.format(cartTotal());
  document.querySelector("#orderShippingRow").style.display = isShipping() ? "flex" : "none";
  renderShippingFields();
  renderSinpeBox();

  if (!cart.length) {
    cartItems.innerHTML = `<p class="hint">El carrito esta vacio.</p>`;
    return;
  }

  cartItems.innerHTML = cart.map((item, index) => `
    <div class="cart-line">
      <img src="${item.image}" alt="${item.name}" />
      <div>
        <strong>${item.name}</strong>
        <span>${item.quantity} x ${currency.format(item.price)}</span>
        <span>Talla ${item.size} · ${item.color}${item.note ? ` · ${item.note}` : ""}</span>
      </div>
      <button class="icon-btn remove-item" type="button" data-index="${index}" aria-label="Quitar">x</button>
    </div>
  `).join("");
}

function cartSubtotal() {
  return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

function deliveryTotal() {
  return isShipping() ? shippingFee : 0;
}

function cartTotal() {
  return cartSubtotal() + deliveryTotal();
}

function isShipping() {
  return document.querySelector("#deliveryMethod").value === "shipping";
}

function getPaymentLabel() {
  const method = document.querySelector("#paymentMethod").value;
  const labels = {
    sinpe: "SINPE Movil",
  };
  return labels[method] || method;
}

function getCorreosDeliveryType() {
  return document.querySelector("input[name='correosDeliveryType']:checked").value;
}

function renderShippingFields() {
  const shipping = isShipping();
  const deliveryType = getCorreosDeliveryType();
  document.querySelector("#shippingFields").classList.toggle("show", shipping);
  document.querySelector("#addressField").style.display = shipping && deliveryType === "address" ? "grid" : "none";
  document.querySelector("#branchField").classList.toggle("show", shipping && deliveryType === "branch");
}

function getSinpeText() {
  return `${sinpePhone} a nombre de ${sinpeName}`;
}

function renderSinpeBox() {
  const box = document.querySelector("#sinpeBox");
  const display = document.querySelector("#sinpeDisplay");
  const isSinpe = document.querySelector("#paymentMethod").value === "sinpe";
  box.style.display = isSinpe ? "grid" : "none";
  const sinpeText = getSinpeText();
  display.textContent = `SINPE: ${sinpeText}`;
}

function addToCart(card) {
  const product = products.find((item) => item.id === card.dataset.id);
  const quantity = Math.max(1, Number(card.querySelector(".qty-input").value || 1));
  cart.push({
    id: product.id,
    name: product.name,
    price: product.price,
    image: product.image,
    quantity,
    size: card.querySelector(".size-select").value,
    color: card.querySelector(".color-select").value,
    note: card.querySelector(".note-input").value.trim(),
  });
  saveCart();
  renderCart();
}

function openCart() {
  cartDrawer.classList.add("open");
  overlay.classList.add("show");
}

function closeCart() {
  cartDrawer.classList.remove("open");
  overlay.classList.remove("show");
}

function openEditor(product) {
  document.querySelector("#dialogTitle").textContent = product.name;
  document.querySelector("#editId").value = product.id;
  document.querySelector("#editName").value = product.name;
  document.querySelector("#editCategory").value = product.category;
  document.querySelector("#editPrice").value = product.price;
  document.querySelector("#editSizes").value = product.sizes.join(", ");
  document.querySelector("#editColors").value = product.colors.join(", ");
  document.querySelector("#editImage").value = product.image;
  document.querySelector("#editImageFile").value = "";
  productDialog.showModal();
}

function openImagePreview(product) {
  document.querySelector("#largeProductImage").src = product.image;
  document.querySelector("#largeProductImage").alt = product.name;
  document.querySelector("#largeProductName").textContent = product.name;
  imageDialog.showModal();
}

function saveProductEdits(event) {
  event.preventDefault();
  const id = document.querySelector("#editId").value;
  const product = products.find((item) => item.id === id);
  const file = document.querySelector("#editImageFile").files[0];

  const applyChanges = (imageValue) => {
    product.name = document.querySelector("#editName").value.trim();
    product.category = document.querySelector("#editCategory").value.trim();
    product.price = Number(document.querySelector("#editPrice").value || 0);
    product.sizes = formatList(document.querySelector("#editSizes").value);
    product.colors = formatList(document.querySelector("#editColors").value);
    product.image = imageValue || document.querySelector("#editImage").value.trim();
    saveProducts();
    renderCategories();
    renderProducts();
    productDialog.close();
  };

  if (!file) {
    applyChanges();
    return;
  }

  const reader = new FileReader();
  reader.onload = () => applyChanges(reader.result);
  reader.readAsDataURL(file);
}

function buildWhatsappMessage() {
  const customer = document.querySelector("#customerName").value.trim();
  const deliveryMethod = isShipping() ? "Envio por Correos de Costa Rica" : "Retiro o coordinar";
  const deliveryType = getCorreosDeliveryType();
  const province = document.querySelector("#deliveryProvince").value.trim();
  const canton = document.querySelector("#deliveryCanton").value.trim();
  const district = document.querySelector("#deliveryDistrict").value.trim();
  const address = document.querySelector("#deliveryAddress").value.trim();
  const branch = document.querySelector("#deliveryBranch").value.trim();
  const paymentMethod = getPaymentLabel();
  const sinpeText = getSinpeText();
  const lines = [
    "Hola, quiero hacer este pedido:",
    customer ? `Cliente: ${customer}` : "",
    `Entrega: ${deliveryMethod}`,
    isShipping() ? `Modalidad Correos: ${deliveryType === "address" ? "Entrega a domicilio" : "Retiro en sucursal"}` : "",
    isShipping() ? `Provincia: ${province}` : "",
    isShipping() ? `Canton: ${canton}` : "",
    isShipping() ? `Distrito: ${district}` : "",
    isShipping() && deliveryType === "address" ? `Direccion exacta: ${address}` : "",
    isShipping() && deliveryType === "branch" ? `Sucursal indicada: ${branch}` : "",
    `Pago: ${paymentMethod}`,
    paymentMethod === "SINPE Movil" && sinpeText ? `SINPE: ${sinpeText}` : "",
    "",
    ...cart.map((item, index) => `${index + 1}. ${item.name}
Cantidad: ${item.quantity}
Talla: ${item.size}
Color: ${item.color}
Precio: ${currency.format(item.price)}
Subtotal: ${currency.format(item.price * item.quantity)}${item.note ? `
Nota: ${item.note}` : ""}`),
    "",
    `Productos: ${currency.format(cartSubtotal())}`,
    isShipping() ? `Envio: ${currency.format(deliveryTotal())}` : "",
    `Total: ${currency.format(cartTotal())}`,
  ].filter(Boolean);
  return lines.join("\n");
}

function sendWhatsappOrder(event) {
  if (event) event.preventDefault();
  if (!cart.length) return;
  if (!validateCheckout()) return;
  const seller = sellerPhone.replace(/\D/g, "");
  const text = encodeURIComponent(buildWhatsappMessage());
  const url = seller ? `https://wa.me/${seller}?text=${text}` : `https://wa.me/?text=${text}`;
  window.open(url, "_blank");
  orderDialog.close();
}

function openOrderForm() {
  if (!cart.length) {
    openCart();
    return;
  }
  closeCart();
  renderCart();
  orderDialog.showModal();
}

function requireField(selector, message) {
  const field = document.querySelector(selector);
  if (field.value.trim()) return true;
  field.setCustomValidity(message);
  field.reportValidity();
  field.setCustomValidity("");
  field.focus();
  return false;
}

function validateCheckout() {
  if (!requireField("#customerName", "Ingresa el nombre completo del cliente.")) return false;
  if (!isShipping()) return true;

  if (!requireField("#deliveryProvince", "Selecciona la provincia para Correos de Costa Rica.")) return false;
  if (!requireField("#deliveryCanton", "Ingresa el canton para Correos de Costa Rica.")) return false;
  if (!requireField("#deliveryDistrict", "Ingresa el distrito para Correos de Costa Rica.")) return false;

  if (getCorreosDeliveryType() === "address") {
    return requireField("#deliveryAddress", "Ingresa la direccion exacta con senas y puntos de referencia.");
  }

  return requireField("#deliveryBranch", "Indica la sucursal de Correos de Costa Rica donde se retirara el pedido.");
}

document.querySelector("#searchInput").addEventListener("input", (event) => {
  searchTerm = event.target.value;
  renderProducts();
});

tabs.addEventListener("click", (event) => {
  if (!event.target.matches(".tab")) return;
  activeDesign = event.target.dataset.design;
  renderCategories();
  renderProducts();
});

grid.addEventListener("click", (event) => {
  const card = event.target.closest(".product-card");
  if (!card) return;
  if (event.target.matches(".product-image")) openImagePreview(products.find((item) => item.id === card.dataset.id));
  if (event.target.matches(".add-btn")) addToCart(card);
  if (event.target.matches(".edit-btn")) openEditor(products.find((item) => item.id === card.dataset.id));
});

cartItems.addEventListener("click", (event) => {
  if (!event.target.matches(".remove-item")) return;
  cart.splice(Number(event.target.dataset.index), 1);
  saveCart();
  renderCart();
});

document.querySelector("#cartToggle").addEventListener("click", openCart);
document.querySelector("#closeCart").addEventListener("click", closeCart);
overlay.addEventListener("click", closeCart);
document.querySelector("#clearCart").addEventListener("click", () => {
  cart = [];
  saveCart();
  renderCart();
});
document.querySelector("#sendWhatsapp").addEventListener("click", openOrderForm);
document.querySelector("#orderForm").addEventListener("submit", sendWhatsappOrder);
document.querySelector("#deliveryMethod").addEventListener("change", renderCart);
document.querySelector("#paymentMethod").addEventListener("change", renderCart);
document.querySelectorAll("input[name='correosDeliveryType']").forEach((input) => {
  input.addEventListener("change", renderCart);
});

document.querySelector("#productForm").addEventListener("submit", saveProductEdits);
document.querySelector("#deleteProduct").addEventListener("click", () => {
  const id = document.querySelector("#editId").value;
  products = products.filter((item) => item.id !== id);
  saveProducts();
  renderCategories();
  renderProducts();
  productDialog.close();
});

if (isAdmin) {
  document.querySelectorAll(".admin-only").forEach((element) => {
    element.hidden = false;
  });
}

document.querySelector("#settingsBtn").addEventListener("click", () => {
  document.querySelector("#sellerPhone").value = sellerPhone;
  document.querySelector("#sinpePhone").value = sinpePhone;
  document.querySelector("#sinpeName").value = sinpeName;
  settingsDialog.showModal();
});

document.querySelector("#settingsForm").addEventListener("submit", (event) => {
  event.preventDefault();
  renderCart();
  settingsDialog.close();
});

document.querySelectorAll(".close-dialog").forEach((button) => {
  button.addEventListener("click", () => button.closest("dialog").close());
});

renderCategories();
renderColorGuide();
renderProducts();
renderCart();
