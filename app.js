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

const grid=document.getElementById('productGrid');
const configuredProducts=products.map(p=>({...p}));

const DELHIVERY_API='https://srivari-delhivery-api.chiluverushyam8790.workers.dev';

const RAZORPAY_FUNCTION=
(window.SRIVARI_CONFIG&&window.SRIVARI_CONFIG.RAZORPAY_FUNCTION_URL) ||
`${window.SRIVARI_CONFIG.SUPABASE_URL}/functions/v1/create-razorpay-order`;

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
  grid.innerHTML=configuredProducts.map(p=>`
    <article class="card" data-product="${p.id}">
      <div class="photo">
        <img src="${p.image}" alt="${p.name}" loading="lazy">
        <span class="badge">${p.badge}</span>
      </div>
      <div class="info">
        <h3>${p.name}</h3>
        <div class="weightChoices" role="group">
          <button type="button" class="weightBtn active"
            data-weight="200"
            onclick="selectWeight('${p.id}',200)">200g</button>

          <button type="button" class="weightBtn"
            data-weight="400"
            onclick="selectWeight('${p.id}',400)">400g</button>
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

  const w=Number(
    card.querySelector('.weightBtn.active').dataset.weight
  );

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
    (sum,i)=>
      sum+(Number(i.weight)||0)*i.qty,
    0
  );
}

function cartSubtotal(){
  return cart.reduce((sum,i)=>{
    const p=configuredProducts.find(
      x=>x.id===i.id
    );

    return sum+
      priceFor(p,i.weight)*i.qty;
  },0);
}

function renderCart(){
  const box=document.getElementById('cartItems');

  if(!cart.length){
    box.innerHTML=
      '<div class="empty">Your cart is empty.<br>Add some cookies ❤️</div>';

    updateSummary(0);
    return;
  }

  let subtotal=0;

  box.innerHTML=cart.map(i=>{
    const p=configuredProducts.find(
      x=>x.id===i.id
    );

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
  document.getElementById('cartSubtotal').textContent=
    '₹'+subtotal;

  document.getElementById('cartDelivery').textContent=
    deliveryCharge==null
      ?'—'
      :'₹'+Math.round(deliveryCharge);

  document.getElementById('cartTotal').textContent=
    '₹'+Math.round(
      deliveryCharge==null
        ?subtotal
        :subtotal+deliveryCharge
    );

  document.getElementById('deliveryNote').textContent=
    deliveryCharge==null
      ?'Enter your pincode to calculate delivery charge.'
      :'Delivery charge: ₹'+Math.round(deliveryCharge);
}

function openDrawer(){
  document.getElementById('drawer').classList.add('open');
  document.getElementById('shade').classList.add('open');
  document.body.classList.add('noScroll');
}

function closeDrawer(){
  document.getElementById('drawer').classList.remove('open');
  document.getElementById('shade').classList.remove('open');
  document.body.classList.remove('noScroll');
}

document.getElementById('openCart').onclick=openDrawer;
document.getElementById('closeCart').onclick=closeDrawer;
document.getElementById('shade').onclick=closeDrawer;

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

  note.textContent='Calculating delivery charge…';

  try{
    const url=
      `${DELHIVERY_API}/?pincode=${encodeURIComponent(pincode)}&weight=${Math.ceil(weight)}`;

    const response=
      await fetch(url,{cache:'no-store'});

    const data=await response.json();

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

    note.textContent=
      'Delivery charge could not be calculated for this pincode.';

    alert(
      'Delivery charge could not be calculated. Please check the pincode and try again.'
    );

    return false;
  }
}

const pincodeEl=
  document.getElementById('pincode');

pincodeEl.addEventListener(
  'blur',
  calculateDelivery
);

pincodeEl.addEventListener(
  'input',
  ()=>{
    deliveryCharge=null;
    lastDeliveryPincode='';
    updateSummary(cartSubtotal());
  }
);

async function callRazorpayFunction(payload){

  const response=await fetch(
    RAZORPAY_FUNCTION,
    {
      method:'POST',
      headers:{
        'Content-Type':'application/json',
        'apikey':
          window.SRIVARI_CONFIG.SUPABASE_ANON_KEY,
        'Authorization':
          `Bearer ${window.SRIVARI_CONFIG.SUPABASE_ANON_KEY}`
      },
      body:JSON.stringify(payload)
    }
  );

  const data=
    await response.json().catch(()=>({}));

  if(!response.ok||data.error){
    throw new Error(
      data.error||'Payment service unavailable'
    );
  }

  return data;
}

function buildWhatsAppMessage(order){

  const lines=order.items.map(i=>{

    const p=configuredProducts.find(
      x=>x.id===i.id
    );

    return `${p.name} (${i.weight}g) x${i.qty} = ₹${priceFor(p,i.weight)*i.qty}`;

  }).join('\n');

  return `SRIVARI COOKIES ORDER

Order Number: ${order.orderNumber}
Payment: PAID

Name: ${order.name}
Mobile: ${order.phone}
Email: ${order.email||'Not provided'}

Address: ${order.address}
Pincode: ${order.pincode}

${lines}

Subtotal: ₹${order.subtotal}
Delivery: ₹${Math.round(order.deliveryCharge)}
Total: ₹${Math.round(order.total)}

Razorpay Payment ID: ${order.paymentId}`;
}

function openRazorpayCheckout(order,paymentOrder){

  return new Promise((resolve,reject)=>{

    if(typeof Razorpay==='undefined'){
      reject(
        new Error(
          'Razorpay Checkout could not load. Please refresh the page.'
        )
      );
      return;
    }

    const options={
      key:paymentOrder.keyId,
      amount:paymentOrder.amount,
      currency:'INR',
      name:'SRIVARI COOKIES',
      description:'Cookie Order',
      order_id:paymentOrder.orderId,

      prefill:{
        name:order.name,
        contact:order.phone,
        email:order.email||undefined
      },

      notes:{
        srivari_order_number:order.orderNumber
      },

      theme:{
        color:'#7b3f18'
      },

      handler:response=>{
        resolve(response);
      },

      modal:{
        ondismiss:()=>{
          reject(
            new Error(
              'Payment window closed before payment was completed.'
            )
          );
        }
      }
    };

    const rzp=new Razorpay(options);

    rzp.on(
      'payment.failed',
      response=>{
        reject(
          new Error(
            response?.error?.description||
            'Payment failed. Please try again.'
          )
        );
      }
    );

    rzp.open();
  });
}

document
.getElementById('checkout')
.addEventListener(
  'submit',
  async e=>{

    e.preventDefault();

    if(checkoutBusy)return;

    if(!cart.length){
      alert('Please add cookies to cart.');
      return;
    }

    const name=
      document.getElementById('cname').value.trim();

    const phone=
      document.getElementById('phone').value.trim();

    const email=
      document.getElementById('email').value.trim();

    const address=
      document.getElementById('address').value.trim();

    const pincode=
      document.getElementById('pincode').value.trim();

    if(
      !name||
      !phone||
      !address||
      !/^\d{6}$/.test(pincode)
    ){
      alert(
        'Please fill all required details and enter a valid 6-digit pincode.'
      );
      return;
    }

    const ready=await calculateDelivery();

    if(!ready)return;

    const subtotal=cartSubtotal();

    const total=
      Math.round(
        (subtotal+deliveryCharge)*100
      )/100;

    const orderNumber=
      'SRV-'+Date.now();

    checkoutBusy=true;

    const button=
      document.querySelector('.checkoutBtn');

    const oldText=
      button.textContent;

    button.disabled=true;
    button.textContent=
      'Creating secure payment…';

    try{

      if(!window.supabaseClient){
        throw new Error(
          'Supabase is not loaded. Please refresh the page.'
        );
      }

      /*
       * IMPORTANT:
       * This matches the actual orders table:
       * order_number
       * customer_name
       * mobile
       * address
       * pincode
       * delivery_charge
       * total
       * payment_status
       * order_status
       */

      const {data:dbOrder,error:orderError}=
        await window.supabaseClient
        .from('orders')
        .insert({

          order_number:orderNumber,

          customer_name:name,

          mobile:phone,

          address:
            `${address}\nPincode: ${pincode}`,

          pincode:
            pincode,

          subtotal:
               subtotal,

          delivery_charge:
            deliveryCharge,

          total:
            total,

          payment_status:
            'pending',

          order_status:
            'new'

        })
        .select()
        .single();

      if(orderError||!dbOrder){

        throw new Error(
          orderError?.message||
          'Could not create order.'
        );
      }

      /*
       * Save order items
       */

      for(const i of cart){

        const p=
          configuredProducts.find(
            x=>x.id===i.id
          );

        const {error:itemError}=
          await window.supabaseClient
          .from('order_items')
          .insert({

            order_id:
              dbOrder.id,

            product_id:
              p.id,

            product_name:
              p.name,

            quantity:
              i.qty,


          });

        if(itemError){

          throw new Error(
            itemError.message||
            'Could not save order items.'
          );
        }
      }

      button.textContent=
        'Opening Razorpay…';

      /*
       * Create Razorpay order
       */

      const paymentOrder=
        await callRazorpayFunction({

          action:'create',

          order_id:
            dbOrder.id

        });

      if(
        Number(paymentOrder.amount)!==
        Math.round(total*100)
      ){

        throw new Error(
          'Payment amount mismatch. Order was not sent for payment.'
        );
      }

      /*
       * Open Razorpay
       */

      const paymentResponse=
        await openRazorpayCheckout(

          {
            orderId:dbOrder.id,
            orderNumber,
            name,
            phone,
            email,
            address,
            pincode,
            items:cart,
            subtotal,
            deliveryCharge,
            total
          },

          paymentOrder

        );

      button.textContent=
        'Verifying payment…';

      /*
       * Verify payment on server
       */

      const verified=
        await callRazorpayFunction({

          action:'verify',

          order_id:
            dbOrder.id,

          razorpay_order_id:
            paymentResponse.razorpay_order_id,

          razorpay_payment_id:
            paymentResponse.razorpay_payment_id,

          razorpay_signature:
            paymentResponse.razorpay_signature

        });

      if(!verified.paid){

        throw new Error(
          'Payment could not be verified.'
        );
      }

      const paidOrder={

        orderId:
          dbOrder.id,

        orderNumber,

        name,

        phone,

        email,

        address,

        pincode,

        items:cart,

        subtotal,

        deliveryCharge,

        total,

        paymentId:
          verified.paymentId

      };

      localStorage.setItem(
        'srivari_pending_order',
        JSON.stringify(paidOrder)
      );

      /*
       * WhatsApp only AFTER verified payment
       */

      const whatsappNumber=
        window.SRIVARI_CONFIG.WHATSAPP_NUMBER;

      if(whatsappNumber){

        window.open(

          'https://wa.me/'+
          whatsappNumber+
          '?text='+
          encodeURIComponent(
            buildWhatsAppMessage(paidOrder)
          ),

          '_blank',

          'noopener'

        );
      }

      alert(
        `Payment successful!\n\n`+
        `Order Number: ${orderNumber}\n`+
        `Paid: ₹${Math.round(total)}\n\n`+
        `Thank you for ordering from SRIVARI COOKIES.`
      );

      cart=[];

      deliveryCharge=null;
      lastDeliveryPincode='';

      saveCart();

      document
      .getElementById('checkout')
      .reset();

      closeDrawer();

    }catch(error){

      console.error(
        'Checkout error:',
        error
      );

      alert(
        error.message||
        'Payment could not be completed. Please try again.'
      );

    }finally{

      checkoutBusy=false;

      button.disabled=false;

      button.textContent=oldText;
    }
  }
);

renderProducts();
saveCart();
