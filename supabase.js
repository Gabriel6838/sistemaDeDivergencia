'use strict';

/* =========================================================
   STOCKVISION — CONFIGURAÇÃO DO SUPABASE
   ========================================================= */

const SUPABASE_URL =
  'https://prewnqtsdgzjzsgxggax.supabase.co';

const SUPABASE_PUBLISHABLE_KEY =
  'sb_publishable_tHdnd8U7OJyYATrO-VK3gw_Nt7EW_-e';


/* =========================================================
   VERIFICAÇÃO DA BIBLIOTECA
   ========================================================= */

if (!window.supabase) {
  throw new Error(
    'A biblioteca do Supabase não foi carregada.'
  );
}


/* =========================================================
   CRIAÇÃO DO CLIENTE
   ========================================================= */

window.supabaseClient =
  window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
  );


/* =========================================================
   TESTE
   ========================================================= */

console.log('✓ StockVision: Supabase conectado.');