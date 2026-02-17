import { DailySummaryData } from './types';
import { ArrowLeft, FileText, Banknote, CreditCard, Smartphone, Tag, XCircle, RotateCcw } from 'lucide-react';

interface ZReadingReportProps {
  summary: DailySummaryData;
  onBack: () => void;
}

const ZReadingReport = ({ summary, onBack }: ZReadingReportProps) => {
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' });

  // Payment breakdown
  const cashOrders = summary.orders.filter(o => o.paymentMethod === 'cash');
  const debitOrders = summary.orders.filter(o => o.paymentMethod === 'debit');
  const creditOrders = summary.orders.filter(o => o.paymentMethod === 'credit');
  const ewalletOrders = summary.orders.filter(o => o.paymentMethod === 'ewallet');

  // Discount breakdown
  const scDiscounts = summary.discounts.filter(d => d.discountType === 'SC');
  const pwdDiscounts = summary.discounts.filter(d => d.discountType === 'PWD');
  const promoDiscounts = summary.discounts.filter(d => d.discountType === 'PROMO');
  const empDiscounts = summary.discounts.filter(d => d.discountType === 'EMP');
  const totalDiscountAmount = summary.discounts.reduce((s, d) => s + d.discountAmount, 0);
  const totalVatRemoved = summary.discounts.reduce((s, d) => s + d.vatRemoved, 0);

  // Void/Refund breakdown
  const voids = summary.voidRefunds.filter(v => v.type === 'void');
  const refunds = summary.voidRefunds.filter(v => v.type === 'refund');
  const totalVoidAmount = voids.reduce((s, v) => s + v.amount, 0);
  const totalRefundAmount = refunds.reduce((s, v) => s + v.amount, 0);

  // Cash accountability
  const grossSales = summary.orders.reduce((s, o) => s + o.total, 0) + totalDiscountAmount;
  const netSales = summary.totalSales;
  const cashInDrawer = summary.cashSales;

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-background">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground flex items-center gap-3">
              <FileText size={28} />
              Z-Reading Report
            </h1>
            <p className="text-muted-foreground mt-1">{dateStr} • Generated at {timeStr}</p>
          </div>
          <button
            onClick={onBack}
            className="h-12 px-6 bg-primary text-primary-foreground rounded-lg font-display font-semibold flex items-center gap-2 active:scale-[0.97] transition-transform"
          >
            <ArrowLeft size={20} />
            Back
          </button>
        </div>

        {/* Report container - monospaced receipt style */}
        <div className="bg-card rounded-2xl border-2 border-foreground/10 overflow-hidden">
          {/* Store header */}
          <div className="bg-primary text-primary-foreground p-6 text-center">
            <p className="font-display text-2xl font-bold">FEATHERWEIGHT CHICKEN</p>
            <p className="font-display text-sm opacity-70 mt-1">End-of-Day Z-Reading</p>
            <p className="font-display text-xs opacity-50 mt-1">THIS IS NOT A VALID OFFICIAL RECEIPT.<br />A BIR-REGISTERED MANUAL RECEIPT WILL BE ISSUED.</p>
          </div>

          <div className="p-6 space-y-6">
            {/* ─── SALES SUMMARY ─── */}
            <Section title="Sales Summary">
              <Row label="Total Transactions" value={String(summary.totalOrders)} />
              <Row label="Gross Sales" value={fmt(grossSales)} />
              <Row label="Less: Discounts" value={`(${fmt(totalDiscountAmount)})`} muted />
              <Row label="Less: Voids" value={`(${fmt(totalVoidAmount)})`} muted />
              <Row label="Less: Refunds" value={`(${fmt(totalRefundAmount)})`} muted />
              <Divider />
              <Row label="Net Sales" value={fmt(netSales)} bold />
            </Section>

            {/* ─── PAYMENT METHOD BREAKDOWN ─── */}
            <Section title="Sales by Payment Method">
              <PaymentRow icon={Banknote} label="Cash" count={cashOrders.length} amount={summary.cashSales} />
              <PaymentRow icon={CreditCard} label="Debit Card" count={debitOrders.length} amount={summary.debitSales} />
              <PaymentRow icon={CreditCard} label="Credit Card" count={creditOrders.length} amount={summary.creditSales} />
              <PaymentRow icon={Smartphone} label="E-Wallet" count={ewalletOrders.length} amount={summary.ewalletSales} />
              <Divider />
              <Row label="Total" value={fmt(summary.totalSales)} bold />
            </Section>

            {/* ─── DISCOUNT SUMMARY ─── */}
            <Section title="Discount Summary">
              {summary.discounts.length === 0 ? (
                <p className="text-muted-foreground text-sm italic">No discounts applied today</p>
              ) : (
                <>
                  <DiscountRow icon={Tag} label="Senior Citizen (SC)" count={scDiscounts.length}
                    discount={scDiscounts.reduce((s, d) => s + d.discountAmount, 0)}
                    vat={scDiscounts.reduce((s, d) => s + d.vatRemoved, 0)} />
                  <DiscountRow icon={Tag} label="PWD" count={pwdDiscounts.length}
                    discount={pwdDiscounts.reduce((s, d) => s + d.discountAmount, 0)}
                    vat={pwdDiscounts.reduce((s, d) => s + d.vatRemoved, 0)} />
                  <DiscountRow icon={Tag} label="Promotional" count={promoDiscounts.length}
                    discount={promoDiscounts.reduce((s, d) => s + d.discountAmount, 0)}
                    vat={0} />
                  <DiscountRow icon={Tag} label="Employee" count={empDiscounts.length}
                    discount={empDiscounts.reduce((s, d) => s + d.discountAmount, 0)}
                    vat={0} />
                  <Divider />
                  <Row label="Total Discounts" value={fmt(totalDiscountAmount)} bold />
                  {totalVatRemoved > 0 && (
                    <Row label="Total VAT Removed" value={fmt(totalVatRemoved)} muted />
                  )}
                </>
              )}
            </Section>

            {/* ─── VOID / REFUND SUMMARY ─── */}
            <Section title="Void & Refund Summary">
              {summary.voidRefunds.length === 0 ? (
                <p className="text-muted-foreground text-sm italic">No voids or refunds today</p>
              ) : (
                <>
                  <div className="flex items-center justify-between py-2">
                    <span className="flex items-center gap-2 text-sm text-foreground/70">
                      <XCircle size={14} className="text-accent" /> Voided Transactions
                    </span>
                    <span className="font-display font-semibold text-sm text-foreground">
                      {voids.length} — {fmt(totalVoidAmount)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="flex items-center gap-2 text-sm text-foreground/70">
                      <RotateCcw size={14} className="text-primary" /> Refunded Transactions
                    </span>
                    <span className="font-display font-semibold text-sm text-foreground">
                      {refunds.length} — {fmt(totalRefundAmount)}
                    </span>
                  </div>
                  <Divider />
                  <Row label="Total Adjustments" value={fmt(totalVoidAmount + totalRefundAmount)} bold />
                </>
              )}
            </Section>

            {/* ─── CASH ACCOUNTABILITY ─── */}
            <Section title="Cash Accountability">
              <Row label="Cash Sales" value={fmt(cashInDrawer)} />
              <Row label="Less: Cash Refunds" value={`(${fmt(refunds.filter((_, i) => {
                // Only cash refunds — simplified: treat all as potential cash
                return true;
              }).reduce((s, r) => s + r.amount, 0))})`} muted />
              <Divider />
              <Row label="Expected Cash in Drawer" value={fmt(cashInDrawer)} bold />
            </Section>

            {/* Footer */}
            <div className="border-t-2 border-dashed border-foreground/10 pt-4 text-center">
              <p className="text-xs text-muted-foreground font-display">
                Z-Reading generated on {dateStr} at {timeStr}
              </p>
              <p className="text-xs text-muted-foreground font-display mt-1">
                Prepared by: CASHIER • End of Day
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Sub-components ───

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div>
    <h3 className="font-display text-sm font-bold text-foreground/60 uppercase tracking-wider mb-3">{title}</h3>
    <div className="bg-foreground/[0.03] rounded-xl p-4 space-y-1">{children}</div>
  </div>
);

const Row = ({ label, value, bold, muted }: { label: string; value: string; bold?: boolean; muted?: boolean }) => (
  <div className={`flex items-center justify-between py-1 ${bold ? 'border-t border-foreground/10 pt-2 mt-1' : ''}`}>
    <span className={`text-sm ${bold ? 'font-display font-bold text-foreground' : muted ? 'text-foreground/40' : 'text-foreground/70'}`}>
      {label}
    </span>
    <span className={`font-display text-sm ${bold ? 'font-bold text-foreground text-base' : muted ? 'text-foreground/40' : 'font-semibold text-foreground'}`}>
      {value}
    </span>
  </div>
);

const Divider = () => <div className="border-t border-dashed border-foreground/10 my-2" />;

const PaymentRow = ({ icon: Icon, label, count, amount }: { icon: React.ElementType; label: string; count: number; amount: number }) => (
  <div className="flex items-center justify-between py-1.5">
    <span className="flex items-center gap-2 text-sm text-foreground/70">
      <Icon size={14} className="text-foreground/40" /> {label}
      <span className="text-foreground/30 text-xs">({count})</span>
    </span>
    <span className="font-display font-semibold text-sm text-foreground">{fmt(amount)}</span>
  </div>
);

const DiscountRow = ({ icon: Icon, label, count, discount, vat }: { icon: React.ElementType; label: string; count: number; discount: number; vat: number }) => {
  if (count === 0) return null;
  return (
    <div className="py-1.5">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 text-sm text-foreground/70">
          <Icon size={14} className="text-foreground/40" /> {label}
          <span className="text-foreground/30 text-xs">({count})</span>
        </span>
        <span className="font-display font-semibold text-sm text-foreground">{fmt(discount)}</span>
      </div>
      {vat > 0 && (
        <div className="flex justify-end">
          <span className="text-xs text-foreground/40">VAT removed: {fmt(vat)}</span>
        </div>
      )}
    </div>
  );
};

const fmt = (n: number) => `₱${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default ZReadingReport;
