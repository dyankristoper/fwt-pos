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

    const body = await req.json();
    const { location_id, items } = body;

    if (!location_id || !items?.length) {
      return new Response(
        JSON.stringify({ status: "FAILED", message: "Missing location_id or items" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Map sku_code → sku_id to match FWTeam App's expected field name
    const mappedItems = (items as { sku_code?: string; sku_id?: string; quantity: number }[]).map(
      (i) => ({ sku_id: i.sku_code || i.sku_id, quantity: i.quantity })
    );

    const apiResponse = await fetch(`${FWTEAM_API_URL}/functions/v1/stock-check`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-pos-api-key": POS_API_SECRET,
      },
      body: JSON.stringify({ location_id, items: mappedItems }),
    });

    const apiData = await apiResponse.json();

    return new Response(JSON.stringify(apiData), {
      status: apiResponse.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("stock-check error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ status: "FAILED", message: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
