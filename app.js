const products=[
{id:'almond',name:'Almond Cashew Cookies',price200:250,price400:500,mrp200:250,mrp400:500,image:'assets/almond-cashew.jpg',badge:'BEST SELLER'},
{id:'butter',name:'Butter Cookies',price200:250,price400:500,mrp200:250,mrp400:500,image:'assets/butter.jpg',badge:'FRESHLY BAKED'},
{id:'chip',name:'Classic Choco Chip Cookies',price200:250,price400:500,mrp200:250,mrp400:500,image:'assets/classic-chip.jpg',badge:'POPULAR'},
{id:'coconut',name:'Coconut Cookies',price200:250,price400:500,mrp200:250,mrp400:500,image:'assets/coconut.jpg',badge:'FRESH TODAY'},
{id:'double',name:'Double Chocolate Cookies',price200:250,price400:500,mrp200:250,mrp400:500,image:'assets/double-chocolate.jpg',badge:'RICH & FUDGY'},
{id:'dry',name:'Dry Fruit Cookies',price200:250,price400:500,mrp200:250,mrp400:500,image:'assets/dry-fruit.jpg',badge:'PREMIUM'},
{id:'oats',name:'Oats Raisin Cookies',price200:250,price400:500,mrp200:250,mrp400:500,image:'assets/oats-raisin.jpg',badge:'HEALTHY CHOICE'},
{id:'red',name:'Red Velvet Cookies',price200:250,price400:500,mrp200:250,mrp400:500,image:'assets/red-velvet.jpg',badge:'NEW'}];

let cart=JSON.parse(localStorage.getItem('srivariCart')||'[]');
const grid=document.getElementById('productGrid');
const configuredProducts=products.map(p=>({...p}));

function priceFor(p,w){return w===200?p.price200:p.price400}
function mrpFor(p,w){return w===200?p.mrp200:p.mrp400}
function discount(p,w){const price=priceFor(p,w),mrp=mrpFor(p,w);return price&&mrp?Math.round((1-price/mrp)*100):null}

function renderProducts(){
 grid.innerHTML=configuredProducts.map(p=>`
 <article class="card" data-product="${p.id}">
   <div class="photo"><img src="${p.image}" alt="${p.name}" loading="lazy"><span class="badge">${p.badge}</span></div>
   <div class="info">
    <h3>${p.name}</h3>
    <div class="weightChoices" role="group" aria-label="Choose pack size">
      <button type="button" class="weightBtn active" data-weight="200" onclick="selectWeight('${p.id}',200)">200g</button>
      <button type="button" class="weightBtn" data-weight="400" onclick="selectWeight('${p.id}',400)">400g</button>
    </div>
    <div class="priceArea" id="price-${p.id}">${priceBlock(p,200)}</div>
    <button class="add" onclick="addToCart('${p.id}')">🛒 Add to Cart</button>
   </div>
 </article>`).join('');
}

