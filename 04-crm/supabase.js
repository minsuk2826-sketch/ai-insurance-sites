'use strict';

// Supabase 공개 프로젝트 주소와 publishable key입니다.
// publishable key는 브라우저 사용을 전제로 하지만, 고객 데이터 보호를 위해 RLS가 반드시 필요합니다.
const { createClient } = supabase;
const db = createClient(
  'https://pzlxrlkvbrufhimyglyo.supabase.co',
  'sb_publishable_WE6jk24ys0guHE1INCZv-w_cmd-HqOd'
);
