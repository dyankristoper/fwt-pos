

# Fix: Apply 404-to-502 remapping to pos-refund edge function

## Problem

The `pos-refund` edge function forwards the upstream FWTeam API's HTTP status directly to the client. When the FWTeam `refund-inventory` endpoint returns 404 (not deployed yet), the POS client receives a raw 404 — which looks like the `pos-refund` function itself is missing, rather than signaling a downstream API failure.

## Solution

Apply the same fix already in `pos-deduct`: remap upstream 404 to 502 Bad Gateway and include `upstream_status` in the response body.

## Technical Details

**File: `supabase/functions/pos-refund/index.ts`**

Change the final response block (currently around line 79-82) from:

```ts
return new Response(JSON.stringify(apiData), {
  status: apiResponse.status,
  headers: { ...corsHeaders, "Content-Type": "application/json" },
});
```

To:

```ts
const clientStatus = apiResponse.status === 404 ? 502 : apiResponse.status;

return new Response(JSON.stringify({ ...apiData, upstream_status: apiResponse.status }), {
  status: clientStatus,
  headers: { ...corsHeaders, "Content-Type": "application/json" },
});
```

This is a 2-line change mirroring exactly what was done in `pos-deduct`. The function will be redeployed automatically.

