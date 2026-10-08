const products=[
  {id:'almond',name:'Almond Cashew Cookies (Test ₹1)',price200:1,price400:1,mrp200:250,mrp400:500,image:'assets/almond-cashew.jpg',badge:'TEST ITEM'},
  {id:'butter',name:'Butter Cookies',price200:250,price400:500,mrp200:250,mrp400:500,image:'assets/butter.jpg',badge:'FRESHLY BAKED'},
  {id:'chip',name:'Classic Choco Chip Cookies',price200:250,price400:500,mrp200:250,mrp400:500,image:'assets/classic-chip.jpg',badge:'POPULAR'},
  {id:'coconut',name:'Coconut Cookies',price200:250,price400:500,mrp200:250,mrp400:500,image:'assets/coconut.jpg',badge:'FRESH TODAY'},
  {id:'double',name:'Double Chocolate Cookies',price200:250,price400:500,mrp200:250,mrp400:500,image:'assets/double-chocolate.jpg',badge:'RICH & FUDGY'},
  {id:'dry',name:'Dry Fruit Cookies',price200:250,price400:500,mrp200:250,mrp400:500,image:'assets/dry-fruit.jpg',badge:'PREMIUM'},
  {id:'oats',name:'Oats Raisin Cookies',price200:250,price400:500,mrp200:250,mrp400:500,image:'assets/oats-raisin.jpg',badge:'HEALTHY CHOICE'},
  {id:'red',name:'Red Velvet Cookies',price200:250,price400:500,mrp200:250,mrp400:500,image:'assets/red-velvet.jpg',badge:'NEW'}
];

let cart=JSON.parse(localStorage.getItem('srivariCart')||'[]');

const grid=document.getElementById('productGrid');
const configuredProducts=products.map(p=>({...p}));

const DELHIVERY_API='https://srivari-delhivery-api.chiluverushyam8790.workers.dev';
const ORDERS_API='https://srivari-orders-api.chiluverushyam8790.workers.dev';

let deliveryCharge=null;
let lastDeliveryPincode='';
let checkoutBusy=false;

function priceFor(p,w){
  return w===200?p.price200:p.price400;
}

function mrpFor(p,w){
  return w===200?p.mrp200:p.mrp400;
}

function discount(p,w){
  const price=priceFor(p,w);
  const mrp=mrpFor(p,w);
  return price&&mrp?Math.round((1-price/mrp)*100):null;
}

function renderProducts(){
  if(!grid) return;
  grid.innerHTML=configuredProducts.map(p=>`
    <article class="card" data-product="${p.id}">
      <div class="photo">
        <img src="${p.image}" alt="${p.name}" loading="lazy">
        <span class="badge">${p.badge}</span>
      </div>

      <div class="info">
        <h3>${p.name}</h3>

        <div class="weightChoices" role="group">
          <button type="button"
            class="weightBtn active"
            data-weight="200"
            onclick="selectWeight('${p.id}',200)">
            200g
          </button>

          <button type="button"
            class="weightBtn"
            data-weight="400"
            onclick="selectWeight('${p.id}',400)">
            400g
          </button>
        </div>

        <div class="priceArea" id="price-${p.id}">
          ${priceBlock(p,200)}
        </div>

        <button class="add" onclick="addToCart('${p.id}')">
          🛒 Add to Cart
        </button>
      </div>
    </article>
  `).join('');
}

function priceBlock(p,w){
  const price=priceFor(p,w);
  const mrp=mrpFor(p,w);
  const off=discount(p,w);

  return `
    <div class="priceRow">
      <div class="price">
        ₹${price}
        <span class="mrp">₹${mrp}</span>
      </div>
      ${off?`<span class="off">${off}% OFF</span>`:''}
    </div>
  `;
}

function selectWeight(id,w){
  const p=configuredProducts.find(x=>x.id===id);
  if(!p)return;

  const card=document.querySelector(`[data-product="${id}"]`);
  if(!card)return;

  card.querySelectorAll('.weightBtn').forEach(b=>{
    b.classList.toggle(
      'active',
      Number(b.dataset.weight)===w
    );
  });

  card.querySelector(`#price-${id}`).innerHTML=
    priceBlock(p,w);
}

