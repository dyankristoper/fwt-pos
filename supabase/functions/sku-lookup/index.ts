import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

    // Fetch all active inventory items from FWTeam
    const apiResponse = await fetch(
      `${FWTEAM_API_URL}/rest/v1/inventory_items?is_active=eq.true&select=id,sku,item_name,category,unit_of_measure&order=item_name.asc`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${FWTEAM_ANON_KEY}`,
          "apikey": FWTEAM_ANON_KEY,
        },
      }
    );

    if (!apiResponse.ok) {
      const errText = await apiResponse.text();
      throw new Error(`FWTeam API error [${apiResponse.status}]: ${errText}`);
    }

    const items = await apiResponse.json();

    return new Response(JSON.stringify({ items }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("sku-lookup error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
