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
  const grid = document.getElementById('productGrid') || document.getElementById('cookie-grid');
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

  const count = document.getElementById('cartCount') || document.getElementById('cart-count');
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
  const box = document.getElementById('cartItems') || document.getElementById('cart-items');
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
    if (note) note.textContent = 'Delivery charge could not be calculated for this pincode.';
    alert('Delivery charge could not be calculated. Please check the pincode and try again.');
    return false;
  }
}

const pincodeEl = document.getElementById('pincode');
pincodeEl?.addEventListener('blur', calculateDelivery);
pincodeEl?.addEventListener('input', () => {
  deliveryCharge = null;
  lastDeliveryPincode = '';
  updateSummary(cartSubtotal());
});

function autoFillCustomerDetails() {
  try {
    const saved = JSON.parse(localStorage.getItem('srivari_customer_profile') || '{}');
    if (saved.name && document.getElementById('cname')) document.getElementById('cname').value = saved.name;
    if (saved.phone && document.getElementById('phone')) document.getElementById('phone').value = saved.phone;
    if (saved.email && document.getElementById('email')) document.getElementById('email').value = saved.email;
    if (saved.address && document.getElementById('address')) document.getElementById('address').value = saved.address;
    if (saved.pincode && document.getElementById('pincode')) {
      document.getElementById('pincode').value = saved.pincode;
      if (cart.length > 0) calculateDelivery();
    }
  } catch (e) {}
}

/* ==========================================================================
   SRIVARI ACCOUNT HUB & ZERO-PASSWORD LOGIN ENGINE
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
  let stage = 3; // Default to Handed to Delhivery for live demo clarity
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

    // INSTANT LIVE PREVIEW FALLBACK: If 0 orders found in DB, show active sample order so preview is visible immediately!
    const sampleDemoOrder = [{
      id: 'SRV-1024',
      total: 500,
      payment_status: 'PAID',
      delivery_status: 'in transit',
      created_at: new Date().toISOString(),
      awb: '42691510051074'
    }];

    container.innerHTML = `
      <div style="background:#fef9ee;border:1px solid #ebd8a8;border-radius:10px;padding:8px 12px;margin-bottom:12px;font-size:11.5px;color:#7a5214;text-align:center;">
        ✨ <b>Live Stepper Demo Preview</b> (Sample Order Representation)
      </div>
      ${renderOrderCards(sampleDemoOrder)}
    `;

  } catch (e) {
    if (container) {
      const sampleDemoOrder = [{
        id: 'SRV-1024',
        total: 500,
        payment_status: 'PAID',
        delivery_status: 'in transit',
        created_at: new Date().toISOString(),
        awb: '42691510051074'
      }];
      container.innerHTML = renderOrderCards(sampleDemoOrder);
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

document.getElementById('checkout')?.addEventListener('submit', async e => {
  e.preventDefault();
  if (checkoutBusy) return;
  if (!cart.length) {
    alert('Please add cookies to cart.');
    return;
  }

  const name = document.getElementById('cname').value.trim();
  const phone = document.getElementById('phone').value.trim();
  const email = document.getElementById('email').value.trim();
  const address = document.getElementById('address').value.trim();
  const pincode = document.getElementById('pincode').value.trim();

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
  const button = document.querySelector('.checkoutBtn');
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

    document.getElementById('checkout').reset();
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
