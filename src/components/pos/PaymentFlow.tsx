import { useState } from 'react';
import { PaymentMethod } from './types';
import { Banknote, CreditCard, Smartphone, ArrowLeft, QrCode } from 'lucide-react';

interface PaymentFlowProps {
  total: number;
  onComplete: (method: PaymentMethod, cashReceived?: number, change?: number) => void;
  onCancel: () => void;
}

type PaymentStep = 'select' | 'cash' | 'card' | 'ewallet';

const QUICK_AMOUNTS = [100, 200, 500, 1000];
const NUMPAD_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '00'];

const PaymentFlow = ({ total, onComplete, onCancel }: PaymentFlowProps) => {
  const [step, setStep] = useState<PaymentStep>('select');
  const [cardType, setCardType] = useState<PaymentMethod>('debit');
  const [cashInput, setCashInput] = useState('');

  const cashAmount = parseInt(cashInput) || 0;
  const change = cashAmount - total;
  const isExact = cashAmount === total;
  const isSufficient = cashAmount >= total;

  const handleNumpad = (key: string) => {
    if (key === 'C') {
      setCashInput('');
    } else if (cashInput.length < 7) {
      setCashInput(prev => prev + key);
    }
  };

  const resetAndGoBack = () => {
    setCashInput('');
    setStep('select');
  };

  // STEP 1: Select payment method
  if (step === 'select') {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6">
        <p className="font-display text-sm uppercase tracking-widest text-muted-foreground mb-2">
          Total Due
        </p>
        <p className="font-display text-5xl font-bold text-foreground mb-10">
          ₱{total.toLocaleString()}
        </p>

        <p className="font-display text-lg font-semibold text-foreground mb-4">
          Select Payment Method
        </p>
        <div className="grid grid-cols-2 gap-4 w-full max-w-md">
          <button
            onClick={() => { setCashInput(''); setStep('cash'); }}
            className="h-24 bg-primary text-primary-foreground rounded-xl flex flex-col items-center justify-center gap-2 font-display font-bold text-lg active:scale-[0.97] transition-transform"
          >
            <Banknote size={28} />
            Cash
          </button>
          <button
            onClick={() => { setCardType('debit'); setStep('card'); }}
            className="h-24 bg-primary text-primary-foreground rounded-xl flex flex-col items-center justify-center gap-2 font-display font-bold text-lg active:scale-[0.97] transition-transform"
          >
            <CreditCard size={28} />
            Debit Card
          </button>
          <button
            onClick={() => { setCardType('credit'); setStep('card'); }}
            className="h-24 bg-primary text-primary-foreground rounded-xl flex flex-col items-center justify-center gap-2 font-display font-bold text-lg active:scale-[0.97] transition-transform"
          >
            <CreditCard size={28} />
            Credit Card
          </button>
          <button
            onClick={() => setStep('ewallet')}
            className="h-24 bg-primary text-primary-foreground rounded-xl flex flex-col items-center justify-center gap-2 font-display font-bold text-lg active:scale-[0.97] transition-transform"
          >
            <Smartphone size={28} />
            E-Wallet
          </button>
        </div>

        <button
          onClick={onCancel}
          className="mt-8 h-12 px-8 text-foreground/50 font-display font-semibold flex items-center gap-2 active:scale-[0.97] transition-transform"
        >
          <ArrowLeft size={18} />
          Back to Order
        </button>
      </div>
    );
  }

  // Cash payment
  if (step === 'cash') {
    return (
      <div className="h-full flex flex-col items-center p-6 overflow-y-auto">
        <p className="font-display text-sm uppercase tracking-widest text-muted-foreground mb-1">
          Cash Payment
        </p>
        <p className="font-display text-3xl font-bold text-foreground mb-5">
          ₱{total.toLocaleString()}
        </p>

        {/* Quick amounts */}
        <div className="flex gap-2 mb-4">
          {QUICK_AMOUNTS.map(amount => (
            <button
              key={amount}
              onClick={() => setCashInput(String(amount))}
              className="h-11 px-5 bg-secondary text-foreground rounded-lg font-display font-semibold active:scale-[0.97] transition-transform"
            >
              ₱{amount}
            </button>
          ))}
        </div>

        {/* Cash received display */}
        <div className="bg-card border-2 border-foreground/10 rounded-xl p-4 w-full max-w-[280px] text-center mb-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Cash Received</p>
          <p className="font-display text-4xl font-bold text-foreground mt-1">
            ₱{cashInput || '0'}
          </p>
        </div>

        {/* Numpad */}
        <div className="grid grid-cols-3 gap-2 w-full max-w-[280px] mb-4">
          {NUMPAD_KEYS.map(key => (
            <button
              key={key}
              onClick={() => handleNumpad(key)}
              className={`h-14 rounded-xl font-display font-bold text-xl active:scale-[0.95] transition-transform ${
                key === 'C'
                  ? 'bg-accent text-accent-foreground'
                  : 'bg-card border-2 border-foreground/10 text-foreground'
              }`}
            >
              {key}
            </button>
          ))}
        </div>

        {/* Change / Insufficient */}
        {cashInput && (
          <div
            className={`rounded-xl p-3 w-full max-w-[280px] text-center mb-4 border-2 ${
              isSufficient
                ? 'bg-green-50 border-green-200'
                : 'bg-red-50 border-red-200'
            }`}
          >
            {isSufficient ? (
              <>
                <p className="text-xs text-green-600 uppercase tracking-wide">
                  {isExact ? 'Exact Amount' : 'Change'}
                </p>
                <p className="font-display text-2xl font-bold text-green-700 mt-0.5">
                  {isExact ? '✓' : `₱${change.toLocaleString()}`}
                </p>
              </>
            ) : (
              <>
                <p className="text-xs text-red-500 uppercase tracking-wide">Insufficient</p>
                <p className="font-display text-lg font-bold text-red-600 mt-0.5">
                  ₱{Math.abs(change).toLocaleString()} more needed
                </p>
              </>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 w-full max-w-[280px]">
          <button
            onClick={resetAndGoBack}
            className="flex-1 h-12 border-2 border-foreground/15 text-foreground/50 rounded-xl font-display font-semibold active:scale-[0.97] transition-transform"
          >
            Back
          </button>
          <button
            onClick={() => onComplete('cash', cashAmount, change)}
            disabled={!isSufficient}
            className="flex-[2] h-12 bg-pos-gold text-primary rounded-xl font-display font-bold text-lg active:scale-[0.97] transition-transform disabled:opacity-30 disabled:active:scale-100"
          >
            Complete
          </button>
        </div>
      </div>
    );
  }

  // Card payment (debit or credit)
  if (step === 'card') {
    const label = cardType === 'debit' ? 'Debit' : 'Credit';
    return (
      <div className="h-full flex flex-col items-center justify-center p-6">
        <CreditCard size={56} className="text-foreground/30 mb-4" />
        <p className="font-display text-sm uppercase tracking-widest text-muted-foreground mb-1">
          {label} Card Payment
        </p>
        <p className="font-display text-4xl font-bold text-foreground mb-8">
          ₱{total.toLocaleString()}
        </p>

        <div className="bg-card border-2 border-foreground/10 rounded-xl p-6 max-w-sm text-center mb-8">
          <p className="text-foreground/60 text-lg leading-relaxed">
            Process {label.toLowerCase()} card on terminal,
            <br />
            then confirm below
          </p>
        </div>

        <div className="flex gap-3 w-full max-w-xs">
          <button
            onClick={resetAndGoBack}
            className="flex-1 h-14 border-2 border-foreground/15 text-foreground/50 rounded-xl font-display font-semibold active:scale-[0.97] transition-transform"
          >
            Cancel
          </button>
          <button
            onClick={() => onComplete(cardType)}
            className="flex-[2] h-14 bg-pos-gold text-primary rounded-xl font-display font-bold text-lg active:scale-[0.97] transition-transform"
          >
            Payment Successful
          </button>
        </div>
      </div>
    );
  }

  // E-Wallet
  if (step === 'ewallet') {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6">
        <p className="font-display text-sm uppercase tracking-widest text-muted-foreground mb-1">
          E-Wallet Payment
        </p>
        <p className="font-display text-4xl font-bold text-foreground mb-8">
          ₱{total.toLocaleString()}
        </p>

        {/* QR placeholder */}
        <div className="w-52 h-52 bg-card border-2 border-foreground/10 rounded-xl flex flex-col items-center justify-center mb-4">
          <QrCode size={80} className="text-foreground/20 mb-2" />
          <p className="text-xs text-foreground/40 uppercase tracking-wide">Scan to Pay</p>
        </div>

        <p className="text-foreground/50 text-center mb-8 max-w-xs">
          Customer scans QR code and completes payment on their device
        </p>

        <div className="flex gap-3 w-full max-w-xs">
          <button
            onClick={resetAndGoBack}
            className="flex-1 h-14 border-2 border-foreground/15 text-foreground/50 rounded-xl font-display font-semibold active:scale-[0.97] transition-transform"
          >
            Cancel
          </button>
          <button
            onClick={() => onComplete('ewallet')}
            className="flex-[2] h-14 bg-pos-gold text-primary rounded-xl font-display font-bold text-lg active:scale-[0.97] transition-transform"
          >
            Payment Confirmed
          </button>
        </div>
      </div>
    );
  }

  return null;
};

export default PaymentFlow;