function priceBlock(p,w){
 const price=priceFor(p,w),mrp=mrpFor(p,w),off=discount(p,w);
 if(!price) return `<div class="pricePending">Price coming soon</div><div class="priceHint">Select 200g / 400g • Price will update when configured</div>`;
 return `<div class="priceRow"><div class="price">₹${price}<span class="mrp">₹${mrp}</span></div>${off?`<span class="off">${off}% OFF</span>`:''}</div>`;
}
function selectWeight(id,w){
 const p=configuredProducts.find(x=>x.id===id); if(!p)return;
 const card=document.querySelector(`[data-product="${id}"]`);
 card.querySelectorAll('.weightBtn').forEach(b=>b.classList.toggle('active',Number(b.dataset.weight)===w));
 card.querySelector(`#price-${id}`).innerHTML=priceBlock(p,w);
}
function addToCart(id){
 const p=configuredProducts.find(x=>x.id===id);
 const card=document.querySelector(`[data-product="${id}"]`);
 const w=Number(card.querySelector('.weightBtn.active').dataset.weight);
 if(!priceFor(p,w)){alert('This pack price is being updated. Please contact SRIVARI COOKIES on WhatsApp.');return}
 const key=`${id}-${w}`,x=cart.find(i=>i.key===key);
 if(x)x.qty++; else cart.push({key,id,weight:w,qty:1});
 saveCart();openDrawer();
}
function saveCart(){localStorage.setItem('srivariCart',JSON.stringify(cart));renderCart();document.getElementById('cartCount').textContent=cart.reduce((s,i)=>s+i.qty,0)}
function renderCart(){
 const box=document.getElementById('cartItems');
 if(!cart.length){box.innerHTML='<div class="empty">Your cart is empty.<br>Add some cookies ❤️</div>';updateSummary(0);return}
 let subtotal=0;
 box.innerHTML=cart.map(i=>{
  const p=configuredProducts.find(x=>x.id===i.id),price=priceFor(p,i.weight);
  subtotal+=(price||0)*i.qty;
  return `<div class="cartLine"><img src="${p.image}" alt=""><div><b>${p.name}</b><small>${i.weight} • ₹${price} × ${i.qty}</small></div><div class="qty"><button onclick="changeQty('${i.key}',-1)">−</button><span>${i.qty}</span><button onclick="changeQty('${i.key}',1)">+</button></div></div>`
 }).join('');
 updateSummary(subtotal);
}
function changeQty(key,d){const x=cart.find(i=>i.key===key);if(!x)return;x.qty+=d;if(x.qty<=0)cart=cart.filter(i=>i.key!==key);saveCart()}
function updateSummary(subtotal){
 const charge=window.SRIVARI_CONFIG.DELIVERY_CHARGE;
 document.getElementById('cartSubtotal').textContent='₹'+subtotal;
 document.getElementById('cartDelivery').textContent=charge==null?'—':'₹'+charge;
 document.getElementById('cartTotal').textContent=charge==null?'₹'+subtotal:'₹'+(subtotal+charge);
 document.getElementById('deliveryNote').textContent=charge==null?'Delivery charge will be shown here once configured.':'Delivery charge: ₹'+charge;
}
function openDrawer(){document.getElementById('drawer').classList.add('open');document.getElementById('shade').classList.add('open');document.body.classList.add('noScroll')}
function closeDrawer(){document.getElementById('drawer').classList.remove('open');document.getElementById('shade').classList.remove('open');document.body.classList.remove('noScroll')}
document.getElementById('openCart').onclick=openDrawer;
document.getElementById('closeCart').onclick=closeDrawer;
document.getElementById('shade').onclick=closeDrawer;

document.getElementById('checkout').addEventListener('submit',async e=>{
 e.preventDefault();
 if(!cart.length)return alert('Please add cookies to cart.');
 const name=document.getElementById('cname').value.trim(),phone=document.getElementById('phone').value.trim(),email=document.getElementById('email').value.trim(),address=document.getElementById('address').value.trim(),pincode=document.getElementById('pincode').value.trim();
 const charge=window.SRIVARI_CONFIG.DELIVERY_CHARGE;
 if(charge==null){alert('Delivery charge is not configured yet. Please set the exact delivery charge before accepting customer payments.');return}
 let subtotal=0;
 for(const i of cart){const p=configuredProducts.find(x=>x.id===i.id);subtotal+=priceFor(p,i.weight)*i.qty}
 const total=subtotal+charge;
 let saved=false;
 try{
  if(window.supabaseClient){
   const r=await window.supabaseClient.from('orders').insert({customer_name:name,customer_phone:phone,customer_address:address,customer_pincode:pincode,total_amount:total,payment_status:'awaiting_payment',order_status:'new',notes:email}).select().single();
   if(!r.error){
    for(const i of cart){const p=configuredProducts.find(x=>x.id===i.id);await window.supabaseClient.from('order_items').insert({order_id:r.data.id,product_id:p.id,product_name:p.name,weight:i.weight+'g',quantity:i.qty,unit_price:priceFor(p,i.weight),line_total:priceFor(p,i.weight)*i.qty})}
    saved=true
   }
  }
 }catch(err){}
 const lines=cart.map(i=>{const p=configuredProducts.find(x=>x.id===i.id);return `${p.name} (${i.weight}g) x${i.qty} = ₹${priceFor(p,i.weight)*i.qty}`}).join('\n');
 const msg=`SRIVARI COOKIES ORDER\n\nName: ${name}\nMobile: ${phone}\nEmail: ${email||'Not provided'}\nAddress: ${address}\nPincode: ${pincode}\n\n${lines}\n\nSubtotal: ₹${subtotal}\nDelivery: ₹${charge}\nTotal: ₹${total}\nOrder saved: ${saved?'Yes':'WhatsApp only'}`;
 window.open('https://wa.me/'+window.SRIVARI_CONFIG.WHATSAPP_NUMBER+'?text='+encodeURIComponent(msg),'_blank');
 alert('Order details sent to WhatsApp. Please collect payment by UPI directly. Card payments are not enabled on this checkout to avoid card-processing fees.');
});
renderProducts();saveCart();