/**
 * Posterita Hardware Store — Shopping Cart with Paddle Checkout
 */

const PRODUCTS = [
  { id: 'desktop-pos', name: '13" Desktop POS (Android)', price: 489, priceId: 'pri_01kmw4hqyn7smfvyafsz2qq14n', image: 'https://cdn.prod.website-files.com/6704d9a06ff76b3cdd747af9/685e801502d706adc32cc994_AIO-1331_3.jpg', desc: 'All-in-one touchscreen POS terminal' },
  { id: 'barcode-scanner', name: 'Platform Barcode Scanner', price: 160, priceId: 'pri_01kmw4hrbfprj8891zw8z7x2c5', image: 'https://cdn.prod.website-files.com/6704d9a06ff76b3cdd747af9/67e68d7206f72cb6bd50910a_Picture11.jpg', desc: 'Wireless 2D, USB + Bluetooth' },
  { id: 'thermal-printer', name: 'Mobile Thermal Printer', price: 145, priceId: 'pri_01kmw4hrq7xghh5kf7vh310z1s', image: 'https://cdn.prod.website-files.com/6704d9a06ff76b3cdd747af9/685e7a3c39ecefbfd750f18d_CP-P29_2.jpg', desc: 'Portable 58mm Bluetooth receipt printer' },
  { id: 'cash-drawer', name: 'Mini Cash Drawer', price: 62, priceId: 'pri_01kmw4hs44195d793m21dygtw2', image: 'https://cdn.prod.website-files.com/6704d9a06ff76b3cdd747af9/685e8283f4fa4f494e025f09_20250214_134309.png', desc: 'Compact RJ11, 4 bill / 5 coin slots' },
  { id: 'all-in-one', name: 'All-in-One Desktop POS', price: 599, priceId: 'pri_01kmw4hskgeygbtp47c8stawwm', image: 'https://cdn.prod.website-files.com/6704d9a06ff76b3cdd747af9/685e801502d706adc32cc994_AIO-1331_3.jpg', desc: 'Windows POS with built-in printer' },
  { id: 'label-printer', name: 'Zebra Label Printer', price: 320, priceId: 'pri_01kmw4ht082y779ba99vg587ae', image: '/assets/hardware/product-2.png', desc: 'ZPL thermal label printer for shelf tags' },
];

let cart = JSON.parse(localStorage.getItem('posterita-cart') || '[]');

function saveCart() {
  localStorage.setItem('posterita-cart', JSON.stringify(cart));
  updateCartBadge();
}

function addToCart(productId) {
  const product = PRODUCTS.find(p => p.id === productId);
  if (!product) return;
  const existing = cart.find(item => item.id === productId);
  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({ id: productId, qty: 1 });
  }
  saveCart();
  showToast(`${product.name} added to cart`);
  renderCart();
}

function removeFromCart(productId) {
  cart = cart.filter(item => item.id !== productId);
  saveCart();
  renderCart();
}

function updateQty(productId, delta) {
  const item = cart.find(i => i.id === productId);
  if (!item) return;
  item.qty = Math.max(1, item.qty + delta);
  saveCart();
  renderCart();
}

function getCartTotal() {
  return cart.reduce((sum, item) => {
    const product = PRODUCTS.find(p => p.id === item.id);
    return sum + (product ? product.price * item.qty : 0);
  }, 0);
}

function getCartCount() {
  return cart.reduce((sum, item) => sum + item.qty, 0);
}

function updateCartBadge() {
  const badges = document.querySelectorAll('.cart-badge');
  const count = getCartCount();
  badges.forEach(badge => {
    badge.textContent = count;
    badge.style.display = count > 0 ? 'flex' : 'none';
  });
}

function toggleCart() {
  const overlay = document.getElementById('cart-overlay');
  if (overlay) {
    overlay.classList.toggle('hidden');
    if (!overlay.classList.contains('hidden')) renderCart();
  }
}

