const STORAGE_KEYS = {
  inventory: 'dressi.inventory',
  orderHistory: 'dressi.orderHistory'
};

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[character]));
}

window.DressiUtils = {
  escapeHtml
};

function loadStoredValue(key, fallback) {
  try {
    const storedValue = localStorage.getItem(key);
    return storedValue ? JSON.parse(storedValue) : fallback;
  } catch (error) {
    return fallback;
  }
}

function saveStoredValue(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    window.alert('Storage is full. Please use smaller images or connect a hosted database/storage service.');
  }
}

function isOldDemoInventory(items) {
  if (!Array.isArray(items) || items.length !== 8) return false;
  const demoSkus = [
    'DRS-FLW-104',
    'DRS-SAT-220',
    'DRS-CTL-318',
    'DRS-BDY-441',
    'DRS-MAX-515',
    'DRS-DNM-609',
    'DRS-SEQ-732',
    'DRS-LIN-884'
  ];
  return demoSkus.every(sku => items.some(item => item?.sku === sku));
}

function loadInventory() {
  const items = loadStoredValue(STORAGE_KEYS.inventory, window.dressInventory || []);
  if (isOldDemoInventory(items)) {
    saveStoredValue(STORAGE_KEYS.inventory, []);
    return [];
  }
  return items;
}

const supabaseClient = window.supabaseClient || null;
let inventory = loadInventory();
let currentFilter = 'all';

const els = {
  homePage: document.querySelector('#homePage'),
  shopPage: document.querySelector('#shopPage'),
  historyPage: document.querySelector('#historyPage'),
  cartPage: document.querySelector('#cartPage'),
  aboutPage: document.querySelector('#aboutPage'),
  goShopBtn: document.querySelector('#goShopBtn'),
  heroSlider: document.querySelector('#heroSlider'),
  heroPagination: document.querySelector('#heroPagination'),
  homeStockTotal: document.querySelector('#homeStockTotal'),
  navShopBtn: document.querySelector('#navShopBtn'),
  homeLinks: document.querySelectorAll('[data-home-link]'),
  shopTopHomeBtn: document.querySelector('#shopTopHomeBtn'),
  historyHomeBtn: document.querySelector('#historyHomeBtn'),
  historyShopBtn: document.querySelector('#historyShopBtn'),
  aboutHomeBtn: document.querySelector('#aboutHomeBtn'),
  aboutShopBtn: document.querySelector('#aboutShopBtn'),
  aboutHistoryBtn: document.querySelector('#aboutHistoryBtn'),
  downloadHistoryBtn: document.querySelector('#downloadHistoryBtn'),
  historySearch: document.querySelector('#historySearch'),
  historyFromDate: document.querySelector('#historyFromDate'),
  historyToDate: document.querySelector('#historyToDate'),
  clearHistoryDates: document.querySelector('#clearHistoryDates'),
  cartHomeBtn: document.querySelector('#cartHomeBtn'),
  cartShopBtn: document.querySelector('#cartShopBtn'),
  cartHistoryBtn: document.querySelector('#cartHistoryBtn'),
  viewStockBtn: document.querySelector('#viewStockBtn'),
  productGrid: document.querySelector('#productGrid'),
  cartCounts: document.querySelectorAll('[data-cart-count]'),
  pageNavButtons: document.querySelectorAll('[data-page-nav]'),
  search: document.querySelector('#globalSearch'),
  stockPanelOverlay: document.querySelector('#stockPanelOverlay'),
  stockPanelContent: document.querySelector('#stockPanelContent'),
  closeStockPanel: document.querySelector('#closeStockPanel'),
  cartButtons: document.querySelectorAll('.cart-btn'),
  cartPageContent: document.querySelector('#cartPageContent'),
  historyButtons: document.querySelectorAll('[data-history-open]'),
  aboutButtons: document.querySelectorAll('[data-about-open]'),
  historyPageContent: document.querySelector('#historyPageContent')
};

let activeStockItemId = inventory[0]?.id ?? null;
let uploadedImageDataUrl = '';
let placedOrderCount = 0;
let heroSlideIndex = 0;
let heroSlideTimer = null;
const cartItems = new Map();
let orderHistory = loadStoredValue(STORAGE_KEYS.orderHistory, []);
placedOrderCount = orderHistory.length;

function saveInventory() {
  saveStoredValue(STORAGE_KEYS.inventory, inventory);
}

function saveOrderHistory() {
  saveStoredValue(STORAGE_KEYS.orderHistory, orderHistory);
}

function saveAppData() {
  saveInventory();
  saveOrderHistory();
}

function replaceArrayContents(target, nextItems) {
  target.splice(0, target.length, ...nextItems);
}