function addToCart(id){
  const p=configuredProducts.find(x=>x.id===id);
  const card=document.querySelector(`[data-product="${id}"]`);

  if(!p||!card)return;

  const active=card.querySelector('.weightBtn.active');
  const w=Number(active?.dataset.weight||200);

  const key=`${id}-${w}`;
  const x=cart.find(i=>i.key===key);

  if(x){
    x.qty++;
  }else{
    cart.push({
      key,
      id,
      weight:w,
      qty:1
    });
  }

  deliveryCharge=null;
  lastDeliveryPincode='';

  saveCart();
  openDrawer();
}

function saveCart(){
  localStorage.setItem(
    'srivariCart',
    JSON.stringify(cart)
  );

  renderCart();

  const count=document.getElementById('cartCount');

  if(count){
    count.textContent=
      cart.reduce((s,i)=>s+i.qty,0);
  }
}

function cartWeightGrams(){
  return cart.reduce(
    (sum,i)=>sum+(Number(i.weight)||0)*i.qty,
    0
  );
}

function cartSubtotal(){
  return cart.reduce((sum,i)=>{
    const p=configuredProducts.find(x=>x.id===i.id);
    if(!p)return sum;

    return sum+priceFor(p,i.weight)*i.qty;
  },0);
}

function renderCart(){
  const box=document.getElementById('cartItems');
  if(!box)return;

  if(!cart.length){
    box.innerHTML=
      '<div class="empty">Your cart is empty.<br>Add some cookies ❤️</div>';

    updateSummary(0);
    return;
  }

  let subtotal=0;

  box.innerHTML=cart.map(i=>{
    const p=configuredProducts.find(x=>x.id===i.id);
    if(!p)return '';

    const price=priceFor(p,i.weight);
    subtotal+=price*i.qty;

    return `
      <div class="cartLine">
        <img src="${p.image}" alt="">

        <div>
          <b>${p.name}</b>
          <small>${i.weight}g • ₹${price} × ${i.qty}</small>
        </div>

        <div class="qty">
          <button onclick="changeQty('${i.key}',-1)">−</button>
          <span>${i.qty}</span>
          <button onclick="changeQty('${i.key}',1)">+</button>
        </div>
      </div>
    `;
  }).join('');

  updateSummary(subtotal);
}

function changeQty(key,d){
  const x=cart.find(i=>i.key===key);
  if(!x)return;

  x.qty+=d;

  if(x.qty<=0){
    cart=cart.filter(i=>i.key!==key);
  }

  deliveryCharge=null;
  lastDeliveryPincode='';

  saveCart();
}

function updateSummary(subtotal){
  const subtotalEl=document.getElementById('cartSubtotal');
  const deliveryEl=document.getElementById('cartDelivery');
  const totalEl=document.getElementById('cartTotal');
  const note=document.getElementById('deliveryNote');

  if(subtotalEl)
    subtotalEl.textContent='₹'+subtotal;

  if(deliveryEl)
    deliveryEl.textContent=
      deliveryCharge==null
        ?'—'
        :'₹'+Math.round(deliveryCharge);

  if(totalEl){
    totalEl.textContent=
      '₹'+Math.round(
        deliveryCharge==null
          ?subtotal
          :subtotal+deliveryCharge
      );
  }

  if(note){
    note.textContent=
      deliveryCharge==null
        ?'Enter your pincode to calculate delivery charge.'
        :'Delivery charge: ₹'+Math.round(deliveryCharge);
  }
}

function openDrawer(){
  document.getElementById('drawer')?.classList.add('open');
  document.getElementById('shade')?.classList.add('open');
  document.body.classList.add('noScroll');
}

function closeDrawer(){
  document.getElementById('drawer')?.classList.remove('open');
  document.getElementById('shade')?.classList.remove('open');
  document.body.classList.remove('noScroll');
}

