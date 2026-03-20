// Supabase Edge Function: sync-terminal
// Handles bidirectional sync between Android POS terminals and Supabase
// Called by the Android app to push local changes and pull server changes

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SyncRequest {
  terminal_id: number;
  store_id: number;
  last_sync_at: string; // ISO timestamp
  // Data pushed FROM terminal
  orders?: any[];
  payments?: any[];
  till?: any;
  till_adjustments?: any[];
  customers?: any[];
  hold_orders?: any[];
  pending_loyalty_awards?: any[];
  pending_consent_updates?: any[];
}

interface SyncResponse {
  success: boolean;
  server_time: string;
  // Data pushed TO terminal
  products?: any[];
  product_categories?: any[];
  taxes?: any[];
  modifiers?: any[];
  customers?: any[];
  preferences?: any[];
  users?: any[];
  discount_codes?: any[];
  restaurant_tables?: any[];
  // Stats
  orders_synced: number;
  errors: string[];
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase client with user's JWT
    const authHeader = req.headers.get("Authorization")!;
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    // Service role client for operations that bypass RLS
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Verify the user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user's account_id
    const { data: posUser } = await supabase
      .from("pos_user")
      .select("account_id, user_id")
      .eq("auth_uid", user.id)
      .single();

    if (!posUser) {
      return new Response(
        JSON.stringify({ error: "POS user not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: SyncRequest = await req.json();
    const accountId = posUser.account_id;
    const errors: string[] = [];
    let ordersSynced = 0;

    // ========================================
    // PUSH: Terminal → Server
    // ========================================

    // Sync orders
    if (body.orders?.length) {
      for (const order of body.orders) {
        try {
          const { error } = await supabaseAdmin
            .from("orders")
            .upsert({
              ...order,
              account_id: accountId,
              is_sync: true,
            }, { onConflict: "uuid" });

          if (error) {
            errors.push(`Order ${order.uuid}: ${error.message}`);
          } else {
            ordersSynced++;
          }
        } catch (e) {
          errors.push(`Order ${order.uuid}: ${e.message}`);
        }
      }
    }

    // Sync payments
    if (body.payments?.length) {
      for (const payment of body.payments) {
        try {
          await supabaseAdmin
            .from("payment")
            .upsert(payment, { onConflict: "payment_id" });
        } catch (e) {
          errors.push(`Payment: ${e.message}`);
        }
      }
    }

    // Sync till data
    if (body.till) {
      try {
        await supabaseAdmin
          .from("till")
          .upsert({
            ...body.till,
            account_id: accountId,
            is_sync: true,
          }, { onConflict: "uuid" });
      } catch (e) {
        errors.push(`Till: ${e.message}`);
      }
    }

    // Sync till adjustments
    if (body.till_adjustments?.length) {
      try {
        await supabaseAdmin
          .from("till_adjustment")
          .upsert(body.till_adjustments);
      } catch (e) {
        errors.push(`Till adjustments: ${e.message}`);
      }
    }

    // Sync customers (new customers created at POS)
    if (body.customers?.length) {
      for (const customer of body.customers) {
        try {
          await supabaseAdmin
            .from("customer")
            .upsert({
              ...customer,
              account_id: accountId,
            }, { onConflict: "customer_id" });
        } catch (e) {
          errors.push(`Customer: ${e.message}`);
        }
      }
    }

    // Sync hold orders
    if (body.hold_orders?.length) {
      try {
        await supabaseAdmin
          .from("hold_order")
          .upsert(body.hold_orders.map((ho: any) => ({
            ...ho,
            account_id: accountId,
          })));
      } catch (e) {
        errors.push(`Hold orders: ${e.message}`);
      }
    }

    // Sync pending loyalty awards
    if (body.pending_loyalty_awards?.length) {
      try {
        await supabaseAdmin
          .from("pending_loyalty_award")
          .insert(body.pending_loyalty_awards.map((pla: any) => ({
            ...pla,
            account_id: accountId,
          })));
      } catch (e) {
        errors.push(`Loyalty awards: ${e.message}`);
      }
    }

    // ========================================
    // PULL: Server → Terminal
    // ========================================
    const lastSync = body.last_sync_at || "1970-01-01T00:00:00Z";

    // Get updated products
    const { data: products } = await supabase
      .from("product")
      .select("*")
      .gte("updated_at", lastSync);

    // Get updated categories
    const { data: categories } = await supabase
      .from("productcategory")
      .select("*")
      .gte("updated_at", lastSync);

    // Get updated taxes
    const { data: taxes } = await supabase
      .from("tax")
      .select("*")
      .gte("updated_at", lastSync);

    // Get updated modifiers
    const { data: modifiers } = await supabase
      .from("modifier")
      .select("*")
      .gte("updated_at", lastSync);

    // Get updated customers
    const { data: customers } = await supabase
      .from("customer")
      .select("*")
      .gte("updated_at", lastSync);

    // Get preferences
    const { data: preferences } = await supabase
      .from("preference")
      .select("*")
      .gte("updated_at", lastSync);

    // Get updated users
    const { data: users } = await supabase
      .from("pos_user")
      .select("user_id, username, firstname, lastname, pin, role, isadmin, issalesrep, permissions, discountlimit, isactive")
      .gte("updated_at", lastSync);

    // Get discount codes
    const { data: discountCodes } = await supabase
      .from("discountcode")
      .select("*")
      .gte("updated_at", lastSync);

    // Get restaurant tables for this store
    const { data: tables } = await supabase
      .from("restaurant_table")
      .select("*")
      .eq("store_id", body.store_id)
      .gte("updated_at", lastSync);

    // Log sync event
    await supabaseAdmin
      .from("sync_log")
      .insert({
        account_id: accountId,
        terminal_id: body.terminal_id,
        entity_type: "full_sync",
        action: "SYNC",
        payload: {
          orders_pushed: body.orders?.length ?? 0,
          orders_synced: ordersSynced,
          products_pulled: products?.length ?? 0,
          errors: errors.length,
        },
      });

    const response: SyncResponse = {
      success: errors.length === 0,
      server_time: new Date().toISOString(),
      products: products ?? [],
      product_categories: categories ?? [],
      taxes: taxes ?? [],
      modifiers: modifiers ?? [],
      customers: customers ?? [],
      preferences: preferences ?? [],
      users: users ?? [],
      discount_codes: discountCodes ?? [],
      restaurant_tables: tables ?? [],
      orders_synced: ordersSynced,
      errors,
    };

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