function mapDressFromDb(row) {
  return {
    id: Number(row.id),
    name: row.name || '',
    sku: row.sku || '',
    type: row.type || '',
    size: row.size || '',
    color: row.color || '',
    colorHex: row.color_hex || '#ef4f5f',
    stock: Number(row.stock || 0),
    sold: Number(row.sold || 0),
    vendor: row.vendor || '',
    price: Number(row.price || 0),
    oldPrice: row.old_price === null || row.old_price === undefined ? undefined : Number(row.old_price),
    rating: Number(row.rating || 4),
    sale: Boolean(row.sale),
    image: row.image_url || 'https://images.unsplash.com/photo-1485968579580-b6d095142e6e?auto=format&fit=crop&w=700&q=80'
  };
}

function mapDressToDb(item) {
  return {
    name: item.name,
    sku: item.sku,
    type: item.type,
    size: item.size,
    color: item.color,
    color_hex: item.colorHex,
    stock: item.stock,
    sold: item.sold || 0,
    vendor: item.vendor,
    price: item.price,
    rating: item.rating || 4,
    image_url: item.image
  };
}

function mapOrderFromDb(row) {
  const createdAt = row.created_at ? new Date(row.created_at) : new Date();
  return {
    id: row.id,
    orderNo: row.order_no,
    customerName: row.customer_name || 'Walk-in Customer',
    items: Number(row.items || 0),
    total: Number(row.total || 0),
    date: row.date_text || createdAt.toLocaleString(),
    orderDate: row.order_date || dateInputValue(createdAt),
    lineItems: Array.isArray(row.line_items) ? row.line_items : [],
    names: row.names || ''
  };
}

function mapOrderToDb(order) {
  return {
    order_no: order.orderNo,
    customer_name: order.customerName,
    items: order.items,
    total: order.total,
    date_text: order.date,
    order_date: order.orderDate,
    line_items: order.lineItems,
    names: order.names
  };
}

function renderCurrentPage() {
  renderHeroSlider();
  if (!els.shopPage.classList.contains('hidden')) renderProducts();
  if (!els.cartPage.classList.contains('hidden')) renderCartPage();
  if (!els.historyPage.classList.contains('hidden')) renderHistoryPage();
}

async function loadInventoryFromSupabase() {
  if (!supabaseClient) return;
  const { data, error } = await supabaseClient.from('dresses').select('*').order('created_at', { ascending: true });
  if (error) {
    window.alert(`Could not load dresses from Supabase: ${error.message}`);
    return;
  }
  replaceArrayContents(inventory, (data || []).map(mapDressFromDb));
  activeStockItemId = inventory.find(item => item.id === activeStockItemId)?.id ?? inventory[0]?.id ?? null;
  saveInventory();
}

async function loadOrdersFromSupabase() {
  if (!supabaseClient) return;
  const { data, error } = await supabaseClient.from('orders').select('*').order('created_at', { ascending: false });
  if (error) {
    window.alert(`Could not load orders from Supabase: ${error.message}`);
    return;
  }
  orderHistory = (data || []).map(mapOrderFromDb);
  placedOrderCount = orderHistory.length;
  saveOrderHistory();
}

async function loadRemoteData() {
  if (!supabaseClient) {
    window.alert('Supabase is not connected. Check your internet connection and reload the page.');
    return;
  }
  await Promise.all([loadInventoryFromSupabase(), loadOrdersFromSupabase()]);
  renderCurrentPage();
}

async function insertDress(item) {
  if (!supabaseClient) throw new Error('Supabase is not connected.');
  const { data, error } = await supabaseClient.from('dresses').insert(mapDressToDb(item)).select().single();
  if (error) throw error;
  const savedItem = mapDressFromDb(data);
  inventory.push(savedItem);
  saveInventory();
  return savedItem;
}

async function updateDress(item) {
  if (!supabaseClient) throw new Error('Supabase is not connected.');
  const { error } = await supabaseClient.from('dresses').update(mapDressToDb(item)).eq('id', item.id);
  if (error) throw error;
  saveInventory();
  return item;
}

async function insertOrder(order) {
  if (!supabaseClient) throw new Error('Supabase is not connected.');
  const { data, error } = await supabaseClient.from('orders').insert(mapOrderToDb(order)).select().single();
  if (error) throw error;
  const savedOrder = mapOrderFromDb(data);
  orderHistory.unshift(savedOrder);
  saveOrderHistory();
  return savedOrder;
}

