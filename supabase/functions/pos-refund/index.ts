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
    const {
      original_order_id,
      refund_type,
      location_id,
      items,
      reason,
      approved_by,
      user_id,
    } = body;

    if (!original_order_id || !refund_type || !items?.length) {
      return new Response(
        JSON.stringify({ status: "FAILED", error_code: "INVALID_REQUEST", message: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const transaction_id = crypto.randomUUID();

    await supabase.from("pos_transactions").insert({
      transaction_id,
      order_id: `${refund_type.toUpperCase()}-${original_order_id}`,
      location_id: location_id || "DEFAULT",
      actual_date: new Date().toISOString().slice(0, 10),
      items,
      user_id: user_id || "POS",
      status: "PENDING",
    });

    const apiResponse = await fetch(`${FWTEAM_API_URL}/functions/v1/refund-inventory`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${FWTEAM_ANON_KEY}`,
        "apikey": FWTEAM_ANON_KEY,
        "x-api-secret": POS_API_SECRET || "",
      },
      body: JSON.stringify({
        transaction_id,
        original_order_id,
        refund_type,
        location_id: location_id || "DEFAULT",
        items,
        reason,
        approved_by,
        user_id: user_id || "POS",
        timestamp: new Date().toISOString(),
      }),
    });

    const apiData = await apiResponse.json();

    await supabase.from("pos_transactions")
      .update({ status: apiData.status || (apiResponse.ok ? "SUCCESS" : "FAILED"), api_response: apiData })
      .eq("transaction_id", transaction_id);

    const clientStatus = apiResponse.status === 404 ? 502 : apiResponse.status;

    return new Response(JSON.stringify({ ...apiData, upstream_status: apiResponse.status }), {
      status: clientStatus,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("pos-refund error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ status: "FAILED", error_code: "INTERNAL_ERROR", message: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
