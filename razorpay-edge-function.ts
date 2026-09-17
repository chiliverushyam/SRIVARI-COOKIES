// Supabase Edge Function: create Razorpay order securely.
// Deploy as: supabase functions deploy create-razorpay-order
//
// Required Supabase secrets:
// RAZORPAY_KEY_ID
// RAZORPAY_KEY_SECRET
//
// The browser must never receive RAZORPAY_KEY_SECRET.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const { amount, receipt } = await req.json();
  if (!Number.isFinite(Number(amount)) || Number(amount) <= 0) {
    return Response.json({ error: "Invalid amount" }, { status: 400 });
  }

  const keyId = Deno.env.get("RAZORPAY_KEY_ID");
  const keySecret = Deno.env.get("RAZORPAY_KEY_SECRET");
  if (!keyId || !keySecret) {
    return Response.json({ error: "Razorpay secrets are not configured" }, { status: 500 });
  }

  const auth = btoa(`${keyId}:${keySecret}`);
  const r = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      "Authorization": `Basic ${auth}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      amount: Math.round(Number(amount) * 100),
      currency: "INR",
      receipt: String(receipt || `srivari_${Date.now()}`),
      payment_capture: 1
    })
  });

  const body = await r.text();
  return new Response(body, {
    status: r.status,
    headers: { "Content-Type": "application/json" }
  });
});
