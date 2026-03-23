import { createClient } from "@supabase/supabase-js";

let _instance: any = null;

export function getDb(): any {
  if (!_instance) {
    _instance = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }
  return _instance;
}
