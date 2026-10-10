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

function priceFor(p, w) { 
  return w === 200 ? p.price200 : p.price400; 
}

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
  const grid = document.getElementById('productGrid') || document.getElementById('cookie-grid') || document.getElementById('productsGrid');
  if (!grid) return;

  grid.innerHTML = configuredProducts.map(p => {
    const isOutOfStock = Number(p.in_stock) === 0;
    const badgeText = isOutOfStock ? 'OUT OF STOCK' : (p.badge || 'FRESH');
    const badgeBg = isOutOfStock ? '#c5221f' : '#075e45';

    return `
      <article class="card product-card" data-product="${p.id}">
        <div class="photo">
          <img src="${p.image}" alt="${p.name}" class="product-img" loading="lazy" onerror="this.src='assets/hero-cookie.jpg'">
          <span class="badge card-badge" style="background:${badgeBg}; color:#fff; font-weight:bold;">${badgeText}</span>
        </div>

        <div class="info">
          <h3 class="product-name">${p.name}</h3>

          <div class="weightChoices weight-selector" role="group">
            <button type="button"
              class="weightBtn weight-btn active"
              data-weight="200"
              onclick="selectWeight('${p.id}', 200)">
              200g
            </button>

            <button type="button"
              class="weightBtn weight-btn"
              data-weight="400"
              onclick="selectWeight('${p.id}', 400)">
              400g
            </button>
          </div>

          <div class="priceArea price-text" id="price-${p.id}">
            ${priceBlock(p, 200)}
          </div>

          ${isOutOfStock 
            ? `<button class="add add-btn" disabled style="background:#888; color:#fff; cursor:not-allowed;">✕ Out of Stock</button>`
            : `<button class="add add-btn" onclick="addToCart('${p.id}')">🛒 Add to Cart</button>`
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

  const totalCount = cart.reduce((s, i) => s + i.qty, 0);

  // Update Header Badges
  const count = document.getElementById('cartCount') || document.getElementById('cart-count') || document.getElementById('header-cart-badge');
  if (count) {
    count.textContent = totalCount;
  }

  // Update Mobile Bottom Bar Badge
  const bottomBadge = document.getElementById('bottom-cart-badge');
  if (bottomBadge) {
    bottomBadge.textContent = totalCount;
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
  const box = document.getElementById('cartItems') || document.getElementById('cart-items') || document.getElementById('cartItemsList');
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
      <div class="cartLine cart-item-row">
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
  const deliveryEl = document.getElementById('cartDelivery') || document.getElementById('cartShipping');
  const totalEl = document.getElementById('cartTotal') || document.getElementById('cart-total');
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
  const drawer = document.getElementById('drawer') || document.getElementById('cartDrawer');
  const shade = document.getElementById('shade') || document.getElementById('cartOverlay');
  if (drawer) drawer.classList.add('open');
  if (shade) {
    shade.classList.add('open');
    shade.style.display = 'block';
  }
  document.body.classList.add('noScroll');
}

function closeDrawer() {
  const drawer = document.getElementById('drawer') || document.getElementById('cartDrawer');
  const shade = document.getElementById('shade') || document.getElementById('cartOverlay');
  if (drawer) drawer.classList.remove('open');
  if (shade) {
    shade.classList.remove('open');
    shade.style.display = 'none';
  }
  document.body.classList.remove('noScroll');
}

// Aliases for bottom nav & header clicks
window.openCart = openDrawer;
window.closeCart = closeDrawer;

document.getElementById('openCart')?.addEventListener('click', openDrawer);
document.getElementById('closeCart')?.addEventListener('click', closeDrawer);
document.getElementById('shade')?.addEventListener('click', closeDrawer);
document.getElementById('cartOverlay')?.addEventListener('click', closeDrawer);

async function calculateDelivery() {
  const pincodeEl = document.getElementById('pincode') || document.getElementById('cartPincode');
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

  const note = document.getElementById('deliveryNote') || document.getElementById('pincodeStatus');
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
    if (note) note.textContent = '✅ Delivery available: ₹' + Math.round(deliveryCharge);
    return true;
  } catch (error) {
    deliveryCharge = null;
    lastDeliveryPincode = '';
    updateSummary(cartSubtotal());
    if (note) note.textContent = 'Delivery charge could not be calculated for this pincode.';
    alert('Delivery charge could not be calculated. Please check the pincode and try again.');
    return false;
  }
}

window.checkPincodeDelivery = calculateDelivery;

const pincodeEl = document.getElementById('pincode') || document.getElementById('cartPincode');
pincodeEl?.addEventListener('blur', calculateDelivery);
pincodeEl?.addEventListener('input', () => {
  deliveryCharge = null;
  lastDeliveryPincode = '';
  updateSummary(cartSubtotal());
});

function autoFillCustomerDetails() {
  try {
    const saved = JSON.parse(localStorage.getItem('srivari_customer_profile') || '{}');
    const nameEl = document.getElementById('cname') || document.getElementById('custName');
    const phoneEl = document.getElementById('phone') || document.getElementById('custPhone');
    const emailEl = document.getElementById('email');
    const addrEl = document.getElementById('address') || document.getElementById('custAddress');
    const pinEl = document.getElementById('pincode') || document.getElementById('cartPincode');

    if (saved.name && nameEl) nameEl.value = saved.name;
    if (saved.phone && phoneEl) phoneEl.value = saved.phone;
    if (saved.email && emailEl) emailEl.value = saved.email;
    if (saved.address && addrEl) addrEl.value = saved.address;
    if (saved.pincode && pinEl) {
      pinEl.value = saved.pincode;
      if (cart.length > 0) calculateDelivery();
    }
  } catch (e) {}
}

/* ==========================================================================
   SRIVARI ACCOUNT HUB & ZERO-PASSWORD LOGIN ENGINE (LIVE PRODUCTION)
   ========================================================================== */
window.renderAccountHub = function() {
  const hub = document.getElementById('accountHubView');
  if (!hub) return;

  const profile = JSON.parse(localStorage.getItem('srivari_customer_profile') || '{}');

  if (profile.phone) {
    const initial = (profile.name || 'S').trim().charAt(0).toUpperCase();
    hub.innerHTML = `
      <div class="account-card">
        <div class="account-avatar">${initial}</div>
        <div class="account-details" style="flex:1;">
          <h3>${profile.name || 'Valued Customer'}</h3>
          <p>+91 ${profile.phone}</p>
          ${profile.address ? `<div style="font-size:11px; opacity:0.8; margin-top:4px;">📍 ${profile.address.slice(0, 32)}...</div>` : ''}
        </div>
      </div>
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
        <span style="font-size:12px; color:#12352e; font-weight:600;">Verified Customer</span>
        <button type="button" class="account-logout-btn" onclick="logoutCustomer()">Sign Out / Change</button>
      </div>
    `;
    fetchCustomerOrders(profile.phone);
  } else {
    hub.innerHTML = `
      <div class="login-box">
        <h3>Namaskaram 🙏</h3>
        <p>Mee orders mariyu delivery status chusukodaniki mobile number enter cheyandi</p>
        <div class="login-input-wrap">
          <input type="tel" id="loginMobileInput" placeholder="10-digit Mobile Number" maxlength="10">
          <button type="button" class="login-btn" onclick="loginWithPhone()">Login</button>
        </div>
      </div>
    `;
  }
};

window.loginWithPhone = function() {
  const input = document.getElementById('loginMobileInput');
  const phone = input ? input.value.replace(/\D/g, '') : '';

  if (phone.length !== 10) {
    alert('Dhayachesi valid 10-digit mobile number enter cheyandi.');
    return;
  }

  const existing = JSON.parse(localStorage.getItem('srivari_customer_profile') || '{}');
  existing.phone = phone;
  if (!existing.name) existing.name = 'Valued Customer';

  localStorage.setItem('srivari_customer_profile', JSON.stringify(existing));
  renderAccountHub();
};

window.logoutCustomer = function() {
  localStorage.removeItem('srivari_customer_profile');
  const container = document.getElementById('ordersListContainer');
  if (container) {
    container.innerHTML = '<div style="text-align: center; padding: 20px; color: #777; font-size: 13px;">Login ayyaka mee orders ikkada kanipisthayi.</div>';
  }
  renderAccountHub();
};

window.openOrdersModal = function() {
  const modal = document.getElementById('ordersModal');
  if (modal) modal.style.display = 'flex';
  renderAccountHub();
};

window.closeOrdersModal = function() {
  const modal = document.getElementById('ordersModal');
  if (modal) modal.style.display = 'none';
};

/* ==========================================================================
   4-STAGE VISUAL TRACKING STEPPER GENERATOR
   ========================================================================== */
function generateOrderTimelineHTML(o) {
  let stage = 2; // Real Confirmed Order starts at Stage 2
  const statusStr = (o.delivery_status || o.payment_status || '').toLowerCase();

  if (statusStr.includes('deliver')) {
    stage = 4;
  } else if (o.awb || statusStr.includes('transit') || statusStr.includes('shipped') || statusStr.includes('dispatch')) {
    stage = 3;
  } else if (statusStr.includes('paid') || statusStr.includes('success') || statusStr.includes('captured')) {
    stage = 2;
  } else {
    stage = 1;
  }

  const steps = [
    { title: 'Order Received', desc: 'Order confirmed & queued' },
    { title: 'Freshly Baked & Packed', desc: 'Baked with pure butter in small batches' },
    { title: 'Handed to Delhivery', desc: o.awb ? `Dispatched (AWB: ${o.awb})` : 'Dispatched via express courier' },
    { title: 'Delivered', desc: 'Safely delivered to customer' }
  ];

  return `
    <div class="tracking-stepper">
      ${steps.map((s, idx) => {
        const stepNum = idx + 1;
        const isCompleted = stepNum < stage || (stepNum === 4 && stage === 4);
        const isActive = stepNum === stage && stage !== 4;
        const stateClass = isCompleted ? 'completed' : (isActive ? 'active' : '');
        const dotText = isCompleted ? '✓' : (isActive ? '●' : stepNum);

        return `
          <div class="step-item ${stateClass}">
            <div class="step-dot">${dotText}</div>
            <div class="step-content">
              <b>${s.title}</b>
              <small>${s.desc}</small>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function renderOrderCards(ordersList) {
  return ordersList.map(o => {
    const waHelpMessage = encodeURIComponent(`Hi Srivari Cookies, I need assistance regarding my Order #${o.id}.`);
    return `
      <div class="order-tracking-card">
        <div class="order-header-row">
          <div>
            <span class="order-header-id">Order #${o.id}</span>
            <div style="font-size:11px;color:#888;margin-top:2px;">${o.created_at ? o.created_at.slice(0, 10) : 'Recent'}</div>
          </div>
          <div style="text-align:right;">
            <span class="order-status-badge">${o.payment_status || 'PAID'}</span>
            <div style="font-size:13px;font-weight:700;color:#12352e;margin-top:2px;">₹${o.total}</div>
          </div>
        </div>

        ${generateOrderTimelineHTML(o)}

        <div class="order-actions-row">
          ${o.awb ? `
            <a href="https://www.delhivery.com/track/package/${o.awb}" target="_blank" rel="noopener" class="track-delhivery-btn">
              🚚 Delhivery Track
            </a>
          ` : `
            <span style="font-size:11px;color:#697a75;display:inline-flex;align-items:center;">⏳ Courier tracking updating...</span>
          `}
          <a href="https://wa.me/917989816250?text=${waHelpMessage}" target="_blank" rel="noopener" class="order-wa-help-btn">
            💬 Order Help
          </a>
        </div>
      </div>
    `;
  }).join('');
}

window.fetchCustomerOrders = async function(customPhone) {
  const container = document.getElementById('ordersListContainer');
  const profile = JSON.parse(localStorage.getItem('srivari_customer_profile') || '{}');
  let phone = customPhone || profile.phone || '';

  phone = phone.replace(/\D/g, '');
  if (phone.length > 10) phone = phone.slice(-10);

  if (!phone || phone.length < 10) return;

  if (container) container.innerHTML = '<div style="text-align:center;padding:15px;color:#666;font-size:13px;">Searching your orders...</div>';

  try {
    const res = await fetch(`${ORDERS_API}/customer-orders?phone=${phone}`, { cache: 'no-store' });
    const data = await res.json().catch(() => ({}));
    if (!container) return;

    if (data && data.success && Array.isArray(data.orders) && data.orders.length > 0) {
      container.innerHTML = renderOrderCards(data.orders);
      return;
    }

    container.innerHTML = `
      <div style="text-align:center;padding:26px 14px;color:#697a75;font-size:13px;line-height:1.6;">
        Ee mobile number tho inthavaraku orders emi levu.<br>
        <a href="#shop" onclick="closeOrdersModal()" style="display:inline-block;margin-top:10px;background:#005448;color:#fff;padding:8px 16px;border-radius:8px;text-decoration:none;font-weight:700;font-size:12px;">
          🛒 Order Gourmet Cookies
        </a>
      </div>
    `;

  } catch (e) {
    if (container) {
      container.innerHTML = '<div style="text-align:center;padding:18px;color:#c5221f;font-size:13px;">Orders load cheyadam kudaraledu. Dhayachesi malli try cheyandi.</div>';
    }
  }
};

function openRazorpayCheckout(orderInfo, rzpOrderData) {
  return new Promise((resolve, reject) => {
    if (typeof Razorpay === 'undefined') {
      reject(new Error('Razorpay Checkout could not load. Please refresh the page.'));
      return;
    }

    const options = {
      key: rzpOrderData.key || rzpOrderData.keyId,
      amount: rzpOrderData.amount,
      currency: 'INR',
      name: 'SRIVARI COOKIES',
      description: 'Cookie Order Payment',
      order_id: rzpOrderData.razorpay_order_id || rzpOrderData.orderId,
      prefill: {
        name: orderInfo.name,
        contact: orderInfo.phone,
        email: orderInfo.email || undefined
      },
      theme: { color: '#7b3f18' },
      handler: response => resolve(response),
      modal: {
        ondismiss: () => reject(new Error('Payment window closed before payment was completed.'))
      }
    };

    const rzp = new Razorpay(options);
    rzp.on('payment.failed', response => {
      reject(new Error(response?.error?.description || 'Payment failed. Please try again.'));
    });
    rzp.open();
  });
}

// 7. Checkout Form Submit (Live Razorpay & Delhivery Booking)
const checkoutForm = document.getElementById('checkout');
checkoutForm?.addEventListener('submit', async e => {
  e.preventDefault();
  if (checkoutBusy) return;
  if (!cart.length) {
    alert('Please add cookies to cart.');
    return;
  }

  const name = (document.getElementById('cname') || document.getElementById('custName'))?.value.trim();
  const phone = (document.getElementById('phone') || document.getElementById('custPhone'))?.value.trim();
  const email = document.getElementById('email')?.value.trim() || '';
  const address = (document.getElementById('address') || document.getElementById('custAddress'))?.value.trim();
  const pincode = (document.getElementById('pincode') || document.getElementById('cartPincode'))?.value.trim();

  if (!name || !phone || !address || !/^\d{6}$/.test(pincode)) {
    alert('Please fill all required details and enter a valid 6-digit pincode.');
    return;
  }

  localStorage.setItem('srivari_customer_profile', JSON.stringify({ name, phone, email, address, pincode }));

  const ready = await calculateDelivery();
  if (!ready) return;

  const subtotal = cartSubtotal();
  const total = Math.round((subtotal + deliveryCharge) * 100) / 100;
  const fullAddressText = `${address}, Pincode: ${pincode}`;

  checkoutBusy = true;
  const button = document.querySelector('.checkoutBtn') || document.getElementById('payNowBtn');
  const oldText = button?.textContent || 'Pay Now';

  if (button) {
    button.disabled = true;
    button.textContent = 'Creating secure order…';
  }

  try {
    const createRes = await fetch(ORDERS_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer_name: name,
        mobile: phone,
        address: fullAddressText,
        total: total,
        items: cart.map(i => {
          const p = configuredProducts.find(x => x.id === i.id);
          return {
            product_id: i.id,
            product_name: p?.name || i.id,
            weight_g: i.weight,
            quantity: i.qty,
            unit_price: priceFor(p, i.weight),
            line_total: priceFor(p, i.weight) * i.qty
          };
        })
      })
    });

    const rzpOrderData = await createRes.json();
    if (!createRes.ok || !rzpOrderData.success) {
      throw new Error(rzpOrderData.error || 'Could not create order.');
    }

    if (button) button.textContent = 'Opening Razorpay…';

    const paymentResponse = await openRazorpayCheckout(
      { name, phone, email },
      rzpOrderData
    );

    if (button) button.textContent = 'Verifying payment…';

    let verifyResponse = {};
    try {
      const vRes = await fetch(ORDERS_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verify_payment',
          order_id: rzpOrderData.order_id,
          razorpay_order_id: paymentResponse.razorpay_order_id,
          razorpay_payment_id: paymentResponse.razorpay_payment_id,
          razorpay_signature: paymentResponse.razorpay_signature,
          customer_name: name,
          name: name,
          phone: phone,
          mobile: phone,
          address: fullAddressText,
          total: total
        })
      });
      verifyResponse = await vRes.json();
    } catch (err) {
      console.warn('Verification warning:', err);
    }

    let shipmentAwb = verifyResponse.awb || '';
    if (!shipmentAwb) {
      try {
        const shipRes = await fetch(`${DELHIVERY_API}/create-shipment`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId: rzpOrderData.order_id,
            weight: cartWeightGrams()
          })
        });
        const shipData = await shipRes.json().catch(() => ({}));
        if (shipRes.ok && shipData.success) {
          shipmentAwb = shipData.awb;
        }
      } catch (shipErr) {
        console.warn('Delhivery booking:', shipErr);
      }
    }

    const paidOrder = {
      orderId: verifyResponse.order_number || verifyResponse.order_id || rzpOrderData.order_id,
      name, phone, email, address, pincode,
      items: cart.map(i => {
        const p = configuredProducts.find(x => x.id === i.id);
        return {
          id: i.id,
          name: p?.name || i.id,
          weight: i.weight,
          qty: i.qty,
          amount: priceFor(p, i.weight) * i.qty
        };
      }),
      subtotal, deliveryCharge, total,
      paymentId: paymentResponse.razorpay_payment_id,
      awb: shipmentAwb
    };

    localStorage.setItem('srivari_pending_order', JSON.stringify(paidOrder));

    cart = [];
    deliveryCharge = null;
    lastDeliveryPincode = '';
    saveCart();

    checkoutForm.reset();
    closeDrawer();

    window.location.href = 'receipt.html';

  } catch (error) {
    console.error('Checkout error:', error);
    alert(error.message || 'Payment could not be completed. Please try again.');
  } finally {
    checkoutBusy = false;
    if (button) {
      button.disabled = false;
      button.textContent = oldText;
    }
  }
});

