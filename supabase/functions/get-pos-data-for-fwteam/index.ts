import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

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
    // ── Auth: shared secret ──
    const POS_API_SECRET = Deno.env.get("POS_API_SECRET");
    if (!POS_API_SECRET) {
      console.error("[get-pos-data-for-fwteam] POS_API_SECRET not configured");
      return new Response(
        JSON.stringify({ status: "FAILED", error_code: "SERVER_CONFIG", message: "Server misconfigured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const incomingKey = req.headers.get("x-pos-api-key");
    if (!incomingKey || incomingKey !== POS_API_SECRET) {
      console.error("[get-pos-data-for-fwteam] Auth failed — invalid or missing x-pos-api-key");
      return new Response(
        JSON.stringify({ status: "FAILED", error_code: "UNAUTHORIZED", message: "Invalid API key" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── Supabase client (service role for full read access) ──
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // ── Parse query params ──
    const url = new URL(req.url);
    const recordType = url.searchParams.get("type") || "sales"; // sales | orders | discounts | voids | staff | summary
    const dateFrom = url.searchParams.get("date_from"); // YYYY-MM-DD
    const dateTo = url.searchParams.get("date_to"); // YYYY-MM-DD
    const branch = url.searchParams.get("branch"); // e.g. QC01
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "500", 10), 1000);
    const offset = parseInt(url.searchParams.get("offset") || "0", 10);

    let data: unknown = null;

    switch (recordType) {
      // ── Completed sales (core) ──
      case "sales": {
        let q = supabase
          .from("completed_sales")
          .select("id, order_slip_number, control_number, order_items, line_discounts, subtotal, service_charge_percent, service_charge_amount, gross_sales, discount_total, net_sales, vatable_sales, vat_amount, vat_exempt_sales, zero_rated_sales, total_amount_due, payment_method, cashier_name, branch_code, transaction_id, cash_received, change_amount, created_at")
          .order("created_at", { ascending: false })
          .range(offset, offset + limit - 1);

        if (branch) q = q.eq("branch_code", branch);
        if (dateFrom) q = q.gte("created_at", `${dateFrom}T00:00:00`);
        if (dateTo) q = q.lte("created_at", `${dateTo}T23:59:59`);

        const res = await q;
        if (res.error) throw res.error;
        data = res.data;
        break;
      }

      // ── Order slips ──
      case "orders": {
        let q = supabase
          .from("order_slips")
          .select("id, slip_number, sale_id, branch_id, device_id, cashier_name, total, status, void_reason, void_note, void_by, void_timestamp, created_at")
          .order("created_at", { ascending: false })
          .range(offset, offset + limit - 1);

        if (branch) q = q.eq("branch_id", branch);
        if (dateFrom) q = q.gte("created_at", `${dateFrom}T00:00:00`);
        if (dateTo) q = q.lte("created_at", `${dateTo}T23:59:59`);

        const res = await q;
        if (res.error) throw res.error;
        data = res.data;
        break;
      }

      // ── Discount records ──
      case "discounts": {
        let q = supabase
          .from("sales_discounts")
          .select("id, sale_id, discount_type_id, discount_amount, vat_removed_amount, customer_name, id_number, created_at")
          .order("created_at", { ascending: false })
          .range(offset, offset + limit - 1);

        if (dateFrom) q = q.gte("created_at", `${dateFrom}T00:00:00`);
        if (dateTo) q = q.lte("created_at", `${dateTo}T23:59:59`);

        const res = await q;
        if (res.error) throw res.error;
        data = res.data;
        break;
      }

      // ── Void / refund log ──
      case "voids": {
        let q = supabase
          .from("void_refund_log")
          .select("id, original_sale_id, type, reason, original_amount, refund_amount, items_json, approved_by, processed_by, created_at")
          .order("created_at", { ascending: false })
          .range(offset, offset + limit - 1);

        if (dateFrom) q = q.gte("created_at", `${dateFrom}T00:00:00`);
        if (dateTo) q = q.lte("created_at", `${dateTo}T23:59:59`);

        const res = await q;
        if (res.error) throw res.error;
        data = res.data;
        break;
      }

      // ── SC/PWD log (staff-linked senior/PWD transactions) ──
      case "staff": {
        let q = supabase
          .from("sc_pwd_log")
          .select("id, sale_id, customer_name, id_number, discount_amount, vat_removed, approved_by, processed_by, created_at")
          .order("created_at", { ascending: false })
          .range(offset, offset + limit - 1);

        if (dateFrom) q = q.gte("created_at", `${dateFrom}T00:00:00`);
        if (dateTo) q = q.lte("created_at", `${dateTo}T23:59:59`);

        const res = await q;
        if (res.error) throw res.error;
        data = res.data;
        break;
      }

      // ── Day-close summary ──
      case "summary": {
        let q = supabase
          .from("day_close_log")
          .select("id, branch_id, close_date, closed_by, is_reopened, reopened_at, reopened_by, created_at")
          .order("close_date", { ascending: false })
          .range(offset, offset + limit - 1);

        if (branch) q = q.eq("branch_id", branch);
        if (dateFrom) q = q.gte("close_date", dateFrom);
        if (dateTo) q = q.lte("close_date", dateTo);

        const res = await q;
        if (res.error) throw res.error;
        data = res.data;
        break;
      }

      default:
        return new Response(
          JSON.stringify({ status: "FAILED", error_code: "INVALID_TYPE", message: `Unknown record type: ${recordType}. Supported: sales, orders, discounts, voids, staff, summary` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
    }

    return new Response(
      JSON.stringify({ status: "SUCCESS", type: recordType, count: Array.isArray(data) ? data.length : 0, data }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("[get-pos-data-for-fwteam] Fetch error:", msg);
    return new Response(
      JSON.stringify({ status: "FAILED", error_code: "INTERNAL_ERROR", message: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
