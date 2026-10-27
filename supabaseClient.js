import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL = "https://lmlflfkdukcdhkdjssmm.supabase.co";
export const SUPABASE_ANON_KEY = "sb_publishable_jCtI_SZy-jxcJoDkeXPN-g_HKO4LEXX";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

export default supabase;