function subscribeToRealtimeUpdates() {
  if (!supabaseClient) return;
  supabaseClient
    .channel('dressi-live-data')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'dresses' }, async () => {
      await loadInventoryFromSupabase();
      renderCurrentPage();
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, async () => {
      await loadOrdersFromSupabase();
      renderCurrentPage();
    })
    .subscribe();
}

function currency(value) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
}

function dateInputValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function fallbackIconPath(name) {
  const paths = {
    'arrow-up-right': '<path d="M7 17L17 7"></path><path d="M9 7h8v8"></path>',
    'check-circle': '<path d="M20 11.1V12a8 8 0 1 1-4.7-7.3"></path><path d="M9 11l3 3L22 4"></path>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><path d="M7 10l5 5 5-5"></path><path d="M12 15V3"></path>',
    image: '<rect x="3" y="3" width="18" height="18" rx="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><path d="M21 15l-5-5L5 21"></path>',
    'package-search': '<path d="M21 10V8a2 2 0 0 0-1-1.7l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.7l7 4"></path><path d="M3.3 7L12 12l8.7-5"></path><path d="M12 22V12"></path><circle cx="17.5" cy="17.5" r="3.5"></circle><path d="M20 20l2 2"></path>',
    plus: '<path d="M12 5v14"></path><path d="M5 12h14"></path>',
    'receipt-text': '<path d="M4 2v20l3-2 3 2 3-2 3 2 3-2 1 .7V2z"></path><path d="M8 7h8"></path><path d="M8 11h8"></path><path d="M8 15h5"></path>',
    save: '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><path d="M17 21v-8H7v8"></path><path d="M7 3v5h8"></path>',
    search: '<circle cx="11" cy="11" r="8"></circle><path d="M21 21l-4.3-4.3"></path>',
    'shopping-bag': '<path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><path d="M3 6h18"></path><path d="M16 10a4 4 0 0 1-8 0"></path>',
    x: '<path d="M18 6L6 18"></path><path d="M6 6l12 12"></path>'
  };
  return paths[name] || '';
}

function renderFallbackIcons() {
  document.querySelectorAll('[data-icon]').forEach(icon => {
    const path = fallbackIconPath(icon.dataset.icon);
    if (!path || icon.querySelector('svg')) return;
    icon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;
  });
}

function refreshIcons() {
  if (window.lucide) {
    try {
      window.lucide.createIcons({ nameAttr: 'data-icon' });
      return;
    } catch (error) {
      renderFallbackIcons();
    }
    return;
  }
  renderFallbackIcons();
}

function totalStockCount() {
  return inventory.reduce((sum, item) => sum + Number(item.stock || 0), 0);
}

function heroProducts() {
  return inventory.slice(0, Math.min(4, inventory.length));
}

function showHeroSlide(index) {
  const slides = document.querySelectorAll('[data-hero-slide]');
  const dots = document.querySelectorAll('[data-hero-dot]');
  if (slides.length === 0) return;

  heroSlideIndex = (index + slides.length) % slides.length;
  slides.forEach((slide, slideIndex) => {
    slide.classList.toggle('active', slideIndex === heroSlideIndex);
  });
  dots.forEach((dot, dotIndex) => {
    dot.classList.toggle('active', dotIndex === heroSlideIndex);
    dot.setAttribute('aria-current', dotIndex === heroSlideIndex ? 'true' : 'false');
  });
}

function startHeroSlider() {
  clearInterval(heroSlideTimer);
  heroSlideTimer = setInterval(() => {
    showHeroSlide(heroSlideIndex + 1);
  }, 3200);
}

function renderHeroSlider() {
  const products = heroProducts();
  els.homeStockTotal.textContent = totalStockCount().toString();
  if (products.length === 0) {
    clearInterval(heroSlideTimer);
    els.heroSlider.innerHTML = `
      <article class="hero-slide active" data-hero-slide>
        <div class="history-empty-state">
          <span data-icon="package-search"></span>
          <strong>No dresses yet</strong>
          <p>Add your real stock from the shop page.</p>
        </div>
      </article>
    `;
    els.heroPagination.innerHTML = '';
    refreshIcons();
    return;
  }

  heroSlideIndex %= products.length;

  els.heroSlider.innerHTML = products.map((item, index) => `
    <article class="hero-slide ${index === heroSlideIndex ? 'active' : ''}" data-hero-slide>
      <img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.name)}">
      <div class="hero-slide-card">
        <span>${escapeHtml(item.type)}</span>
        <strong>${escapeHtml(item.name)}</strong>
        <p>${escapeHtml(item.stock)} pcs available | ${escapeHtml(item.size)} | ${escapeHtml(item.color)}</p>
      </div>
    </article>
  `).join('');

  els.heroPagination.innerHTML = products.map((item, index) => `
    <button class="hero-dot ${index === heroSlideIndex ? 'active' : ''}" type="button" data-hero-dot="${index}" aria-label="Show ${escapeHtml(item.name)}"></button>
  `).join('');

  showHeroSlide(heroSlideIndex);
  startHeroSlider();
}

