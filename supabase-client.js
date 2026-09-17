if (!window.supabase) throw new Error("Supabase library did not load.");
if (!window.SRIVARI_CONFIG) throw new Error("SRIVARI config did not load.");
window.sb = window.supabase.createClient(
  window.SRIVARI_CONFIG.SUPABASE_URL,
  window.SRIVARI_CONFIG.SUPABASE_ANON_KEY
);
