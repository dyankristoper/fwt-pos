const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-pos-api-key, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const POS_API_SECRET = Deno.env.get("POS_API_SECRET");
    if (!POS_API_SECRET) throw new Error("POS_API_SECRET is not configured");

    const FWTEAM_API_URL = Deno.env.get("FWTEAM_API_URL");
    if (!FWTEAM_API_URL) throw new Error("FWTEAM_API_URL is not configured");

    const body = await req.json().catch(() => ({}));
    const { sku_code } = body;

    if (!sku_code) {
      return new Response(
        JSON.stringify({ valid: false, message: "sku_code is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const apiResponse = await fetch(`${FWTEAM_API_URL}/functions/v1/stock-check`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-pos-api-key": POS_API_SECRET,
      },
      body: JSON.stringify({
        location_id: "DEFAULT",
        items: [{ sku_code, quantity: 0 }],
      }),
    });

    // Upstream function not deployed — treat SKU as provisionally valid
    if (apiResponse.status === 404) {
      return new Response(
        JSON.stringify({ valid: true, sku_code, note: "Upstream inventory API unavailable — SKU accepted provisionally" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const apiData = await apiResponse.json();

    if (apiResponse.ok && apiData.status !== "FAILED") {
      return new Response(
        JSON.stringify({ valid: true, sku_code }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const message = apiData?.message || apiData?.error || "Unknown";
    const isNotFound = message.toLowerCase().includes("not found") || message.toLowerCase().includes("invalid");

    return new Response(
      JSON.stringify({ valid: !isNotFound, message, sku_code }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("sku-lookup error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ valid: false, error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
