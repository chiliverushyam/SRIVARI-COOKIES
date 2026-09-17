const cart = {};
const $ = id => document.getElementById(id);
const money = n => "₹" + Number(n || 0).toFixed(0);
let liveProducts = [];

const fallbackProducts = [
  {id:"mix-250", name:"All Mix Cookies", category:"4 Types of Cookies", price:239, original_price:399, weight:"250g"},
  {id:"cc-400", name:"Chocolate Chip Cookies", category:"Pack of 6", price:249, original_price:399, weight:"400g"},
  {id:"cc-700", name:"Chocolate Chip Cookies", category:"Pack of 8", price:399, original_price:799, weight:"700g"},
  {id:"dc-700", name:"Double Chocolate Chip Cookies", category:"Pack of 8", price:399, original_price:799, weight:"700g"},
  {id:"dry-250", name:"Dry Fruits Cookies", category:"Pack of 5", price:349, original_price:649, weight:"250g"},
  {id:"rv-400", name:"Red Velvet Cookies", category:"Pack of 6", price:249, original_price:399, weight:"400g"}
];

function escapeHtml(s=""){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function discount(p){return p.original_price>p.price ? Math.round((1-p.price/p.original_price)*100):0;}

function addToCart(p){
  if(!cart[p.id]) cart[p.id]={id:p.id,name:p.name,price:Number(p.price||0),qty:0,weight:p.weight,category:p.category};
  cart[p.id].qty++; renderCart(); openCart();
}
function changeQty(id,d){if(!cart[id])return;cart[id].qty+=d;if(cart[id].qty<=0)delete cart[id];renderCart();}
function cartItems(){return Object.values(cart);}
function total(){return cartItems().reduce((a,x)=>a+x.price*x.qty,0);}

function renderCart(){
  const items=cartItems();
  $("cartCount").textContent=items.reduce((a,x)=>a+x.qty,0);
  $("cartItems").innerHTML=items.length?items.map(x=>`
    <div class="cartLine"><div><b>${escapeHtml(x.name)}</b><small>${escapeHtml(x.weight||"")}</small>
    <div class="miniBtns"><button onclick="changeQty('${escapeHtml(x.id)}',-1)">−</button>${x.qty}<button onclick="changeQty('${escapeHtml(x.id)}',1)">+</button></div></div>
    <b>${money(x.price*x.qty)}</b></div>`).join(""):"<p>Your cart is empty. Add some cookies first 🍪</p>";
  $("cartTotal").textContent=money(total());
}
function openCart(){$("cartOverlay").classList.add("open");renderCart();}
function closeCart(e){if(!e||e.target===$("cartOverlay"))$("cartOverlay").classList.remove("open");}

function renderProducts(items){
  liveProducts=items;
  $("products").innerHTML=items.map((p,i)=>{
    const d=discount(p);
    const initials = ["🍪","🍪","🍪","🍪","🍪","🍪"][i%6];
    return `<article class="card">
      <div class="cookieVisual"><span>${initials}</span><i>${escapeHtml(p.badge||"")}</i></div>
      <h3>${escapeHtml(p.name||"Cookie")}</h3>
      <p class="category">${escapeHtml(p.weight||"")} ${p.weight&&p.category?" · ":""}${escapeHtml(p.category||"Freshly baked")}</p>
      <p class="price"><b>${money(p.price)}</b>${p.original_price?`<del>${money(p.original_price)}</del>`:""}</p>
      ${d?`<span class="discount">${d}% OFF</span>`:""}
      <button class="add" onclick="addToCart(${JSON.stringify(p).replace(/</g,"\\u003c")})">🛒 Add to Cart</button>
    </article>`;
  }).join("");
}

async function loadProducts(){
  try{
    const {data,error}=await sb.from("products").select("*").eq("active",true).order("created_at",{ascending:true});
    if(error) throw error;
    const products=(data||[]).filter(p=>p.price!=null);
    if(!products.length) throw new Error("No active products in Supabase.");
    renderProducts(products);
    $("status").textContent=`${products.length} live products`;
  }catch(err){
    console.warn("Supabase product load failed:",err);
    renderProducts(fallbackProducts);
    $("status").textContent="Using local products";
  }
}

function validateCheckout(){
  if(!cartItems().length){alert("Please add at least one cookie to your cart.");return false;}
  const n=$("customerName").value.trim(), ph=$("customerPhone").value.replace(/\D/g,""), a=$("customerAddress").value.trim(), pin=$("customerPincode").value.trim();
  if(!n||!ph||!a||!pin){alert("Please fill name, mobile number, address and pincode.");return false;}
  if(!/^\d{10}$/.test(ph)){alert("Please enter a valid 10-digit mobile number.");return false;}
  if(!/^\d{6}$/.test(pin)){alert("Please enter a valid 6-digit pincode.");return false;}
  return true;
}

async function createOrder(){
  const payload={
    customer_name:$("customerName").value.trim(),
    customer_phone:$("customerPhone").value.replace(/\D/g,""),
    customer_address:$("customerAddress").value.trim(),
    customer_pincode:$("customerPincode").value.trim(),
    total_amount:total(),
    payment_status:"pending",
    order_status:"new",
    items:cartItems().map(x=>({product_id:x.id,name:x.name,weight:x.weight,qty:x.qty,unit_price:x.price,line_total:x.price*x.qty}))
  };
  const {data,error}=await sb.from("orders").insert({
    customer_name:payload.customer_name,
    customer_phone:payload.customer_phone,
    customer_address:payload.customer_address,
    customer_pincode:payload.customer_pincode,
    total_amount:payload.total_amount,
    payment_status:payload.payment_status,
    order_status:payload.order_status
  }).select("id").single();
  if(error)throw error;
  const orderId=data.id;
  const rows=payload.items.map(x=>({order_id:orderId,product_id:String(x.product_id),product_name:x.name,weight:x.weight||null,quantity:x.qty,unit_price:x.unit_price,line_total:x.line_total}));
  const {error:itemError}=await sb.from("order_items").insert(rows);
  if(itemError)throw itemError;
  return {orderId,payload};
}

async function checkoutAndPay(){
  if(!validateCheckout())return;
  $("checkoutStatus").textContent="Saving your order…";
  try{
    const {orderId,payload}=await createOrder();
    localStorage.setItem("srivari_pending_order",JSON.stringify({orderId,...payload,createdAt:new Date().toISOString()}));

    // Secure API checkout, when a Razorpay Key ID + Edge Function are configured.
    if(window.SRIVARI_CONFIG.RAZORPAY_KEY_ID){
      alert("Order saved. Razorpay API checkout is ready once the Supabase Edge Function is deployed.");
      window.open(window.SRIVARI_CONFIG.RAZORPAY_PAYMENT_LINK,"_blank","noopener");
    }else{
      window.open(window.SRIVARI_CONFIG.RAZORPAY_PAYMENT_LINK,"_blank","noopener");
      $("checkoutStatus").textContent=`Order ${orderId} saved. Complete payment in Razorpay.`;
    }
  }catch(err){
    console.error(err);
    $("checkoutStatus").textContent="Could not save the order. Please try again.";
    alert("Order could not be saved to Supabase. Check your Supabase orders table/RLS setup.");
  }
}

function sendOrderWhatsApp(){
  if(!validateCheckout())return;
  const number=(window.SRIVARI_CONFIG.WHATSAPP_NUMBER||"").replace(/\D/g,"");
  if(!number){alert("WhatsApp number is not configured.");return;}
  const lines=cartItems().map(x=>`• ${x.name} ${x.weight||""} × ${x.qty} = ${money(x.price*x.qty)}`).join("\n");
  const text=`SRIVARI COOKIES Order\n\nName: ${$("customerName").value.trim()}\nMobile: ${$("customerPhone").value.trim()}\nAddress: ${$("customerAddress").value.trim()}\nPincode: ${$("customerPincode").value.trim()}\n\n${lines}\n\nTotal: ${money(total())}`;
  window.open(`https://wa.me/${number}?text=${encodeURIComponent(text)}`,"_blank","noopener");
}

$("year").textContent=new Date().getFullYear();
renderProducts(fallbackProducts);
renderCart();
loadProducts();
