let products = [
  { id: 'almond', name: 'Almond Cashew Cookies', price200: 1000, price400: 2000, mrp200: 1250, mrp400: 2500, image: 'assets/almond-cashew.jpg', badge: 'BEST SELLER', in_stock: 1 },
  { id: 'butter', name: 'Butter Cookies', price200: 250, price400: 500, mrp200: 320, mrp400: 650, image: 'assets/butter.jpg', badge: 'FRESHLY BAKED', in_stock: 1 },
  { id: 'chip', name: 'Classic Choco Chip Cookies', price200: 250, price400: 500, mrp200: 320, mrp400: 650, image: 'assets/classic-chip.jpg', badge: 'POPULAR', in_stock: 1 },
  { id: 'coconut', name: 'Coconut Cookies', price200: 250, price400: 500, mrp200: 320, mrp400: 650, image: 'assets/coconut.jpg', badge: 'FRESH TODAY', in_stock: 1 },
  { id: 'double', name: 'Double Chocolate Cookies', price200: 250, price400: 500, mrp200: 320, mrp400: 650, image: 'assets/double-chocolate.jpg', badge: 'RICH & FUDGY', in_stock: 1 },
  { id: 'dry', name: 'Dry Fruit Cookies', price200: 600, price400: 1200, mrp200: 750, mrp400: 1500, image: 'assets/dry-fruit.jpg', badge: 'PREMIUM', in_stock: 1 },
  { id: 'oats', name: 'Oats Raisin Cookies', price200: 250, price400: 500, mrp200: 320, mrp400: 650, image: 'assets/oats-raisin.jpg', badge: 'HEALTHY CHOICE', in_stock: 1 },
  { id: 'red', name: 'Red Velvet Cookies', price200: 250, price400: 500, mrp200: 320, mrp400: 650, image: 'assets/red-velvet.jpg', badge: 'NEW', in_stock: 1 }
];

let cart = JSON.parse(localStorage.getItem('srivariCart') || '[]');
let configuredProducts = products.map(p => ({ ...p, in_stock: 1 }));

const DELHIVERY_API = 'https://srivari-delhivery-api.chiluverushyam8790.workers.dev';
const ORDERS_API = 'https://srivari-orders-api.chiluverushyam8790.workers.dev';

let deliveryCharge = null;
let lastDeliveryPincode = '';
let checkoutBusy = false;

function priceFor(p, w) { return w === 200 ? p.price200 : p.price400; }

function mrpFor(p, w) {
  const currentPrice = priceFor(p, w);
  const baseMrp = w === 200 ? (p.mrp200 || 0) : (p.mrp400 || 0);
  if (baseMrp > currentPrice) return baseMrp;
  return Math.round(currentPrice * 1.25);
}

function discount(p, w) {
  const price = priceFor(p, w);
  const mrp = mrpFor(p, w);
  if (!price || !mrp || mrp <= price) return null;
  const off = Math.round((1 - (price / mrp)) * 100);
  return off > 0 ? off : null;
}

function renderProducts() {
  const grid = document.getElementById('productGrid');
  if (!grid) return;

  grid.innerHTML = configuredProducts.map(p => {
    const isOutOfStock = Number(p.in_stock) === 0;
    const badgeText = isOutOfStock ? 'OUT OF STOCK' : (p.badge || 'FRESH');
    const badgeBg = isOutOfStock ? '#c5221f' : '#075e45';

    return `
      <article class="card" data-product="${p.id}">
        <div class="photo">
          <img src="${p.image}" alt="${p.name}" loading="lazy" onerror="this.src='assets/hero-cookie.jpg'">
          <span class="badge" style="background:${badgeBg}; color:#fff; font-weight:bold;">${badgeText}</span>
        </div>

        <div class="info">
          <h3>${p.name}</h3>

          <div class="weightChoices" role="group">
            <button type="button"
              class="weightBtn active"
              data-weight="200"
              onclick="selectWeight('${p.id}', 200)">
              200g
            </button>

            <button type="button"
              class="weightBtn"
              data-weight="400"
              onclick="selectWeight('${p.id}', 400)">
              400g
            </button>
          </div>

          <div class="priceArea" id="price-${p.id}">
            ${priceBlock(p, 200)}
          </div>

          ${isOutOfStock 
            ? `<button class="add" disabled style="background:#888; color:#fff; cursor:not-allowed;">✕ Out of Stock</button>`
            : `<button class="add" onclick="addToCart('${p.id}')">🛒 Add to Cart</button>`
          }
        </div>
      </article>
    `;
  }).join('');
}

function priceBlock(p, w) {
  const price = priceFor(p, w);
  const mrp = mrpFor(p, w);
  const off = discount(p, w);

  return `
    <div class="priceRow">
      <div class="price">
        ₹${price}
        <span class="mrp">₹${mrp}</span>
      </div>
      ${off ? `<span class="off">${off}% OFF</span>` : ''}
    </div>
  `;
}

function selectWeight(id, w) {
  const p = configuredProducts.find(x => x.id === id);
  if (!p) return;

  const card = document.querySelector(`[data-product="${id}"]`);
  if (!card) return;

  card.querySelectorAll('.weightBtn').forEach(b => {
    b.classList.toggle('active', Number(b.dataset.weight) === w);
  });

  const priceEl = card.querySelector(`#price-${id}`);
  if (priceEl) priceEl.innerHTML = priceBlock(p, w);
}

