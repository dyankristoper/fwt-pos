const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const FWTEAM_API_URL = Deno.env.get("FWTEAM_API_URL");
    if (!FWTEAM_API_URL) throw new Error("FWTEAM_API_URL is not configured");

    const FWTEAM_ANON_KEY = Deno.env.get("FWTEAM_ANON_KEY");
    if (!FWTEAM_ANON_KEY) throw new Error("FWTEAM_ANON_KEY is not configured");

    const body = await req.json();
    const { location_id, items } = body;

    if (!location_id || !items?.length) {
      return new Response(
        JSON.stringify({ status: "FAILED", message: "Missing location_id or items" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const apiResponse = await fetch(`${FWTEAM_API_URL}/functions/v1/stock-check`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${FWTEAM_ANON_KEY}`,
        "apikey": FWTEAM_ANON_KEY,
      },
      body: JSON.stringify({ location_id, items }),
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
