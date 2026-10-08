let products = [
  { id: 'almond', name: 'Almond Cashew Cookies', price200: 250, price400: 500, mrp200: 320, mrp400: 650, image: 'assets/almond-cashew.jpg', badge: 'BEST SELLER', in_stock: 1 },
  { id: 'butter', name: 'Butter Cookies', price200: 250, price400: 500, mrp200: 320, mrp400: 650, image: 'assets/butter.jpg', badge: 'FRESHLY BAKED', in_stock: 1 },
  { id: 'chip', name: 'Classic Choco Chip Cookies', price200: 250, price400: 500, mrp200: 320, mrp400: 650, image: 'assets/classic-chip.jpg', badge: 'POPULAR', in_stock: 0 },
  { id: 'coconut', name: 'Coconut Cookies', price200: 250, price400: 500, mrp200: 320, mrp400: 650, image: 'assets/coconut.jpg', badge: 'FRESH TODAY', in_stock: 0 },
  { id: 'double', name: 'Double Chocolate Cookies', price200: 250, price400: 500, mrp200: 320, mrp400: 650, image: 'assets/double-chocolate.jpg', badge: 'RICH & FUDGY', in_stock: 1 },
  { id: 'dry', name: 'Dry Fruit Cookies', price200: 600, price400: 1200, mrp200: 750, mrp400: 1500, image: 'assets/dry-fruit.jpg', badge: 'PREMIUM', in_stock: 1 },
  { id: 'oats', name: 'Oats Raisin Cookies', price200: 250, price400: 500, mrp200: 320, mrp400: 650, image: 'assets/oats-raisin.jpg', badge: 'HEALTHY CHOICE', in_stock: 1 },
  { id: 'red', name: 'Red Velvet Cookies', price200: 250, price400: 500, mrp200: 320, mrp400: 650, image: 'assets/red-velvet.jpg', badge: 'NEW', in_stock: 1 }
];

let cart = JSON.parse(localStorage.getItem('srivariCart') || '[]');
let configuredProducts = products.map(p => ({ ...p }));

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
      <article class="card" data-product="${p.id}" style="${isOutOfStock ? 'opacity: 0.85;' : ''}">
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
            ? `<button class="add" disabled style="background:#888; color:#fff; cursor:not-allowed; opacity:0.85;">✕ Out of Stock</button>`
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

window.openOrdersModal = function() {
  const modal = document.getElementById('ordersModal');
  if (modal) modal.style.display = 'flex';
  const saved = JSON.parse(localStorage.getItem('srivari_customer_profile') || '{}');
  const input = document.getElementById('lookupPhone');
  if (input && saved.phone) {
    input.value = saved.phone;
    fetchCustomerOrders();
  }
};

window.closeOrdersModal = function() {
  const modal = document.getElementById('ordersModal');
  if (modal) modal.style.display = 'none';
};

window.fetchCustomerOrders = async function() {
  const input = document.getElementById('lookupPhone');
  const container = document.getElementById('ordersListContainer');
  let phone = input ? input.value.replace(/\D/g, '') : '';
  if (phone.length > 10) phone = phone.slice(-10);

  if (!phone || phone.length < 10) {
    alert('Please enter a valid 10-digit mobile number');
    return;
  }

  if (container) container.innerHTML = '<div style="text-align:center;padding:15px;color:#666;">Searching your orders...</div>';

  try {
    const res = await fetch(`${ORDERS_API}/customer-orders?phone=${phone}`, { cache: 'no-store' });
    const data = await res.json();
    if (!container) return;

    if (!data.success || !data.orders || !data.orders.length) {
      container.innerHTML = '<div style="text-align:center;padding:20px;color:#777;">No previous orders found.</div>';
      return;
    }

    container.innerHTML = data.orders.map(o => `
      <div style="background:#fff;border:1px solid #ebdcd0;border-radius:10px;padding:12px;margin-bottom:10px;">
        <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
          <b style="color:#5a2e10;">Order #${o.id}</b>
          <span style="color:#137333;font-weight:bold;font-size:12px;text-transform:uppercase;">${o.payment_status}</span>
        </div>
        <div style="font-size:13px;color:#444;line-height:1.5;">
          <div>Amount: ₹${o.total}</div>
          <div>Date: ${o.created_at ? o.created_at.slice(0, 10) : 'Recent'}</div>
          ${o.awb ? `<div style="margin-top:4px;">AWB: <code>${o.awb}</code></div>` : ''}
        </div>
        ${o.awb ? `<a href="https://www.delhivery.com/track/package/${o.awb}" target="_blank" style="background:#075e45;color:#fff;padding:6px 12px;text-decoration:none;border-radius:6px;font-size:12px;display:inline-block;margin-top:6px;">🚚 Track Live</a>` : ''}
      </div>
    `).join('');
  } catch (e) {
    if (container) container.innerHTML = '<div style="text-align:center;padding:15px;color:#c5221f;">Could not load orders.</div>';
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

// Safe Instant Boot
renderProducts();
saveCart();
autoFillCustomerDetails();

// Cloudflare D1 Sync
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
          item.in_stock = Number(p.in_stock);
        }
      });
      renderProducts();
    }
  } catch (e) {
    console.warn('Sync fallback: default list active.');
  }
}

syncFromAdmin();
