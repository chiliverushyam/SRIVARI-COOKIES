const products=[
  {id:'almond',name:'Almond Cashew Cookies',price200:250,price400:500,mrp200:250,mrp400:500,image:'assets/almond-cashew.jpg',badge:'BEST SELLER'},
  {id:'butter',name:'Butter Cookies',price200:250,price400:500,mrp200:250,mrp400:500,image:'assets/butter.jpg',badge:'FRESHLY BAKED'},
  {id:'chip',name:'Classic Choco Chip Cookies',price200:250,price400:500,mrp200:250,mrp400:500,image:'assets/classic-chip.jpg',badge:'POPULAR'},
  {id:'coconut',name:'Coconut Cookies',price200:250,price400:500,mrp200:250,mrp400:500,image:'assets/coconut.jpg',badge:'FRESH TODAY'},
  {id:'double',name:'Double Chocolate Cookies',price200:250,price400:500,mrp200:250,mrp400:500,image:'assets/double-chocolate.jpg',badge:'RICH & FUDGY'},
  {id:'dry',name:'Dry Fruit Cookies',price200:250,price400:500,mrp200:250,mrp400:500,image:'assets/dry-fruit.jpg',badge:'PREMIUM'},
  {id:'oats',name:'Oats Raisin Cookies',price200:250,price400:500,mrp200:250,mrp400:500,image:'assets/oats-raisin.jpg',badge:'HEALTHY CHOICE'},
  {id:'red',name:'Red Velvet Cookies',price200:250,price400:500,mrp200:250,mrp400:500,image:'assets/red-velvet.jpg',badge:'NEW'}
];

let cart=JSON.parse(localStorage.getItem('srivariCart')||'[]');
const configuredProducts=products.map(p=>({...p}));

const DELHIVERY_API='https://srivari-delhivery-api.chiluverushyam8790.workers.dev';
const ORDERS_API='https://srivari-orders-api.chiluverushyam8790.workers.dev';

let deliveryCharge=null;
let lastDeliveryPincode='';
let checkoutBusy=false;

function priceFor(p,w){ return w===200?p.price200:p.price400; }
function mrpFor(p,w){ return w===200?p.mrp200:p.mrp400; }
function discount(p,w){
  const price=priceFor(p,w);
  const mrp=mrpFor(p,w);
  return price&&mrp?Math.round((1-price/mrp)*100):null;
}

function renderProducts(){
  const grid=document.getElementById('productGrid');
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
          <button type="button" class="weightBtn active" data-weight="200" onclick="selectWeight('${p.id}',200)">200g</button>
          <button type="button" class="weightBtn" data-weight="400" onclick="selectWeight('${p.id}',400)">400g</button>
        </div>
        <div class="priceArea" id="price-${p.id}">${priceBlock(p,200)}</div>
        <button class="add" onclick="addToCart('${p.id}')">🛒 Add to Cart</button>
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
      <div class="price">₹${price}<span class="mrp">₹${mrp}</span></div>
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
    b.classList.toggle('active',Number(b.dataset.weight)===w);
  });
  const prEl = card.querySelector(`#price-${id}`);
  if(prEl) prEl.innerHTML=priceBlock(p,w);
}

function addToCart(id){
  const p=configuredProducts.find(x=>x.id===id);
  const card=document.querySelector(`[data-product="${id}"]`);
  if(!p||!card)return;
  const active=card.querySelector('.weightBtn.active');
  const w=Number(active?.dataset.weight||200);
  const key=`${id}-${w}`;
  const x=cart.find(i=>i.key===key);
  if(x){ x.qty++; } else { cart.push({ key, id, weight:w, qty:1 }); }
  deliveryCharge=null;
  lastDeliveryPincode='';
  saveCart();
  openDrawer();
}

function saveCart(){
  localStorage.setItem('srivariCart',JSON.stringify(cart));
  renderCart();
  const count=document.getElementById('cartCount');
  if(count) count.textContent=cart.reduce((s,i)=>s+i.qty,0);
}

function cartWeightGrams(){ return cart.reduce((sum,i)=>sum+(Number(i.weight)||0)*i.qty,0); }
function cartSubtotal(){
  return cart.reduce((sum,i)=>{
    const p=configuredProducts.find(x=>x.id===i.id);
    return !p?sum:sum+priceFor(p,i.weight)*i.qty;
  },0);
}

