import { DailySummaryData, CompletedOrder } from './types';
import { ArrowLeft, Banknote, CreditCard, Smartphone, AlertTriangle, FileText } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface DailySummaryProps {
  summary: DailySummaryData;
  onBack: () => void;
  onVoidRefund?: (order: CompletedOrder) => void;
  onZReading?: () => void;
}

const DailySummary = ({ summary, onBack, onVoidRefund, onZReading }: DailySummaryProps) => {
  const cashOrders = summary.orders.filter(o => o.paymentMethod === 'cash').length;
  const debitOrders = summary.orders.filter(o => o.paymentMethod === 'debit').length;
  const creditOrders = summary.orders.filter(o => o.paymentMethod === 'credit').length;
  const ewalletOrders = summary.orders.filter(o => o.paymentMethod === 'ewallet').length;

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-background">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">Daily Summary</h1>
            <p className="text-muted-foreground mt-1">
              {new Date().toLocaleDateString('en-PH', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {onZReading && (
              <button
                onClick={onZReading}
                className="h-12 px-6 bg-foreground/10 text-foreground rounded-lg font-display font-semibold flex items-center gap-2 active:scale-[0.97] transition-transform"
              >
                <FileText size={20} />
                Z-Reading
              </button>
            )}
            <button
              onClick={onBack}
              className="h-12 px-6 bg-primary text-primary-foreground rounded-lg font-display font-semibold flex items-center gap-2 active:scale-[0.97] transition-transform"
            >
              <ArrowLeft size={20} />
              Back to POS
            </button>
          </div>
        </div>

        {/* Main stats */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-card rounded-xl p-6 border-2 border-foreground/5">
            <p className="text-sm text-muted-foreground font-display uppercase tracking-wide">Total Orders</p>
            <p className="font-display text-5xl font-bold text-foreground mt-2">{summary.totalOrders}</p>
          </div>
          <div className="bg-card rounded-xl p-6 border-2 border-foreground/5">
            <p className="text-sm text-muted-foreground font-display uppercase tracking-wide">Total Sales</p>
            <p className="font-display text-5xl font-bold text-foreground mt-2">₱{summary.totalSales.toLocaleString()}</p>
          </div>
        </div>

        {/* Payment method breakdown */}
        <h2 className="font-display text-xl font-bold text-foreground mb-4">Sales by Payment Method</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <PaymentCard icon={Banknote} label="Cash" amount={summary.cashSales} orders={cashOrders} />
          <PaymentCard icon={CreditCard} label="Debit Card" amount={summary.debitSales} orders={debitOrders} />
          <PaymentCard icon={CreditCard} label="Credit Card" amount={summary.creditSales} orders={creditOrders} />
          <PaymentCard icon={Smartphone} label="E-Wallet" amount={summary.ewalletSales} orders={ewalletOrders} />
        </div>

        {/* Recent orders */}
        {summary.orders.length > 0 && (
          <>
            <h2 className="font-display text-xl font-bold text-foreground mb-4">Recent Orders</h2>
            <div className="bg-card rounded-xl border-2 border-foreground/5 overflow-hidden">
              <div className="grid grid-cols-5 gap-4 p-4 bg-foreground/5 font-display font-semibold text-xs text-foreground/60 uppercase tracking-wide">
                <span>Order</span>
                <span>Time</span>
                <span>Method</span>
                <span className="text-right">Total</span>
                <span className="text-right">Actions</span>
              </div>
              {summary.orders
                .slice()
                .reverse()
                .map(order => (
                  <div key={order.id} className="grid grid-cols-5 gap-4 p-4 border-t border-foreground/5 items-center">
                    <span className="font-display font-bold text-sm">{order.orderSlipNumber}</span>
                    <span className="text-foreground/60 text-sm">
                      {order.timestamp.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className="capitalize text-foreground/60 text-sm">
                      {order.paymentMethod === 'ewallet' ? 'E-Wallet' : order.paymentMethod}
                    </span>
                    <span className="text-right font-display font-bold text-sm">₱{order.total.toLocaleString()}</span>
                    <div className="flex justify-end">
                      {onVoidRefund && (
                        <button
                          onClick={() => onVoidRefund(order)}
                          className="h-8 px-3 text-xs font-display font-semibold text-accent bg-accent/10 rounded-lg flex items-center gap-1 active:scale-[0.97] transition-transform border border-accent/20"
                        >
                          <AlertTriangle size={12} />
                          Void/Refund
                        </button>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const PaymentCard = ({
  icon: Icon,
  label,
  amount,
  orders,
}: {
  icon: LucideIcon;
  label: string;
  amount: number;
  orders: number;
}) => (
  <div className="bg-card rounded-xl p-4 border-2 border-foreground/5">
    <div className="flex items-center gap-2 mb-2">
      <Icon size={18} className="text-foreground/50" />
      <span className="font-display font-semibold text-xs text-foreground/60 uppercase tracking-wide">{label}</span>
    </div>
    <p className="font-display text-2xl font-bold text-foreground">₱{amount.toLocaleString()}</p>
    <p className="text-xs text-foreground/40 mt-1">{orders} order{orders !== 1 ? 's' : ''}</p>
  </div>
);

export default DailySummary;