function stockOptionLabel(item) {
  if (!item) return '';
  return `${item.name} | ${item.sku} | ${item.size} | ${item.color}`;
}

function filterStockSuggestions(term) {
  document.querySelectorAll('[data-stock-option]').forEach(button => {
    const item = inventory.find(product => product.id === Number(button.dataset.stockOption));
    const matches = stockOptionLabel(item).toLowerCase().includes(term);
    button.classList.toggle('hidden', !matches);
  });
}

function setActivePage(page) {
  els.pageNavButtons.forEach(button => {
    button.classList.toggle('active', button.dataset.pageNav === page);
  });
}

function filteredProducts() {
  const term = els.search.value.trim().toLowerCase();
  return inventory.filter(item => {
    const status = window.ProductCard.getStatus(item).label.toLowerCase();
    const matchesFilter = currentFilter === 'all' || status.includes(currentFilter) || (currentFilter === 'low' && status.includes('out'));
    const matchesSearch = [item.name, item.sku, item.type, item.size, item.color, item.vendor]
      .some(value => String(value ?? '').toLowerCase().includes(term));
    return matchesFilter && matchesSearch;
  });
}

function renderProducts() {
  const products = filteredProducts();
  els.productGrid.innerHTML = products.map(item => window.ProductCard.render(item)).join('');

  if (products.length === 0) {
    els.productGrid.innerHTML = '<p class="empty-state">No dresses match this search.</p>';
  }

  refreshIcons();
}

function updateCartCount() {
  const cartCount = Array.from(cartItems.values()).reduce((sum, quantity) => sum + quantity, 0);
  els.cartCounts.forEach(counter => {
    counter.textContent = cartCount.toString();
  });
}

function cartTotal() {
  return Array.from(cartItems.entries()).reduce((sum, [id, quantity]) => {
    const item = inventory.find(product => product.id === id);
    return item ? sum + item.price * quantity : sum;
  }, 0);
}

function cartMarkup() {
  const entries = Array.from(cartItems.entries());
  const cartCount = entries.reduce((sum, [, quantity]) => sum + quantity, 0);
  const rows = entries.map(([id, quantity]) => {
    const item = inventory.find(product => product.id === id);
    if (!item) return '';

    return `
      <article class="cart-row">
        <img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.name)}">
        <div>
          <strong>${escapeHtml(item.name)}</strong>
          <span>${quantity} x ${currency(item.price)}</span>
        </div>
        <strong>${currency(item.price * quantity)}</strong>
      </article>
    `;
  }).join('');
  return `
    <div class="cart-panel-body cart-page-body">
      <p class="eyebrow">Order summary</p>
      <h2 id="cartPanelTitle">Cart</h2>
      <div class="cart-summary-grid">
        <div>
          <span>Selected items</span>
          <strong>${cartCount}</strong>
        </div>
        <div>
          <span>Orders placed</span>
          <strong>${placedOrderCount}</strong>
        </div>
        <div>
          <span>Total amount</span>
          <strong>${currency(cartTotal())}</strong>
        </div>
      </div>
      <div class="cart-list">
        ${rows || '<p class="empty-cart">No items added yet.</p>'}
      </div>
      <label class="customer-name-field">
        Customer name
        <input id="customerNameInput" type="text" placeholder="Enter customer name">
      </label>
      <button class="primary-btn place-order-btn" type="button" id="placeOrderBtn" ${cartCount === 0 ? 'disabled' : ''}>
        <span data-icon="check-circle"></span>
        Place Order
      </button>
    </div>
  `;
}