function renderCart(){
  const box=document.getElementById('cartItems');
  if(!box)return;
  if(!cart.length){
    box.innerHTML='<div class="empty">Your cart is empty.<br>Add some cookies ❤️</div>';
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
        <div><b>${p.name}</b><small>${i.weight}g • ₹${price} × ${i.qty}</small></div>
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
  if(x.qty<=0){ cart=cart.filter(i=>i.key!==key); }
  deliveryCharge=null;
  lastDeliveryPincode='';
  saveCart();
}

function updateSummary(subtotal){
  const subtotalEl=document.getElementById('cartSubtotal');
  const deliveryEl=document.getElementById('cartDelivery');
  const totalEl=document.getElementById('cartTotal');
  const note=document.getElementById('deliveryNote');
  if(subtotalEl) subtotalEl.textContent='₹'+subtotal;
  if(deliveryEl) deliveryEl.textContent=deliveryCharge==null?'—':'₹'+Math.round(deliveryCharge);
  if(totalEl) totalEl.textContent='₹'+Math.round(deliveryCharge==null?subtotal:subtotal+deliveryCharge);
  if(note) note.textContent=deliveryCharge==null?'Enter your pincode to calculate delivery charge.':'Delivery charge: ₹'+Math.round(deliveryCharge);
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

document.getElementById('openCart')?.addEventListener('click',openDrawer);
document.getElementById('closeCart')?.addEventListener('click',closeDrawer);
document.getElementById('shade')?.addEventListener('click',closeDrawer);

async function calculateDelivery(){
  const pincodeEl=document.getElementById('pincode');
  if(!pincodeEl)return false;
  const pincode=pincodeEl.value.trim();
  if(!/^\d{6}$/.test(pincode)){
    deliveryCharge=null; lastDeliveryPincode=''; updateSummary(cartSubtotal()); return false;
  }
  const weight=cartWeightGrams();
  if(weight<=0){ alert('Please add cookies to cart.'); return false; }
  const note=document.getElementById('deliveryNote');
  if(note) note.textContent='Calculating delivery charge…';
  try{
    const url=`${DELHIVERY_API}/?pincode=${encodeURIComponent(pincode)}&weight=${Math.ceil(weight)}`;
    const response=await fetch(url,{cache:'no-store'});
    const data=await response.json().catch(()=>({}));
    if(!response.ok||!data.success) throw new Error(data.error||'Delivery charge unavailable');
    deliveryCharge=Number(data.shippingCharge);
    lastDeliveryPincode=pincode;
    updateSummary(cartSubtotal());
    return true;
  }catch(error){
    deliveryCharge=null; lastDeliveryPincode=''; updateSummary(cartSubtotal());
    if(note) note.textContent='Delivery charge could not be calculated for this pincode.';
    alert('Delivery charge could not be calculated. Please check pincode.');
    return false;
  }
}

document.getElementById('pincode')?.addEventListener('blur',calculateDelivery);

/* AUTO FILL CUSTOMER DETAILS */
function autoFillCustomerDetails(){
  try{
    const s=JSON.parse(localStorage.getItem('srivari_customer_profile')||'{}');
    if(s.name&&document.getElementById('cname'))document.getElementById('cname').value=s.name;
    if(s.phone&&document.getElementById('phone'))document.getElementById('phone').value=s.phone;
    if(s.email&&document.getElementById('email'))document.getElementById('email').value=s.email;
    if(s.address&&document.getElementById('address'))document.getElementById('address').value=s.address;
    if(s.pincode&&document.getElementById('pincode')){
      document.getElementById('pincode').value=s.pincode;
      if(cart.length>0) calculateDelivery();
    }
  }catch(e){}
}

/* MY ORDERS MODAL */
window.openOrdersModal=function(){
  const m=document.getElementById('ordersModal');
  if(m)m.style.display='flex';
  const s=JSON.parse(localStorage.getItem('srivari_customer_profile')||'{}');
  const input=document.getElementById('lookupPhone');
  if(input&&s.phone){ input.value=s.phone; fetchCustomerOrders(); }
};
window.closeOrdersModal=function(){
  const m=document.getElementById('ordersModal');
  if(m)m.style.display='none';
};
window.fetchCustomerOrders=async function(){
  const input=document.getElementById('lookupPhone');
  const c=document.getElementById('ordersListContainer');
  let phone=input?input.value.replace(/\D/g,''):'';
  if(phone.length>10) phone=phone.slice(-10);
  if(!phone||phone.length<10){ alert('Enter valid 10-digit mobile number'); return; }
  c.innerHTML='<div style="text-align:center;padding:15px;color:#666;">Searching orders...</div>';
  try{
    const res=await fetch(`${ORDERS_API}/customer-orders?phone=${phone}`,{cache:'no-store'});
    const data=await res.json();
    if(!data.success||!data.orders||!data.orders.length){
      c.innerHTML='<div style="text-align:center;padding:20px;color:#777;">No previous orders found.</div>';
      return;
    }
    c.innerHTML=data.orders.map(o=>`
      <div style="background:#fff;border:1px solid #ebdcd0;border-radius:10px;padding:12px;margin-bottom:10px;">
        <div style="display:flex;justify-content:space-between;">
          <b style="color:#5a2e10;">Order #${o.id}</b>
          <span style="color:#137333;font-weight:bold;font-size:12px;">${o.payment_status}</span>
        </div>
        <div style="font-size:13px;color:#444;margin:6px 0;">
          <div>Amount: ₹${o.total}</div>
          ${o.awb?`<div>AWB: <code>${o.awb}</code></div>`:''}
        </div>
        ${o.awb?`<a href="https://www.delhivery.com/track/package/${o.awb}" target="_blank" style="background:#075e45;color:#fff;padding:5px 10px;text-decoration:none;border-radius:6px;font-size:12px;display:inline-block;">🚚 Track Live</a>`:''}
      </div>
    `).join('');
  }catch(e){
    c.innerHTML='<div style="text-align:center;padding:15px;color:#c5221f;">Failed to load orders.</div>';
  }
};

/* CHECKOUT WITH AUTO-VERIFY & DELHIVERY BOOKING */
document.getElementById('checkout')?.addEventListener('submit',async e=>{
  e.preventDefault();
  if(checkoutBusy)return;
  if(!cart.length){ alert('Please add cookies to cart.'); return; }

  const name=document.getElementById('cname').value.trim();
  const phone=document.getElementById('phone').value.trim();
  const email=document.getElementById('email').value.trim();
  const address=document.getElementById('address').value.trim();
  const pincode=document.getElementById('pincode').value.trim();
