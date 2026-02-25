import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-api-secret, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const POS_API_SECRET = Deno.env.get("POS_API_SECRET");
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

    // Only short-circuit for SUCCESS — allow FAILED to be retried
    if (existing && existing.status === "SUCCESS") {
      return new Response(
        JSON.stringify(existing.api_response || { status: "SUCCESS", transaction_id }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Record as PENDING (or reset FAILED back to PENDING for retry)
    if (!existing) {
      await supabase.from("pos_transactions").insert({
        transaction_id, order_id, location_id,
        actual_date: actual_date || new Date().toISOString().slice(0, 10),
        items, user_id, status: "PENDING",
      });
    } else if (existing.status === "FAILED") {
      await supabase.from("pos_transactions")
        .update({ status: "PENDING" })
        .eq("transaction_id", transaction_id);
    }

    // Forward to FWTeam App
    const apiResponse = await fetch(`${FWTEAM_API_URL}/functions/v1/deduct-inventory`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${FWTEAM_ANON_KEY}`,
        "apikey": FWTEAM_ANON_KEY,
        "x-api-secret": POS_API_SECRET || "",
      },
      body: JSON.stringify({ transaction_id, order_id, location_id, actual_date, items, user_id, timestamp }),
    });

    const apiData = await apiResponse.json();

    const finalStatus = apiData.status || (apiResponse.ok ? "SUCCESS" : "FAILED");

    await supabase.from("pos_transactions")
      .update({ status: finalStatus, api_response: apiData })
      .eq("transaction_id", transaction_id);

    // Never forward raw 404 — the client would think THIS function is missing
    const clientStatus = apiResponse.status === 404 ? 502 : apiResponse.status;

    return new Response(JSON.stringify({ ...apiData, upstream_status: apiResponse.status }), {
      status: clientStatus,
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
