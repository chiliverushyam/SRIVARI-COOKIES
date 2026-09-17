SRIVARI COOKIES — CLEAN RELEASE CANDIDATE

IMPORTANT
- This package uses the supplied SRIVARI COOKIES logo.
- Product images have the baked-in NEW/BESTSELLER/W labels cropped out and have been sharpened/upscaled.
- Mobile product cards are one per row for clearer product photos.
- The website stores a new order as payment_status = awaiting_payment.

PAYMENT STATUS
The current configuration uses a generic Razorpay Payment Link. A static website cannot reliably know whether a customer completed that payment unless a Razorpay API/webhook flow is connected. Therefore this build does NOT falsely mark an order as paid. Connect a Razorpay webhook/server-side verification flow before treating orders as paid automatically.

Do not send customers the old live URL until this release is actually deployed and payment verification is connected.