function addToCart(id) {
  const p = configuredProducts.find(x => x.id === id);
  const card = document.querySelector(`[data-product="${id}"]`);

  if (!p || !card || Number(p.in_stock) === 0) {
    alert('Sorry, this cookie is currently out of stock!');
    return;
  }

  const active = card.querySelector('.weightBtn.active');
  const w = Number(active?.dataset.weight || 200);

  const key = `${id}-${w}`;
  const x = cart.find(i => i.key === key);

  if (x) {
    x.qty++;
  } else {
    cart.push({ key, id, weight: w, qty: 1 });
  }

  deliveryCharge = null;
  lastDeliveryPincode = '';
  saveCart();
  openDrawer();
}

function saveCart() {
  localStorage.setItem('srivariCart', JSON.stringify(cart));
  renderCart();

  const count = document.getElementById('cartCount');
  if (count) {
    count.textContent = cart.reduce((s, i) => s + i.qty, 0);
  }
}

function cartWeightGrams() {
  return cart.reduce((sum, i) => sum + (Number(i.weight) || 0) * i.qty, 0);
}

function cartSubtotal() {
  return cart.reduce((sum, i) => {
    const p = configuredProducts.find(x => x.id === i.id);
    if (!p) return sum;
    return sum + priceFor(p, i.weight) * i.qty;
  }, 0);
}

function renderCart() {
  const box = document.getElementById('cartItems');
  if (!box) return;

  if (!cart.length) {
    box.innerHTML = '<div class="empty">Your cart is empty.<br>Add some cookies ❤️</div>';
    updateSummary(0);
    return;
  }

  let subtotal = 0;
  box.innerHTML = cart.map(i => {
    const p = configuredProducts.find(x => x.id === i.id);
    if (!p) return '';

    const price = priceFor(p, i.weight);
    subtotal += price * i.qty;

    return `
      <div class="cartLine">
        <img src="${p.image}" alt="">
        <div>
          <b>${p.name}</b>
          <small>${i.weight}g • ₹${price} × ${i.qty}</small>
        </div>
        <div class="qty">
          <button onclick="changeQty('${i.key}', -1)">−</button>
          <span>${i.qty}</span>
          <button onclick="changeQty('${i.key}', 1)">+</button>
        </div>
      </div>
    `;
  }).join('');

  updateSummary(subtotal);
}

function changeQty(key, d) {
  const x = cart.find(i => i.key === key);
  if (!x) return;

  x.qty += d;
  if (x.qty <= 0) {
    cart = cart.filter(i => i.key !== key);
  }

  deliveryCharge = null;
  lastDeliveryPincode = '';
  saveCart();
}

function updateSummary(subtotal) {
  const subtotalEl = document.getElementById('cartSubtotal');
  const deliveryEl = document.getElementById('cartDelivery');
  const totalEl = document.getElementById('cartTotal');
  const note = document.getElementById('deliveryNote');

  if (subtotalEl) subtotalEl.textContent = '₹' + subtotal;
  if (deliveryEl) deliveryEl.textContent = deliveryCharge == null ? '—' : '₹' + Math.round(deliveryCharge);
  if (totalEl) totalEl.textContent = '₹' + Math.round(deliveryCharge == null ? subtotal : subtotal + deliveryCharge);
  if (note) {
    note.textContent = deliveryCharge == null
      ? 'Enter your pincode to calculate delivery charge.'
      : 'Delivery charge: ₹' + Math.round(deliveryCharge);
  }
}

function openDrawer() {
  document.getElementById('drawer')?.classList.add('open');
  document.getElementById('shade')?.classList.add('open');
  document.body.classList.add('noScroll');
}

function closeDrawer() {
  document.getElementById('drawer')?.classList.remove('open');
  document.getElementById('shade')?.classList.remove('open');
  document.body.classList.remove('noScroll');
}

document.getElementById('openCart')?.addEventListener('click', openDrawer);
document.getElementById('closeCart')?.addEventListener('click', closeDrawer);
document.getElementById('shade')?.addEventListener('click', closeDrawer);

async function calculateDelivery() {
  const pincodeEl = document.getElementById('pincode');
  if (!pincodeEl) return false;
  const pincode = pincodeEl.value.trim();

  if (!/^\d{6}$/.test(pincode)) {
    deliveryCharge = null;
    lastDeliveryPincode = '';
    updateSummary(cartSubtotal());
    return false;
  }

  const weight = cartWeightGrams();
  if (weight <= 0) {
    alert('Please add cookies to cart.');
    return false;
  }

  const note = document.getElementById('deliveryNote');
  if (note) note.textContent = 'Calculating delivery charge…';

  try {
    const url = `${DELHIVERY_API}/?pincode=${encodeURIComponent(pincode)}&weight=${Math.ceil(weight)}`;
    const response = await fetch(url, { cache: 'no-store' });
    const data = await response.json().catch(() => ({}));

    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Delivery charge unavailable');
    }

    deliveryCharge = Number(data.shippingCharge);
    lastDeliveryPincode = pincode;
    updateSummary(cartSubtotal());
    return true;
  } catch (error) {
    deliveryCharge = null;
    lastDeliveryPincode = '';
    updateSummary(cartSubtotal());
    if (note
