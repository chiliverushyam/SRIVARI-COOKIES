# SRIVARI COOKIES — Connected Store

## What is connected

1. **Supabase products** — active products and their prices are loaded from the existing Supabase project.
2. **Customer checkout** — name, mobile, address and pincode are collected.
3. **Supabase orders** — the checkout saves the order and line items to `orders` and `order_items`.
4. **Razorpay** — the current Razorpay payment-link fallback is retained.
5. **WhatsApp** — the cart/customer details can be shared for order confirmation.

## One-time Supabase setup

Open Supabase SQL Editor and run `supabase_orders.sql`.

This creates:
- `orders`
- `order_items`

The website's public client is allowed to INSERT orders/items only. Do not add public SELECT or UPDATE access to customer orders.

## Razorpay automatic checkout

The current payment-link fallback works without API credentials, but it does not automatically verify payment against the exact cart amount.

For secure automatic amount + payment verification:
1. Get a Razorpay Key ID and Key Secret.
2. Put the public Key ID in `config.js`.
3. Add the Key ID and Key Secret as Supabase Edge Function secrets.
4. Deploy `razorpay-edge-function.ts`.
5. Update `checkoutAndPay()` to call the Edge Function and launch Razorpay Checkout.
6. Add a payment-verification webhook/Edge Function that marks `orders.payment_status = 'paid'` only after Razorpay verification.

Never put the Razorpay Key Secret in `config.js` or any browser code.

## Deployment

Upload all files/folders to the GitHub repository root:
- index.html
- styles.css
- app.js
- config.js
- supabase-client.js
- supabase_orders.sql
- razorpay-edge-function.ts
- assets/srivari-logo.jpg

## Product visuals
The product cards use cropped cookie photography from the original project, with the old package-label area cropped out so the customer-facing cards do not display the old brand name.
