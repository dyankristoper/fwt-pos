import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Download, Printer, Eye, X } from 'lucide-react';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { toast } from 'sonner';
import { buildTwoCopyReceiptBytes } from './print/escpos80';
import { bluetoothPrinter } from './print/bluetoothPrinter';
import { ReceiptData } from './print/escpos';

interface SaleRow {
  id: string;
  created_at: string;
  order_slip_number: string;
  gross_sales: number;
  discount_total: number | null;
  vatable_sales: number | null;
  vat_amount: number | null;
  vat_exempt_sales: number | null;
  zero_rated_sales: number | null;
  service_charge_amount: number | null;
  service_charge_percent: number | null;
  net_sales: number;
  total_amount_due: number;
  payment_method: string;
  cashier_name: string | null;
  order_items: any;
  line_discounts: any;
  control_number: number;
  branch_code: string;
  subtotal: number;
  cash_received?: number | null;
  change_amount?: number | null;
}

interface TransactionsMasterlistProps {
  onBack: () => void;
  branchConfig?: { legal_name: string; name: string; code: string } | null;
  embedded?: boolean;
}

const TransactionsMasterlist = ({ onBack, branchConfig }: TransactionsMasterlistProps) => {
  const [sales, setSales] = useState<SaleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [detail, setDetail] = useState<SaleRow | null>(null);

  const fetchSales = useCallback(async () => {
    setLoading(true);
    const startOfDay = `${selectedDate}T00:00:00`;
    const endOfDay = `${selectedDate}T23:59:59`;
    const { data, error } = await supabase
      .from('completed_sales')
      .select('*')
      .gte('created_at', startOfDay)
      .lte('created_at', endOfDay)
      .order('created_at', { ascending: false });
    if (error) {
      console.error('Failed to fetch sales:', error);
      toast.error('Failed to load transactions');
    }
    setSales((data as unknown as SaleRow[]) || []);
    setLoading(false);
  }, [selectedDate]);

  useEffect(() => { fetchSales(); }, [fetchSales]);

  const handleExportCSV = useCallback(() => {
    if (sales.length === 0) { toast.error('No data to export'); return; }
    const headers = ['Date/Time','Slip #','Gross Sales','Discount','VATable Sales','VAT Amount','VAT-Exempt','Service Charge','Total','Payment','Cashier'];
    const rows = sales.map(s => [
      new Date(s.created_at).toLocaleString('en-PH'),
      s.order_slip_number,
      s.gross_sales.toFixed(2),
      (s.discount_total ?? 0).toFixed(2),
      (s.vatable_sales ?? 0).toFixed(2),
      (s.vat_amount ?? 0).toFixed(2),
      (s.vat_exempt_sales ?? 0).toFixed(2),
      (s.service_charge_amount ?? 0).toFixed(2),
      s.total_amount_due.toFixed(2),
      s.payment_method,
      s.cashier_name || '',
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `transactions-${selectedDate}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exported');
  }, [sales, selectedDate]);

  const handleReprint = useCallback(async (sale: SaleRow) => {
    const items = Array.isArray(sale.order_items) ? sale.order_items : [];
    const receiptData: ReceiptData = {
      storeName: branchConfig?.legal_name || 'FIFTH D FRIED CHICKEN KIOSK.',
      branchName: branchConfig?.name || 'Main Branch',
      orderSlipNumber: sale.order_slip_number,
      date: new Date(sale.created_at).toISOString().slice(0, 10),
      time: new Date(sale.created_at).toTimeString().slice(0, 5),
      cashier: sale.cashier_name || 'CASHIER',
      items: items.map((i: any) => ({
        qty: i.quantity || 1,
        name: i.menuItem?.name || i.name || 'Item',
        amount: i.menuItem?.price ? (i.menuItem.price * (i.quantity || 1)) : (i.amount || 0),
        discountLabel: i.discount ? `${i.discount.discount_name || i.discount.reason || 'Disc'} -PHP${(i.discount.value || 0).toFixed(2)}` : undefined,
        idNumber: i.discount?.id_number,
      })),
      subtotal: sale.subtotal,
      serviceCharge: sale.service_charge_amount && sale.service_charge_amount > 0 ? {
        percent: sale.service_charge_percent || 0,
        amount: sale.service_charge_amount,
      } : undefined,
      total: sale.total_amount_due,
      paymentMethod: sale.payment_method,
      cashReceived: (sale as any).cash_received ?? undefined,
      change: (sale as any).change_amount ?? undefined,
      isReprint: true,
    };
    const bytes = buildTwoCopyReceiptBytes(receiptData);
    if (!bluetoothPrinter.status.connected) {
      toast.error('Printer not connected');
      return;
    }
    const ok = await bluetoothPrinter.sendBytes(bytes);
    if (ok) toast.success('Reprint sent to printer');
    else toast.error('Reprint failed');
  }, [branchConfig]);

  const fmt = (n: number | null | undefined) => (n ?? 0).toFixed(2);

  const getDiscountTypes = (s: SaleRow): string => {
    const discounts = Array.isArray(s.line_discounts) ? s.line_discounts : [];
    const names = discounts
      .map((d: any) => d.discount?.discount_name || d.discount?.reason || '')
      .filter(Boolean);
    const unique = [...new Set(names)];
    return unique.length > 0 ? unique.join(', ') : '—';
  };

  // Totals
  const totals = sales.reduce((acc, s) => ({
    gross: acc.gross + s.gross_sales,
    disc: acc.disc + (s.discount_total ?? 0),
    vatable: acc.vatable + (s.vatable_sales ?? 0),
    vat: acc.vat + (s.vat_amount ?? 0),
    exempt: acc.exempt + (s.vat_exempt_sales ?? 0),
    sc: acc.sc + (s.service_charge_amount ?? 0),
    total: acc.total + s.total_amount_due,
  }), { gross: 0, disc: 0, vatable: 0, vat: 0, exempt: 0, sc: 0, total: 0 });

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-background">
      {/* Header */}
      <div className="shrink-0 p-4 flex items-center justify-between border-b border-foreground/10">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="h-10 w-10 rounded-lg bg-foreground/5 flex items-center justify-center active:scale-95">
            <ArrowLeft size={18} />
          </button>
          <h2 className="font-display text-lg font-bold text-foreground">Transactions</h2>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            className="h-10 px-3 rounded-lg border border-foreground/10 bg-card font-display text-sm text-foreground"
          />
          <button onClick={handleExportCSV} className="h-10 px-4 rounded-lg bg-primary/10 text-primary font-display font-semibold text-sm flex items-center gap-2 active:scale-95">
            <Download size={16} /> CSV
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center h-full text-foreground/40 font-display">Loading...</div>
        ) : sales.length === 0 ? (
          <div className="flex items-center justify-center h-full text-foreground/30 font-display">No transactions for {selectedDate}</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-display text-xs">Time</TableHead>
                <TableHead className="font-display text-xs">Slip #</TableHead>
                <TableHead className="font-display text-xs text-right">Gross</TableHead>
                <TableHead className="font-display text-xs text-right">Disc</TableHead>
                <TableHead className="font-display text-xs">Disc Type</TableHead>
                <TableHead className="font-display text-xs text-right">VATable</TableHead>
                <TableHead className="font-display text-xs text-right">VAT</TableHead>
                <TableHead className="font-display text-xs text-right">Exempt</TableHead>
                <TableHead className="font-display text-xs text-right">Svc Chg</TableHead>
                <TableHead className="font-display text-xs text-right">Total</TableHead>
                <TableHead className="font-display text-xs">Pay</TableHead>
                <TableHead className="font-display text-xs">Cashier</TableHead>
                <TableHead className="font-display text-xs w-20"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sales.map(s => (
                <TableRow key={s.id} className="cursor-pointer" onClick={() => setDetail(s)}>
                  <TableCell className="font-body text-xs">{new Date(s.created_at).toTimeString().slice(0, 5)}</TableCell>
                  <TableCell className="font-display text-xs font-semibold">{s.order_slip_number}</TableCell>
                  <TableCell className="font-body text-xs text-right">{fmt(s.gross_sales)}</TableCell>
                  <TableCell className="font-body text-xs text-right">{fmt(s.discount_total)}</TableCell>
                  <TableCell className="font-body text-xs">{getDiscountTypes(s)}</TableCell>
                  <TableCell className="font-body text-xs text-right">{fmt(s.vatable_sales)}</TableCell>
                  <TableCell className="font-body text-xs text-right">{fmt(s.vat_amount)}</TableCell>
                  <TableCell className="font-body text-xs text-right">{fmt(s.vat_exempt_sales)}</TableCell>
                  <TableCell className="font-body text-xs text-right">{fmt(s.service_charge_amount)}</TableCell>
                  <TableCell className="font-display text-xs font-bold text-right">{fmt(s.total_amount_due)}</TableCell>
                  <TableCell className="font-body text-xs uppercase">{s.payment_method}</TableCell>
                  <TableCell className="font-body text-xs">{s.cashier_name}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <button onClick={e => { e.stopPropagation(); setDetail(s); }} className="h-7 w-7 rounded bg-foreground/5 flex items-center justify-center"><Eye size={14} /></button>
                      <button onClick={e => { e.stopPropagation(); handleReprint(s); }} className="h-7 w-7 rounded bg-foreground/5 flex items-center justify-center"><Printer size={14} /></button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {/* Totals row */}
              <TableRow className="bg-muted/50 font-bold">
                <TableCell className="font-display text-xs" colSpan={2}>TOTALS ({sales.length} txns)</TableCell>
                <TableCell className="font-display text-xs text-right">{totals.gross.toFixed(2)}</TableCell>
                <TableCell className="font-display text-xs text-right">{totals.disc.toFixed(2)}</TableCell>
                <TableCell></TableCell>
                <TableCell className="font-display text-xs text-right">{totals.vatable.toFixed(2)}</TableCell>
                <TableCell className="font-display text-xs text-right">{totals.vat.toFixed(2)}</TableCell>
                <TableCell className="font-display text-xs text-right">{totals.exempt.toFixed(2)}</TableCell>
                <TableCell className="font-display text-xs text-right">{totals.sc.toFixed(2)}</TableCell>
                <TableCell className="font-display text-xs text-right">{totals.total.toFixed(2)}</TableCell>
                <TableCell colSpan={3}></TableCell>
              </TableRow>
            </TableBody>
          </Table>
        )}
      </div>

      {/* Detail Modal */}
      {detail && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => setDetail(null)}>
          <div className="bg-card rounded-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg font-bold text-foreground">Transaction Detail</h3>
              <button onClick={() => setDetail(null)} className="h-8 w-8 rounded-lg bg-foreground/5 flex items-center justify-center"><X size={16} /></button>
            </div>

            <div className="space-y-3 text-sm font-body">
              <div className="flex justify-between"><span className="text-foreground/50">Slip #</span><span className="font-display font-semibold">{detail.order_slip_number}</span></div>
              <div className="flex justify-between"><span className="text-foreground/50">Control #</span><span>{detail.control_number}</span></div>
              <div className="flex justify-between"><span className="text-foreground/50">Date/Time</span><span>{new Date(detail.created_at).toLocaleString('en-PH')}</span></div>
              <div className="flex justify-between"><span className="text-foreground/50">Cashier</span><span>{detail.cashier_name}</span></div>
              <div className="flex justify-between"><span className="text-foreground/50">Payment</span><span className="uppercase">{detail.payment_method}</span></div>

              {/* Line items with full detail */}
              <div className="border-t border-foreground/10 pt-3">
                <p className="font-display font-semibold text-xs text-foreground/50 uppercase mb-2">Order Items</p>
                {(Array.isArray(detail.order_items) ? detail.order_items : []).map((item: any, idx: number) => {
                  const qty = item.quantity || 1;
                  const unitPrice = item.menuItem?.price || item.price || 0;
                  const lineTotal = unitPrice * qty;
                  const itemName = item.menuItem?.name || item.name || 'Item';
                  const discount = item.discount;
                  const discountValue = discount?.value || 0;
                  const discountName = discount?.discount_name || discount?.reason || '';
                  const customerName = discount?.customer_name;
                  const idNumber = discount?.id_number;
                  const addOns = item.addOns || item.add_ons || [];

                  return (
                    <div key={idx} className="py-2 border-b border-foreground/5 last:border-0">
                      <div className="flex justify-between">
                        <span className="font-display font-semibold">{qty}x {itemName}</span>
                        <span className="font-body">PHP {lineTotal.toFixed(2)}</span>
                      </div>
                      <div className="text-xs text-foreground/40 ml-4">
                        @ PHP {unitPrice.toFixed(2)} each
                      </div>
                      {Array.isArray(addOns) && addOns.length > 0 && addOns.map((ao: any, aoIdx: number) => (
                        <div key={aoIdx} className="text-xs text-foreground/50 ml-4 flex justify-between">
                          <span>+ {ao.name || ao.menuItem?.name || 'Add-on'}</span>
                          <span>PHP {(ao.price || ao.menuItem?.price || 0).toFixed(2)}</span>
                        </div>
                      ))}
                      {discount && discountValue > 0 && (
                        <div className="ml-4 mt-1 space-y-0.5">
                          <div className="flex justify-between text-xs text-destructive">
                            <span>↳ {discountName} ({discount.discount_percent || 0}%)</span>
                            <span>-PHP {discountValue.toFixed(2)}</span>
                          </div>
                          {customerName && (
                            <div className="text-xs text-foreground/40 ml-2">Name: {customerName}</div>
                          )}
                          {idNumber && (
                            <div className="text-xs text-foreground/40 ml-2">ID #: {idNumber}</div>
                          )}
                          {discount.is_vat_exempt && (
                            <div className="text-xs text-destructive/70 ml-2">VAT-Exempt</div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* VAT Computation Breakdown */}
              <div className="border-t border-foreground/10 pt-3 space-y-1">
                <p className="font-display font-semibold text-xs text-foreground/50 uppercase mb-2">Sales Invoice Computation</p>
                <div className="flex justify-between"><span>Gross Sales</span><span>{fmt(detail.gross_sales)}</span></div>
                <div className="flex justify-between"><span>Less: Discount</span><span>({fmt(detail.discount_total)})</span></div>
                <div className="flex justify-between"><span>Net Sales</span><span>{fmt(detail.net_sales)}</span></div>
                <div className="flex justify-between"><span>VATable Sales</span><span>{fmt(detail.vatable_sales)}</span></div>
                <div className="flex justify-between"><span>VAT Amount (12%)</span><span>{fmt(detail.vat_amount)}</span></div>
                <div className="flex justify-between"><span>VAT-Exempt Sales</span><span>{fmt(detail.vat_exempt_sales)}</span></div>
                <div className="flex justify-between"><span>Zero-Rated Sales</span><span>{fmt(detail.zero_rated_sales)}</span></div>
                {(detail.service_charge_amount ?? 0) > 0 && (
                  <div className="flex justify-between"><span>Service Charge ({detail.service_charge_percent}%)</span><span>{fmt(detail.service_charge_amount)}</span></div>
                )}
                <div className="flex justify-between font-display font-bold text-base border-t border-foreground/10 pt-2 mt-2">
                  <span>Total Amount Due</span><span>PHP {fmt(detail.total_amount_due)}</span>
                </div>
                {(detail as any).cash_received != null && (
                  <>
                    <div className="flex justify-between"><span>Cash Received</span><span>{fmt((detail as any).cash_received)}</span></div>
                    <div className="flex justify-between"><span>Change</span><span>{fmt((detail as any).change_amount)}</span></div>
                  </>
                )}
              </div>
            </div>

            {/* Reprint button */}
            <button
              onClick={() => handleReprint(detail)}
              className="mt-4 w-full h-12 bg-primary text-primary-foreground rounded-xl font-display font-semibold flex items-center justify-center gap-2 active:scale-[0.97] transition-transform"
            >
              <Printer size={18} /> Reprint (2 Copies)
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransactionsMasterlist;
