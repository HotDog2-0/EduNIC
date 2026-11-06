import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// ⚠️ PEGA AQUÍ TUS CREDENCIALES
const SUPABASE_URL = 'https://ajiutunsmzoycjkqdavg.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_WZFjHXQD8xn3EYSplCsqow_yza-9zjW';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);