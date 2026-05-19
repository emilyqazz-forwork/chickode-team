import { createClient } from '@supabase/supabase-js';

let rawUrl = import.meta.env.VITE_CHICKODE_SUPABASE_API_URL || '';

// 주소 끝에 /rest/v1/ 이 붙어있으면 깔끔하게 잘라내는 로직
if (rawUrl.endsWith('/rest/v1/')) {
  rawUrl = rawUrl.replace('/rest/v1/', '');
} else if (rawUrl.endsWith('/rest/v1')) {
  rawUrl = rawUrl.replace('/rest/v1', '');
}

const supabaseUrl = rawUrl;
const supabaseAnonKey = import.meta.env.VITE_CHICKODE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);