document.getElementById('openCart')?.addEventListener(
  'click',
  openDrawer
);

document.getElementById('closeCart')?.addEventListener(
  'click',
  closeDrawer
);

document.getElementById('shade')?.addEventListener(
  'click',
  closeDrawer
);

async function calculateDelivery(){
  const pincode=
    document.getElementById('pincode').value.trim();

  if(!/^\d{6}$/.test(pincode)){
    deliveryCharge=null;
    lastDeliveryPincode='';
    updateSummary(cartSubtotal());
    return false;
  }

  const weight=cartWeightGrams();

  if(weight<=0){
    alert('Please add cookies to cart.');
    return false;
  }

  const note=document.getElementById('deliveryNote');

  if(note)
    note.textContent='Calculating delivery charge…';

  try{
    const url=
      `${DELHIVERY_API}/?pincode=${encodeURIComponent(pincode)}&weight=${Math.ceil(weight)}`;

    const response=
      await fetch(url,{cache:'no-store'});

    const data=
      await response.json().catch(()=>({}));

    if(!response.ok||!data.success){
      throw new Error(
        data.error||'Delivery charge unavailable'
      );
    }

    deliveryCharge=Number(data.shippingCharge);

    if(!Number.isFinite(deliveryCharge)){
      throw new Error('Invalid delivery charge');
    }

    lastDeliveryPincode=pincode;
    updateSummary(cartSubtotal());

    return true;

  }catch(error){

    console.error('Delhivery error:',error);

    deliveryCharge=null;
    lastDeliveryPincode='';

    updateSummary(cartSubtotal());

    if(note){
      note.textContent=
        'Delivery charge could not be calculated for this pincode.';
    }

    alert(
      'Delivery charge could not be calculated. Please check the pincode and try again.'
    );

    return false;
  }
}

const pincodeEl=document.getElementById('pincode');

pincodeEl?.addEventListener(
  'blur',
  calculateDelivery
);

pincodeEl?.addEventListener(
  'input',
  ()=>{
    deliveryCharge=null;
    lastDeliveryPincode='';
    updateSummary(cartSubtotal());
  }
);

/* ================================
   CLOUDFLARE WORKER D1 API CALL
================================ */

async function callOrdersApi(payload){
  const response=await fetch(ORDERS_API, {
    method:'POST',
    headers:{
      'Content-Type':'application/json'
    },
    body:JSON.stringify(payload)
  });

  const data=await response.json().catch(()=>({}));

  if(!response.ok || data.error || data.success===false){
    throw new Error(
      (typeof data.error === 'string' ? data.error : data.error?.description) || 'Order service unavailable'
    );
  }

  return data;
}

/* ================================
   RAZORPAY CHECKOUT
================================ */

function openRazorpayCheckout(orderInfo, rzpOrderData){
  return new Promise((resolve,reject)=>{
    if(typeof Razorpay==='undefined'){
      reject(
        new Error('Razorpay Checkout could not load. Please refresh the page.')
      );
      return;
    }

    let rzpInstance = null;

    const options={
      key: rzpOrderData.key || rzpOrderData.keyId,
      amount: rzpOrderData.amount,
      currency: 'INR',
      name: 'SRIVARI COOKIES',
      description: 'Cookie Order Payment',
      order_id: rzpOrderData.razorpay_order_id || rzpOrderData.orderId,
      prefill:{
        name: orderInfo.name,
        contact: orderInfo.phone,
        email: orderInfo.email||undefined
      },
      notes:{
        srivari_order_id: rzpOrderData.order_id
      },
      theme:{
        color:'#7b3f18'
      },
      handler: function(response){
        // Close modal explicitly so it doesn't get stuck
        if (rzpInstance && typeof rzpInstance.close === 'function') {
          try { rzpInstance.close(); } catch(e){}
        }
        resolve(response);
      },
      modal:{
        ondismiss: function(){
          reject(
            new Error('Payment window closed before payment was completed.')
          );
        }
      }
    };

    rzpInstance = new Razorpay(options);

    rzpInstance.on('payment.failed', function(response){
      reject(
        new Error(
          response?.error?.description || 'Payment failed. Please try again.'
        )
      );
    });

    rzpInstance.open();
  });
}