function renderCart() {
  const container = document.getElementById('cart-items');
  const totalEl = document.getElementById('cart-total');
  const emptyEl = document.getElementById('cart-empty');
  const checkoutBtn = document.getElementById('cart-checkout-btn');
  if (!container) return;

  if (cart.length === 0) {
    container.innerHTML = '';
    if (emptyEl) emptyEl.classList.remove('hidden');
    if (checkoutBtn) checkoutBtn.classList.add('hidden');
    if (totalEl) totalEl.textContent = '$0';
    return;
  }

  if (emptyEl) emptyEl.classList.add('hidden');
  if (checkoutBtn) checkoutBtn.classList.remove('hidden');

  container.innerHTML = cart.map(item => {
    const product = PRODUCTS.find(p => p.id === item.id);
    if (!product) return '';
    const lineTotal = product.price * item.qty;
    return `
      <div class="flex items-center gap-3 py-3 border-b border-gray-100">
        <img src="${product.image}" alt="${product.name}" class="w-14 h-14 object-contain rounded-lg bg-gray-50 flex-shrink-0" />
        <div class="flex-1 min-w-0">
          <p class="text-sm font-semibold text-gray-900 truncate">${product.name}</p>
          <p class="text-xs text-gray-400">${product.desc}</p>
          <div class="flex items-center gap-2 mt-1">
            <button onclick="updateQty('${item.id}', -1)" class="w-6 h-6 rounded bg-gray-100 text-gray-600 text-sm font-bold hover:bg-gray-200 transition flex items-center justify-center">-</button>
            <span class="text-sm font-semibold w-6 text-center">${item.qty}</span>
            <button onclick="updateQty('${item.id}', 1)" class="w-6 h-6 rounded bg-gray-100 text-gray-600 text-sm font-bold hover:bg-gray-200 transition flex items-center justify-center">+</button>
            <span class="text-sm font-semibold text-brand-600 ml-auto">$${lineTotal}</span>
          </div>
        </div>
        <button onclick="removeFromCart('${item.id}')" class="text-gray-300 hover:text-red-500 transition flex-shrink-0" title="Remove">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
      </div>
    `;
  }).join('');

  if (totalEl) totalEl.textContent = '$' + getCartTotal();
}

function showToast(message) {
  const existing = document.getElementById('cart-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.id = 'cart-toast';
  toast.className = 'fixed bottom-6 right-6 bg-gray-900 text-white px-5 py-3 rounded-xl shadow-lg text-sm font-medium z-50 flex items-center gap-2 animate-fade-in';
  toast.innerHTML = `<svg class="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg> ${message}`;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2500);
}

function proceedToCheckout() {
  if (cart.length === 0) return;

  // Build Paddle checkout items
  const items = cart.map(item => {
    const product = PRODUCTS.find(p => p.id === item.id);
    if (!product) return null;
    return { priceId: product.priceId, quantity: item.qty };
  }).filter(Boolean);

  console.log('[Paddle Checkout] Items:', JSON.stringify(items));

  if (!window.Paddle) {
    alert('Payment system is loading. Please try again in a moment.');
    logCheckoutError('Paddle.js not loaded', { items });
    return;
  }

  try {
    window.Paddle.Checkout.open({
      items: items,
      settings: {
        displayMode: 'overlay',
        theme: 'light',
        locale: 'en',
        successUrl: window.location.origin + '/?order=success',
      },
    });
    toggleCart();
  } catch (err) {
    console.error('[Paddle Checkout] Error:', err);
    alert('Checkout failed: ' + (err.message || 'Unknown error') + '. Please try again.');
    logCheckoutError(err.message || String(err), { items });
  }
}

// Log checkout errors to our error API for debugging
function logCheckoutError(message, context) {
  try {
    fetch('https://web.posterita.com/api/errors/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        severity: 'ERROR',
        tag: 'WWW_CHECKOUT',
        message: 'Paddle checkout error: ' + message,
        screen: window.location.pathname,
        device_info: navigator.userAgent,
        context: JSON.stringify(context),
      }),
    }).catch(function() {});
  } catch (_) {}
}

// Check for success return
function checkOrderSuccess() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('order') === 'success') {
    // Clear cart
    cart = [];
    saveCart();
    // Show success message
    setTimeout(() => {
      showToast('Order placed successfully! Check your email for confirmation.');
    }, 500);
    // Clean URL
    window.history.replaceState({}, '', window.location.pathname);
  }
}

// Init
document.addEventListener('DOMContentLoaded', () => {
  updateCartBadge();
  checkOrderSuccess();
});
