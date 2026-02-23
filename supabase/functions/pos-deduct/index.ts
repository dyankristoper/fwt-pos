import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const FWTEAM_API_URL = Deno.env.get("FWTEAM_API_URL");
    if (!FWTEAM_API_URL) throw new Error("FWTEAM_API_URL is not configured");

    const FWTEAM_ANON_KEY = Deno.env.get("FWTEAM_ANON_KEY");
    if (!FWTEAM_ANON_KEY) throw new Error("FWTEAM_ANON_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
    const { transaction_id, order_id, location_id, actual_date, items, user_id, timestamp } = body;

    if (!transaction_id || !order_id || !items?.length) {
      return new Response(
        JSON.stringify({ status: "FAILED", error_code: "INVALID_REQUEST", message: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Idempotency check
    const { data: existing } = await supabase
      .from("pos_transactions")
      .select("*")
      .eq("transaction_id", transaction_id)
      .maybeSingle();

    if (existing && existing.status !== "PENDING") {
      return new Response(
        JSON.stringify(existing.api_response || { status: existing.status, transaction_id }),
        { status: existing.status === "SUCCESS" ? 200 : 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Record as PENDING
    if (!existing) {
      await supabase.from("pos_transactions").insert({
        transaction_id, order_id, location_id,
        actual_date: actual_date || new Date().toISOString().slice(0, 10),
        items, user_id, status: "PENDING",
      });
    }

    // Forward to FWTeam App
    const apiResponse = await fetch(`${FWTEAM_API_URL}/functions/v1/deduct-inventory`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${FWTEAM_ANON_KEY}`,
        "apikey": FWTEAM_ANON_KEY,
      },
      body: JSON.stringify({ transaction_id, order_id, location_id, actual_date, items, user_id, timestamp }),
    });

    const apiData = await apiResponse.json();

    await supabase.from("pos_transactions")
      .update({ status: apiData.status || (apiResponse.ok ? "SUCCESS" : "FAILED"), api_response: apiData })
      .eq("transaction_id", transaction_id);

    return new Response(JSON.stringify(apiData), {
      status: apiResponse.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("pos-deduct error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ status: "FAILED", error_code: "INTERNAL_ERROR", message: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
