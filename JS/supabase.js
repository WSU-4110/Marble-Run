import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL = 'https://frvkjlpgeuwsivchrvje.supabase.co';// URL of our Supabase project
const SUPABASE_ANON_KEY = 'sb_publishable_ljPH9YyvcWMdg9Z9bKBXxA_U8TKQaLe';//public anon key 

export const isConfigured =
    SUPABASE_URL.startsWith('https://') && !SUPABASE_URL.includes('YOUR-PROJECT') &&
    SUPABASE_ANON_KEY && !SUPABASE_ANON_KEY.includes('YOUR-ANON-KEY');

export const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);//create supabase client instance