function bindPlaceOrder() {
  const placeOrderButton = document.querySelector('#placeOrderBtn');
  if (!placeOrderButton) return;

  placeOrderButton.addEventListener('click', async () => {
    if (cartItems.size === 0) return;
    placeOrderButton.disabled = true;
    const customerNameInput = document.querySelector('#customerNameInput');
    const customerName = customerNameInput.value.trim() || 'Walk-in Customer';
    const selectedItemCount = Array.from(cartItems.values()).reduce((sum, quantity) => sum + quantity, 0);
    const orderedItems = Array.from(cartItems.entries()).map(([id, quantity]) => {
      const item = inventory.find(product => product.id === id);
      return { item, quantity };
    }).filter(entry => entry.item);

    const unavailableItem = orderedItems.find(entry => entry.quantity > entry.item.stock);
    if (unavailableItem) {
      window.alert(`${unavailableItem.item.name} does not have enough stock for this order.`);
      renderCartPage();
      return;
    }

    placedOrderCount += 1;
    const orderDate = new Date();
    const order = {
      orderNo: `Order #${String(placedOrderCount).padStart(3, '0')}`,
      customerName,
      items: selectedItemCount,
      total: cartTotal(),
      date: orderDate.toLocaleString(),
      orderDate: dateInputValue(orderDate),
      lineItems: orderedItems.map(entry => ({
        name: entry.item.name,
        sku: entry.item.sku,
        quantity: entry.quantity,
        price: entry.item.price,
        total: entry.item.price * entry.quantity
      })),
      names: orderedItems.map(entry => `${entry.item.name} x${entry.quantity}`).join(', ')
    };
    orderedItems.forEach(entry => {
      entry.item.stock -= entry.quantity;
      entry.item.sold = (entry.item.sold || 0) + entry.quantity;
    });

    try {
      await Promise.all(orderedItems.map(entry => updateDress(entry.item)));
      await insertOrder(order);
      cartItems.clear();
      saveAppData();
      updateCartCount();
      showShopPage();
      if (!els.historyPage.classList.contains('hidden')) {
        renderHistoryPage();
      }
    } catch (error) {
      orderedItems.forEach(entry => {
        entry.item.stock += entry.quantity;
        entry.item.sold = Math.max(0, (entry.item.sold || 0) - entry.quantity);
      });
      placedOrderCount -= 1;
      window.alert(`Could not place order: ${error.message}`);
      renderCartPage();
    }
  });
}

function renderCartPage() {
  els.cartPageContent.innerHTML = cartMarkup();
  bindPlaceOrder();

  refreshIcons();
}

function renderHistoryPage() {
  const term = els.historySearch.value.trim().toLowerCase();
  const fromDate = els.historyFromDate.value;
  const toDate = els.historyToDate.value;
  const filteredHistory = orderHistory.filter(order => {
    const matchesSearch = [order.orderNo, order.customerName, order.date, order.names]
      .some(value => String(value ?? '').toLowerCase().includes(term));
    const matchesFromDate = !fromDate || order.orderDate >= fromDate;
    const matchesToDate = !toDate || order.orderDate <= toDate;
    return matchesSearch && matchesFromDate && matchesToDate;
  });
  const historyRows = filteredHistory.map(order => `
    <article class="history-row">
      <div class="history-row-main">
        <div class="history-order-meta">
          <span class="order-number">${escapeHtml(order.orderNo)}</span>
          <strong>${escapeHtml(order.customerName)}</strong>
          <span>${escapeHtml(order.date)}</span>
        </div>
        <p>${escapeHtml(order.names)}</p>
        <div class="history-chips">
          <span>${order.items} items</span>
          <span>${order.lineItems.length} styles</span>
          <span>Paid</span>
        </div>
      </div>
      <div class="history-row-side">
        <span>Total</span>
        <strong>${currency(order.total)}</strong>
        <button class="outline-btn invoice-btn" type="button" data-invoice="${order.orderNo}">
          <span data-icon="download"></span>
          Invoice PDF
        </button>
      </div>
    </article>
  `).join('');

  els.historyPageContent.innerHTML = `
    <div class="history-page-body">
      <div class="cart-summary-grid history-summary-grid">
        <div>
          <span>Orders placed</span>
          <strong>${placedOrderCount}</strong>
        </div>
        <div>
          <span>Total sales</span>
          <strong>${currency(orderHistory.reduce((sum, order) => sum + order.total, 0))}</strong>
        </div>
        <div>
          <span>Total items</span>
          <strong>${orderHistory.reduce((sum, order) => sum + order.items, 0)}</strong>
        </div>
        <div>
          <span>Showing</span>
          <strong>${filteredHistory.length}</strong>
        </div>
      </div>
      <div class="history-list">
        ${historyRows || `
          <div class="history-empty-state">
            <span data-icon="receipt-text"></span>
            <strong>No matching orders</strong>
            <p>Try a different search or adjust the selected date range.</p>
          </div>
        `}
      </div>
    </div>
  `;

  refreshIcons();
}

