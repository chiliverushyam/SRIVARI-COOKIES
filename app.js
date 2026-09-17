const cart = {};
const $ = id => document.getElementById(id);
const money = n => "₹" + Number(n || 0).toFixed(0);

const localImages = {
  "dry-fruit":"assets/dry-fruit.jpg",
  "butter":"assets/butter.jpg",
  "classic-chip":"assets/classic-chip.jpg",
  "double-chocolate":"assets/double-chocolate.jpg",
  "red-velvet":"assets/red-velvet.jpg",
  "almond-cashew":"assets/almond-cashew.jpg",
  "coconut":"assets/coconut.jpg",
  "oats-raisin":"assets/oats-raisin.jpg"
};

const fallbackProducts = [
  {id:"dry-250",name:"Dry Fruit Cookies - All Flavours",category:"Dry Fruit Cookies",price:299,original_price:399,weight:"250g",image:localImages["dry-fruit"],badge:"FRESHLY BAKED"},
  {id:"dry-500",name:"Dry Fruit Cookies - All Flavours",category:"Dry Fruit Cookies",price:499,original_price:699,weight:"500g",image:localImages["dry-fruit"],badge:"BEST SELLER"},
  {id:"bakery-250",name:"Bakery Cookies - All Flavours",category:"Bakery Cookies",price:199,original_price:249,weight:"250g",image:localImages["butter"],badge:"FRESH TODAY"},
  {id:"bakery-500",name:"Bakery Cookies - All Flavours",category:"Bakery Cookies",price:399,original_price:499,weight:"500g",image:localImages["classic-chip"],badge:"POPULAR"}
];