/* ==========================================================================
   NEW: SRIVARI SEVA DESK & BOTTOM MOBILE NAVIGATION CONTROLS
   ========================================================================== */
window.openSupportDrawer = function() {
  const drawer = document.getElementById('supportDrawer');
  const overlay = document.getElementById('supportOverlay') || document.getElementById('supportDrawerOverlay');
  if (drawer) drawer.classList.add('open');
  if (overlay) overlay.style.display = 'block';
};

window.closeSupportDrawer = function() {
  const drawer = document.getElementById('supportDrawer');
  const overlay = document.getElementById('supportOverlay') || document.getElementById('supportDrawerOverlay');
  if (drawer) drawer.classList.remove('open');
  if (overlay) overlay.style.display = 'none';
};

window.handleSupportSubmit = function(e) {
  e.preventDefault();
  const name = (document.getElementById('sevaName') || document.getElementById('supName'))?.value.trim() || '';
  const phone = (document.getElementById('sevaPhone') || document.getElementById('supPhone'))?.value.trim() || '';
  const msg = (document.getElementById('sevaMsg') || document.getElementById('supMsg'))?.value.trim() || '';

  const formattedMsg = `Namaskaram Shyam garu,\nNa peru: ${name}\nMobile: ${phone}\nBulk/Special Requirement: ${msg}\n(Srivari Cookies Website Seva Enquiry)`;
  const url = `https://wa.me/917989816250?text=${encodeURIComponent(formattedMsg)}`;
  window.open(url, '_blank');
  closeSupportDrawer();
};