/* ================================
   CHECKOUT PROCESS
================================ */

document
.getElementById('checkout')
?.addEventListener(
  'submit',
  async e=>{
    e.preventDefault();

    if(checkoutBusy)return;

    if(!cart.length){
      alert('Please add cookies to cart.');
      return;
    }

    const name=document.getElementById('cname').value.trim();
    const phone=document.getElementById('phone').value.trim();
    const email=document.getElementById('email').value.trim();
    const address=document.getElementById('address').value.trim();
    const pincode=document.getElementById('pincode').value.trim();

    if(!name||!phone||!address||!/^\d{6}$/.test(pincode)){
      alert('Please fill all required details and enter a valid 6-digit pincode.');
      return;
    }

    const ready=await calculateDelivery();
    if(!ready)return;

    // Test Purpose: Amount ₹1
    const subtotal=cartSubtotal();
    const total=1;

    checkoutBusy=true;

    const button=document.querySelector('.checkoutBtn');
    const oldText=button?.textContent||'Pay Now';

    if(button){
      button.disabled=true;
      button.textContent='Creating secure order…';
    }

    try{
      // 1. Worker Call: Order create
      const rzpOrderData = await callOrdersApi({
        action: 'create_order',
        amount: total,
        total: total,
        customer_name: name,
        mobile: phone,
        address: `${address}\nPincode: ${pincode}`,
        customer: {
          name,
          phone,
          email,
          address: `${address}\nPincode: ${pincode}`,
          items: cart.map(i=>{
            const p=configuredProducts.find(x=>x.id===i.id);
            return {
              product_id: i.id,
              product_name: p?.name||i.id,
              weight_g: i.weight,
              quantity: i.qty,
              unit_price: priceFor(p,i.weight),
              line_total: priceFor(p,i.weight)*i.qty
            };
          })
        }
      });

      if(button)
        button.textContent='Opening Razorpay…';

      // 2. Open Razorpay Checkout Window
      const paymentResponse = await openRazorpayCheckout(
        { name, phone, email },
        rzpOrderData
      );

      if(button)
        button.textContent='Verifying payment…';

      // 3. Worker Call: Verify signature & update DB to PAID
      try {
        await callOrdersApi({
          action: 'verify_payment',
          order_id: rzpOrderData.order_id,
          razorpay_order_id: paymentResponse.razorpay_order_id,
          razorpay_payment_id: paymentResponse.razorpay_payment_id,
          razorpay_signature: paymentResponse.razorpay_signature
        });
      } catch (verifyErr) {
        console.warn('Verification warning:', verifyErr);
      }

      // 4. Save to localStorage for Receipt Page
      const paidOrder={
        orderId: rzpOrderData.order_id,
        name,
        phone,
        email,
        address,
        pincode,
        items: cart.map(i=>{
          const p=configuredProducts.find(x=>x.id===i.id);
          return {
            id: i.id,
            name: p?.name||i.id,
            weight: i.weight,
            qty: i.qty,
            amount: priceFor(p,i.weight)*i.qty
          };
        }),
        subtotal,
        deliveryCharge,
        total,
        paymentId: paymentResponse.razorpay_payment_id,
        awb: ''
      };

      localStorage.setItem('srivari_pending_order', JSON.stringify(paidOrder));

      // Reset Cart
      cart=[];
      deliveryCharge=null;
      lastDeliveryPincode='';
      saveCart();

      document.getElementById('checkout').reset();
      closeDrawer();

      // Direct Redirect to Receipt Page without blocking
      setTimeout(() => {
        window.location.href = 'receipt.html';
      }, 300);

    }catch(error){
      console.error('Checkout error:', error);
      alert(error.message || 'Payment could not be completed. Please try again.');
    }finally{
      checkoutBusy=false;
      if(button){
        button.disabled=false;
        button.textContent=oldText;
      }
    }
  }
);

renderProducts();
saveCart();