function escapeHtml(s=""){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function discount(p){return p.original_price>p.price?Math.round((1-p.price/p.original_price)*100):0;}
function imageFor(p){
  if(p.image_url)return p.image_url;
  if(p.image)return p.image;
  const s=((p.name||"")+" "+(p.category||"")).toLowerCase();
  if(s.includes("red velvet"))return localImages["red-velvet"];
  if(s.includes("double chocolate"))return localImages["double-chocolate"];
  if(s.includes("chocolate chip")||s.includes("chip"))return localImages["classic-chip"];
  if(s.includes("dry fruit")||s.includes("dry fruits"))return localImages["dry-fruit"];
  if(s.includes("almond")||s.includes("cashew"))return localImages["almond-cashew"];
  if(s.includes("coconut"))return localImages["coconut"];
  if(s.includes("oat")||s.includes("raisin"))return localImages["oats-raisin"];
  return localImages["butter"];
}

function addToCart(p){
  if(!cart[p.id])cart[p.id]={id:p.id,name:p.name,price:Number(p.price||0),qty:0,weight:p.weight,category:p.category};
  cart[p.id].qty++;renderCart();openCart();
}
function changeQty(id,d){if(!cart[id])return;cart[id].qty+=d;if(cart[id].qty<=0)delete cart[id];renderCart();}
function cartItems(){return Object.values(cart);}
function total(){return cartItems().reduce((a,x)=>a+x.price*x.qty,0);}
function openCart(){$("cartOverlay").classList.add("open");renderCart();}
function closeCart(e){if(!e||e.target===$("cartOverlay"))$("cartOverlay").classList.remove("open");}

function renderCart(){
  const items=cartItems();
  $("cartCount").textContent=items.reduce((a,x)=>a+x.qty,0);
  $("cartItems").innerHTML=items.length?items.map(x=>`<div class="cartLine"><div><b>${escapeHtml(x.name)}</b><small>${escapeHtml(x.weight||"")}</small><div class="miniBtns"><button onclick="changeQty('${escapeHtml(x.id)}',-1)">−</button><span>${x.qty}</span><button onclick="changeQty('${escapeHtml(x.id)}',1)">+</button></div></div><b>${money(x.price*x.qty)}</b></div>`).join(""):"<div class='emptyCart'>Your cart is empty.<br><small>Add your favourite cookies first 🍪</small></div>";
  $("cartTotal").textContent=money(total());
  $("checkoutAmount").textContent=money(total());
}

function renderProducts(items){
  $("products").innerHTML=items.map(p=>{
    const d=discount(p),img=escapeHtml(imageFor(p));
    return `<article class="card"><div class="cookiePhoto"><img src="${img}" alt="${escapeHtml(p.name||"Fresh cookies")}" loading="lazy"><span class="freshBadge">${escapeHtml(p.badge||"FRESHLY BAKED")}</span></div><div class="cardBody"><h3>${escapeHtml(p.name||"Cookie")}</h3><p class="category">${escapeHtml(p.weight||"")}${p.weight&&p.category?" · ":""}${escapeHtml(p.category||"Freshly baked")}</p><div class="priceRow"><p class="price"><b>${money(p.price)}</b>${p.original_price?`<del>${money(p.original_price)}</del>`:""}</p>${d?`<span class="discount">${d}% OFF</span>`:""}</div><button class="add" onclick="addToCart(${JSON.stringify(p).replace(/</g,"\\u003c")})">🛒 Add to Cart</button></div></article>`;
  }).join("");
}

async function loadProducts(){
  try{
    const {data,error}=await sb.from("products").select("*").eq("active",true).order("created_at",{ascending:true});
    if(error)throw error;
    const products=(data||[]).filter(p=>p.price!=null);
    if(!products.length)throw new Error("No active products");
    renderProducts(products);$("status").textContent=`${products.length} live products`;
  }catch(err){console.warn(err);renderProducts(fallbackProducts);$("status").textContent="Local product catalog";}
}

function validateCheckout(){
  if(!cartItems().length){alert("Please add at least one cookie to your cart.");return false;}
  const n=$("customerName").value.trim(),ph=$("customerPhone").value.replace(/\D/g,""),a=$("customerAddress").value.trim(),pin=$("customerPincode").value.trim();
  if(!n||!ph||!a||!pin){alert("Please fill your name, mobile number, address and pincode.");return false;}
  if(!/^\d{10}$/.test(ph)){alert("Please enter a valid 10-digit mobile number.");return false;}
  if(!/^\d{6}$/.test(pin)){alert("Please enter a valid 6-digit pincode.");return false;}
  return true;
}

async function createOrder(){
  const payload={customer_name:$("customerName").value.trim(),customer_phone:$("customerPhone").value.replace(/\D/g,""),customer_address:$("customerAddress").value.trim(),customer_pincode:$("customerPincode").value.trim(),total_amount:total(),payment_status:"pending",order_status:"new",items:cartItems().map(x=>({product_id:x.id,name:x.name,weight:x.weight,qty:x.qty,unit_price:x.price,line_total:x.price*x.qty}))};
  const {data,error}=await sb.from("orders").insert({customer_name:payload.customer_name,customer_phone:payload.customer_phone,customer_address:payload.customer_address,customer_pincode:payload.customer_pincode,total_amount:payload.total_amount,payment_status:payload.payment_status,order_status:payload.order_status}).select("id").single();
  if(error)throw error;
  const rows=payload.items.map(x=>({order_id:data.id,product_id:String(x.product_id),product_name:x.name,weight:x.weight||null,quantity:x.qty,unit_price:x.unit_price,line_total:x.line_total}));
  const {error:itemError}=await sb.from("order_items").insert(rows);if(itemError)throw itemError;
  return {orderId:data.id,payload};
}

async function checkoutAndPay(){
  if(!validateCheckout())return;
  $("checkoutStatus").textContent="Saving your order…";
  try{
    const {orderId,payload}=await createOrder();
    localStorage.setItem("srivari_pending_order",JSON.stringify({orderId,...payload,createdAt:new Date().toISOString()}));
    const url=window.SRIVARI_CONFIG.RAZORPAY_PAYMENT_LINK;
    if(!url){$("checkoutStatus").textContent=`Order ${orderId} saved. Payment link is not configured.`;return;}
    $("checkoutStatus").textContent=`Order ${orderId} saved. Opening Razorpay payment…`;
    setTimeout(()=>window.open(url,"_blank","noopener"),250);
  }catch(err){console.error(err);$("checkoutStatus").textContent="Could not save the order.";alert("Order could not be saved. Please check the Supabase orders tables/RLS setup.");}
}

function sendOrderWhatsApp(){
  if(!validateCheckout())return;
  const number=(window.SRIVARI_CONFIG.WHATSAPP_NUMBER||"").replace(/\D/g,"");
  const lines=cartItems().map(x=>`• ${x.name} ${x.weight||""} × ${x.qty} = ${money(x.price*x.qty)}`).join("\n");
  const text=`SRIVARI COOKIES Order\n\nName: ${$("customerName").value.trim()}\nMobile: ${$("customerPhone").value.trim()}\nAddress: ${$("customerAddress").value.trim()}\nPincode: ${$("customerPincode").value.trim()}\n\n${lines}\n\nTotal: ${money(total())}`;
  window.open(`https://wa.me/${number}?text=${encodeURIComponent(text)}`,"_blank","noopener");
}

$("year").textContent=new Date().getFullYear();
$("contactEmail").textContent=window.SRIVARI_CONFIG.CONTACT_EMAIL;
$("emailLink").href=`mailto:${window.SRIVARI_CONFIG.CONTACT_EMAIL}`;
$("waLink").href=`https://wa.me/${window.SRIVARI_CONFIG.WHATSAPP_NUMBER}`;
renderProducts(fallbackProducts);renderCart();loadProducts();