window.scrollToProducts = function() {
  const el = document.getElementById('products-section') || document.getElementById('productGrid') || document.getElementById('cookie-grid') || document.getElementById('shop');
  if (el) el.scrollIntoView({ behavior: 'smooth' });
};

window.scrollToTop = function() {
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

/* ==========================================================================
   INITIALIZATION & ADMIN REALTIME SYNC
   ========================================================================== */
renderProducts();
saveCart();
autoFillCustomerDetails();

async function syncFromAdmin() {
  try {
    const res = await fetch(`${ORDERS_API}/products`, { cache: 'no-store' });
    const data = await res.json();
    if (data.success && Array.isArray(data.products) && data.products.length > 0) {
      data.products.forEach(p => {
        let item = configuredProducts.find(x => x.id === p.id);
        if (item) {
          if (p.name) item.name = p.name;
          if (p.price200) item.price200 = Number(p.price200);
          if (p.price400) item.price400 = Number(p.price400);
          if (p.mrp200) item.mrp200 = Number(p.mrp200);
          if (p.mrp400) item.mrp400 = Number(p.mrp400);
          if (p.in_stock !== undefined && p.in_stock !== null) {
            item.in_stock = Number(p.in_stock);
          }
        }
      });
      renderProducts();
    }
  } catch (e) {
    console.warn('Sync fallback: default list active.');
  }
}

syncFromAdmin();