function pdfSafe(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function pdfText(x, y, size, text) {
  return `BT /F1 ${size} Tf ${x} ${y} Td (${pdfSafe(text)}) Tj ET\n`;
}

function pdfBox(x, y, width, height) {
  return `${x} ${y} ${width} ${height} re S\n`;
}

function pdfLine(x1, y1, x2, y2) {
  return `${x1} ${y1} m ${x2} ${y2} l S\n`;
}

function createInvoicePdf(order) {
  const rows = order.lineItems || [];
  const invoiceNo = `INV-${order.orderNo.replace(/\D/g, '').padStart(3, '0')}`;
  let y = 792;
  let stream = '';

  stream += '0.95 0.31 0.37 rg\n';
  stream += '48 770 500 34 re f\n';
  stream += '0 0 0 rg\n';
  stream += pdfText(62, 781, 18, 'DRESSI');
  stream += pdfText(412, 782, 15, 'INVOICE');
  stream += pdfText(62, 758, 9, 'Dress Stock Count Checker');
  stream += pdfText(62, 745, 9, 'Fashion stock, checkout, and order records');
  stream += pdfText(360, 758, 9, 'Email: sales@dressi.local');
  stream += pdfText(360, 745, 9, 'Phone: +91 98765 43210');

  y = 710;
  stream += pdfBox(48, y - 76, 238, 76);
  stream += pdfBox(310, y - 76, 238, 76);
  stream += pdfText(62, y - 18, 10, 'BILL TO');
  stream += pdfText(62, y - 39, 14, order.customerName);
  stream += pdfText(62, y - 58, 9, 'Customer order from Dressi shop');
  stream += pdfText(324, y - 18, 10, 'ORDER DETAILS');
  stream += pdfText(324, y - 38, 10, `Invoice No: ${invoiceNo}`);
  stream += pdfText(324, y - 54, 10, `Order No: ${order.orderNo}`);
  stream += pdfText(324, y - 70, 10, `Date: ${order.date}`);

  y = 600;
  stream += pdfText(48, y, 13, 'ORDER ITEMS');
  y -= 18;
  stream += '0.97 0.94 0.91 rg\n';
  stream += `48 ${y - 16} 500 24 re f\n`;
  stream += '0 0 0 rg\n';
  stream += pdfText(60, y - 8, 9, 'No');
  stream += pdfText(94, y - 8, 9, 'Dress / SKU');
  stream += pdfText(352, y - 8, 9, 'Qty');
  stream += pdfText(410, y - 8, 9, 'Price');
  stream += pdfText(490, y - 8, 9, 'Total');
  y -= 30;

  rows.forEach((item, index) => {
    stream += pdfLine(48, y + 10, 548, y + 10);
    stream += pdfText(60, y, 10, String(index + 1));
    stream += pdfText(94, y, 10, item.name.slice(0, 34));
    stream += pdfText(352, y, 10, String(item.quantity));
    stream += pdfText(410, y, 10, currency(item.price));
    stream += pdfText(490, y, 10, currency(item.total));
    y -= 15;
    stream += pdfText(94, y, 8, `SKU: ${item.sku}`);
    y -= 17;
  });

  stream += pdfLine(48, y + 10, 548, y + 10);
  y -= 28;
  stream += pdfBox(330, y - 70, 218, 70);
  stream += pdfText(348, y - 20, 11, `Total Items: ${order.items}`);
  stream += pdfText(348, y - 42, 11, 'Payment Status: Paid');
  stream += pdfText(348, y - 62, 15, `Grand Total: ${currency(order.total)}`);

  y -= 116;
  stream += pdfText(48, y, 11, 'Thank you for shopping with Dressi.');
  y -= 18;
  stream += pdfText(48, y, 9, 'Please keep this invoice for your order history.');
  y -= 18;
  stream += pdfLine(48, y, 548, y);
  y -= 16;
  stream += pdfText(48, y, 8, 'Generated by Dressi Stock Checking System');
  stream += pdfText(390, y, 8, 'No signature required');

  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${stream.length} >>\nstream\n${stream}endstream`
  ];

  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach(offset => {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return new Blob([pdf], { type: 'application/pdf' });
}

function downloadInvoice(orderNo) {
  const order = orderHistory.find(item => item.orderNo === orderNo);
  if (!order) return;

  const blob = createInvoicePdf(order);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${order.orderNo.replaceAll(' ', '-')}-invoice.pdf`;
  link.click();
  URL.revokeObjectURL(url);
}

function showHomePage() {
  setActivePage('home');
  els.homePage.classList.remove('hidden');
  els.shopPage.classList.add('hidden');
  els.historyPage.classList.add('hidden');
  els.cartPage.classList.add('hidden');
  els.aboutPage.classList.add('hidden');
  renderHeroSlider();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function showShopPage() {
  setActivePage('shop');
  els.homePage.classList.add('hidden');
  els.shopPage.classList.remove('hidden');
  els.historyPage.classList.add('hidden');
  els.cartPage.classList.add('hidden');
  els.aboutPage.classList.add('hidden');
  renderProducts();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function showHistoryPage() {
  setActivePage('history');
  els.homePage.classList.add('hidden');
  els.shopPage.classList.add('hidden');
  els.historyPage.classList.remove('hidden');
  els.cartPage.classList.add('hidden');
  els.aboutPage.classList.add('hidden');
  renderHistoryPage();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function showCartPage() {
  if (!els.cartPage.classList.contains('hidden')) return;
  setActivePage('cart');
  els.homePage.classList.add('hidden');
  els.shopPage.classList.add('hidden');
  els.historyPage.classList.add('hidden');
  els.cartPage.classList.remove('hidden');
  els.aboutPage.classList.add('hidden');
  renderCartPage();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function showAboutPage() {
  setActivePage('about');
  els.homePage.classList.add('hidden');
  els.shopPage.classList.add('hidden');
  els.historyPage.classList.add('hidden');
  els.cartPage.classList.add('hidden');
  els.aboutPage.classList.remove('hidden');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function downloadHistory() {
  const rows = orderHistory.map(order => [
    order.orderNo,
    `"${String(order.customerName ?? '').replaceAll('"', '""')}"`,
    order.date,
    order.items,
    order.total,
    `"${String(order.names ?? '').replaceAll('"', '""')}"`
  ].join(','));
  const csv = ['Order No,Customer Name,Date,Items,Total,Details', ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'dress-order-history.csv';
  link.click();
  URL.revokeObjectURL(url);
}

function clearHistoryDateFilter() {
  els.historyFromDate.value = '';
  els.historyToDate.value = '';
  renderHistoryPage();
}

function addToCart(id) {
  const item = inventory.find(product => product.id === id);
  if (!item || item.stock <= 0) return;
  const quantityInCart = cartItems.get(id) || 0;

  if (quantityInCart >= item.stock) {
    window.alert('No more stock is available for this dress.');
    return;
  }

  cartItems.set(id, quantityInCart + 1);

  renderProducts();
  updateCartCount();
  renderHeroSlider();
  highlightProduct(item.id);
}

function activateAllFilter() {
  currentFilter = 'all';
  document.querySelectorAll('.filter-btn').forEach(button => {
    button.classList.toggle('active', button.dataset.filter === 'all');
  });
}

function highlightProduct(id) {
  requestAnimationFrame(() => {
    const card = document.querySelector(`[data-product-card="${id}"]`);
    if (!card) return;
    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    card.classList.add('product-card-added');
    setTimeout(() => card.classList.remove('product-card-added'), 1800);
  });
}

function openStockPanel(id = activeStockItemId) {
  const item = inventory.find(product => product.id === id) || inventory[0];

  activeStockItemId = item?.id ?? null;
  els.stockPanelContent.innerHTML = window.StockPanel.render(inventory, item);
  els.stockPanelOverlay.classList.remove('hidden');
  els.stockPanelOverlay.setAttribute('aria-hidden', 'false');
  document.body.classList.add('panel-open');

  const stockSearch = document.querySelector('#stockItemSearch');
  stockSearch.addEventListener('focus', () => {
    stockSearch.value = '';
    filterStockSuggestions('');
  });
  stockSearch.addEventListener('input', event => {
    const searchValue = event.target.value.trim().toLowerCase();
    filterStockSuggestions(searchValue);
  });

  document.querySelector('#stockSuggestions').addEventListener('click', event => {
    const button = event.target.closest('[data-stock-option]');
    if (!button) return;
    openStockPanel(Number(button.dataset.stockOption));
  });

  const stockForm = document.querySelector('#stockForm');
  if (stockForm && item) {
    stockForm.addEventListener('submit', async event => {
      event.preventDefault();
      const submitButton = stockForm.querySelector('button[type="submit"]');
      submitButton.disabled = true;
      item.stock = Math.max(0, Number(document.querySelector('#stockCountInput').value));
      item.sold = Math.max(0, Number(document.querySelector('#soldInput').value));

      try {
        await updateDress(item);
        els.search.value = '';
        activateAllFilter();
        renderProducts();
        renderHeroSlider();
        closeStockPanel();
        highlightProduct(item.id);
      } catch (error) {
        submitButton.disabled = false;
        window.alert(`Could not save stock: ${error.message}`);
      }
    });
  }

  document.querySelector('#addItemForm').addEventListener('submit', async event => {
    event.preventDefault();
    const submitButton = event.currentTarget.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    const newItem = {
      id: Math.max(0, ...inventory.map(product => product.id)) + 1,
      name: document.querySelector('#newName').value.trim(),
      sku: document.querySelector('#newSku').value.trim(),
      type: document.querySelector('#newType').value.trim(),
      size: document.querySelector('#newSize').value.trim(),
      color: document.querySelector('#newColor').value.trim(),
      colorHex: document.querySelector('#newColorHex').value,
      stock: Math.max(0, Number(document.querySelector('#newStock').value)),
      sold: Math.max(0, Number(document.querySelector('#newSold').value)),
      vendor: document.querySelector('#newVendor').value.trim(),
      price: Math.max(1, Number(document.querySelector('#newPrice').value)),
      rating: 4,
      image: uploadedImageDataUrl || 'https://images.unsplash.com/photo-1485968579580-b6d095142e6e?auto=format&fit=crop&w=700&q=80'
    };

    try {
      const savedItem = await insertDress(newItem);
      uploadedImageDataUrl = '';
      activeStockItemId = savedItem.id;
      els.search.value = '';
      activateAllFilter();
      renderProducts();
      renderHeroSlider();
      closeStockPanel();
      highlightProduct(savedItem.id);
    } catch (error) {
      submitButton.disabled = false;
      window.alert(`Could not add item: ${error.message}`);
    }
  });

  document.querySelector('#newImageFile').addEventListener('change', event => {
    const file = event.target.files[0];
    const preview = document.querySelector('#imagePreview');

    if (!file) {
      uploadedImageDataUrl = '';
      preview.innerHTML = '<span data-icon="image"></span><p>No image selected</p>';
      refreshIcons();
      return;
    }

    const reader = new FileReader();
    reader.addEventListener('load', () => {
      uploadedImageDataUrl = reader.result;
      preview.innerHTML = `<img src="${uploadedImageDataUrl}" alt="Selected dress preview">`;
    });
    reader.readAsDataURL(file);
  });

  refreshIcons();
}

function closeStockPanel() {
  els.stockPanelOverlay.classList.add('hidden');
  els.stockPanelOverlay.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('panel-open');
}

document.querySelectorAll('.filter-btn').forEach(button => {
  button.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    button.classList.add('active');
    currentFilter = button.dataset.filter;
    renderProducts();
  });
});

els.goShopBtn.addEventListener('click', showShopPage);
els.heroPagination.addEventListener('click', event => {
  const button = event.target.closest('[data-hero-dot]');
  if (!button) return;
  showHeroSlide(Number(button.dataset.heroDot));
  startHeroSlider();
});
els.navShopBtn.addEventListener('click', showShopPage);
els.homeLinks.forEach(button => {
  button.addEventListener('click', showHomePage);
});
els.shopTopHomeBtn.addEventListener('click', showHomePage);
els.historyHomeBtn.addEventListener('click', showHomePage);
els.historyShopBtn.addEventListener('click', showShopPage);
els.aboutHomeBtn.addEventListener('click', showHomePage);
els.aboutShopBtn.addEventListener('click', showShopPage);
els.aboutHistoryBtn.addEventListener('click', showHistoryPage);
els.downloadHistoryBtn.addEventListener('click', downloadHistory);
els.historySearch.addEventListener('input', renderHistoryPage);
els.historyFromDate.addEventListener('change', renderHistoryPage);
els.historyToDate.addEventListener('change', renderHistoryPage);
els.clearHistoryDates.addEventListener('click', clearHistoryDateFilter);
els.historyPageContent.addEventListener('click', event => {
  const button = event.target.closest('[data-invoice]');
  if (!button) return;
  downloadInvoice(button.dataset.invoice);
});
els.cartHomeBtn.addEventListener('click', showHomePage);
els.cartShopBtn.addEventListener('click', showShopPage);
els.cartHistoryBtn.addEventListener('click', showHistoryPage);
els.search.addEventListener('input', renderProducts);
els.viewStockBtn.addEventListener('click', () => openStockPanel());
els.closeStockPanel.addEventListener('click', closeStockPanel);
els.stockPanelOverlay.addEventListener('click', event => {
  if (event.target === els.stockPanelOverlay) closeStockPanel();
});
els.cartButtons.forEach(button => {
  button.addEventListener('click', showCartPage);
});
els.historyButtons.forEach(button => {
  button.addEventListener('click', showHistoryPage);
});
els.aboutButtons.forEach(button => {
  button.addEventListener('click', showAboutPage);
});
els.productGrid.addEventListener('click', event => {
  const button = event.target.closest('[data-add-cart]');
  if (!button) return;
  addToCart(Number(button.dataset.addCart));
});

document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && !els.stockPanelOverlay.classList.contains('hidden')) closeStockPanel();
});

updateCartCount();
renderHeroSlider();
refreshIcons();
subscribeToRealtimeUpdates();
loadRemoteData();
