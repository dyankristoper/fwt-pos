import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-fwteam-secret, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const VALID_RECORD_TYPES = ["sales", "orders", "expenses", "attendance_links", "all"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    // ── Auth ──
    const FWTEAM_SYNC_SECRET = Deno.env.get("FWTEAM_SYNC_SECRET");
    if (!FWTEAM_SYNC_SECRET) {
      console.error("[get-pos-data-for-fwteam] FWTEAM_SYNC_SECRET not configured");
      return json({ success: false, error: "Server misconfigured" }, 500);
    }

    const incomingSecret = req.headers.get("x-fwteam-secret");
    if (!incomingSecret || incomingSecret !== FWTEAM_SYNC_SECRET) {
      console.error("[get-pos-data-for-fwteam] Auth failed — invalid or missing x-fwteam-secret");
      return json({ success: false, error: "Unauthorized" }, 401);
    }

    // ── Supabase client ──
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // ── Parse params ──
    const url = new URL(req.url);
    const startDate = url.searchParams.get("start_date") || "";
    const endDate = url.searchParams.get("end_date") || "";
    const branch = url.searchParams.get("branch") || "";
    const recordType = url.searchParams.get("record_type") || "all";

    if (!VALID_RECORD_TYPES.includes(recordType)) {
      console.error(`[get-pos-data-for-fwteam] Invalid record_type: ${recordType}`);
      return json({
        success: false,
        error: `Invalid record_type '${recordType}'. Supported: ${VALID_RECORD_TYPES.join(", ")}`,
      }, 400);
    }

    const fetchAll = recordType === "all";
    const result: { sales: unknown[]; orders: unknown[]; expenses: unknown[]; attendance_links: unknown[] } = {
      sales: [],
      orders: [],
      expenses: [],
      attendance_links: [],
    };

    // ── Sales (completed_sales) ──
    if (fetchAll || recordType === "sales") {
      let q = supabase
        .from("completed_sales")
        .select("id, order_slip_number, control_number, order_items, line_discounts, subtotal, service_charge_percent, service_charge_amount, gross_sales, discount_total, net_sales, vatable_sales, vat_amount, vat_exempt_sales, zero_rated_sales, total_amount_due, payment_method, cashier_name, branch_code, transaction_id, cash_received, change_amount, created_at")
        .order("created_at", { ascending: false })
        .limit(1000);
      if (branch) q = q.eq("branch_code", branch);
      if (startDate) q = q.gte("created_at", `${startDate}T00:00:00`);
      if (endDate) q = q.lte("created_at", `${endDate}T23:59:59`);
      const { data, error } = await q;
      if (error) throw error;
      result.sales = (data || []).map((r: any) => ({ source_id: `pos-sale-${r.id}`, ...r }));
    }

    // ── Orders (order_slips — only ACTIVE/COMPLETED, exclude voided) ──
    if (fetchAll || recordType === "orders") {
      let q = supabase
        .from("order_slips")
        .select("id, slip_number, sale_id, branch_id, device_id, cashier_name, total, status, created_at")
        .in("status", ["ACTIVE", "COMPLETED", "PAID"])
        .order("created_at", { ascending: false })
        .limit(1000);
      if (branch) q = q.eq("branch_id", branch);
      if (startDate) q = q.gte("created_at", `${startDate}T00:00:00`);
      if (endDate) q = q.lte("created_at", `${endDate}T23:59:59`);
      const { data, error } = await q;
      if (error) throw error;
      result.orders = (data || []).map((r: any) => ({ source_id: `pos-order-${r.id}`, ...r }));
    }

    // ── Expenses (void_refund_log — finalized voids/refunds) ──
    if (fetchAll || recordType === "expenses") {
      let q = supabase
        .from("void_refund_log")
        .select("id, original_sale_id, type, reason, original_amount, refund_amount, items_json, approved_by, processed_by, created_at")
        .order("created_at", { ascending: false })
        .limit(1000);
      if (startDate) q = q.gte("created_at", `${startDate}T00:00:00`);
      if (endDate) q = q.lte("created_at", `${endDate}T23:59:59`);
      const { data, error } = await q;
      if (error) throw error;
      result.expenses = (data || []).map((r: any) => ({ source_id: `pos-expense-${r.id}`, ...r }));
    }

    // ── Attendance links (sc_pwd_log — staff-linked SC/PWD transactions) ──
    if (fetchAll || recordType === "attendance_links") {
      let q = supabase
        .from("sc_pwd_log")
        .select("id, sale_id, customer_name, id_number, discount_amount, vat_removed, approved_by, processed_by, created_at")
        .order("created_at", { ascending: false })
        .limit(1000);
      if (startDate) q = q.gte("created_at", `${startDate}T00:00:00`);
      if (endDate) q = q.lte("created_at", `${endDate}T23:59:59`);
      const { data, error } = await q;
      if (error) throw error;
      result.attendance_links = (data || []).map((r: any) => ({ source_id: `pos-att-${r.id}`, ...r }));
    }

    return json({
      success: true,
      synced_at: new Date().toISOString(),
      filters: { start_date: startDate, end_date: endDate, branch, record_type: recordType },
      data: result,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("[get-pos-data-for-fwteam] Server error:", msg);
    return json({ success: false, error: msg }, 500);
  }
});
