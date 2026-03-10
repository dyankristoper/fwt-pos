import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Download, Lock, Unlock, Loader2, FileText, Printer as PrinterIcon, XCircle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useSlipManagement } from './useSlipManagement';

interface SlipSummaryDashboardProps {
  branchId: string;
  onBack: () => void;
  onDayCloseChange?: (isClosed: boolean) => void;
  embedded?: boolean;
}

interface SlipRow {
  slip_number: string;
  total: number;
  status: string;
  cashier_name: string;
  created_at: string;
  void_reason?: string;
  void_by?: string;
}

const SlipSummaryDashboard = ({ branchId, onBack, onDayCloseChange }: SlipSummaryDashboardProps) => {
  const { dayClose, closeDay, reopenDay } = useSlipManagement(branchId);
  const [slips, setSlips] = useState<SlipRow[]>([]);
  const [reprintCount, setReprintCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // PIN overlay
  const [showPinFor, setShowPinFor] = useState<'close' | 'reopen' | null>(null);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState(false);

  useEffect(() => { loadData(); }, [branchId]);

  const loadData = async () => {
    setLoading(true);
    const today = new Date().toISOString().slice(0, 10);
    const startOfDay = `${today}T00:00:00`;
    const endOfDay = `${today}T23:59:59`;

    const [slipRes, reprintRes] = await Promise.all([
      supabase.from('order_slips').select('slip_number, total, status, cashier_name, created_at, void_reason, void_by')
        .eq('branch_id', branchId).gte('created_at', startOfDay).lte('created_at', endOfDay)
        .order('created_at', { ascending: false }) as any,
      supabase.from('reprint_log').select('id')
        .gte('created_at', startOfDay).lte('created_at', endOfDay) as any,
    ]);

    setSlips(slipRes.data || []);
    setReprintCount(reprintRes.data?.length || 0);
    setLoading(false);
  };

  const activeSlips = slips.filter(s => s.status === 'ACTIVE');
  const voidedSlips = slips.filter(s => s.status === 'VOID');
  const totalActiveSales = activeSlips.reduce((sum, s) => sum + Number(s.total), 0);

  const handleCSVExport = useCallback(() => {
    const headers = ['Slip Number', 'Total', 'Status', 'Cashier', 'Time', 'Void Reason', 'Voided By'];
    const rows = slips.map(s => [
      s.slip_number,
      Number(s.total).toFixed(2),
      s.status,
      s.cashier_name || '',
      new Date(s.created_at).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' }),
      s.void_reason || '',
      s.void_by || '',
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `slip-summary-${branchId}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exported');
  }, [slips, branchId]);

  const handlePinSubmit = async () => {
    const { data } = await supabase
      .from('supervisors')
      .select('name')
      .eq('pin', pin)
      .eq('is_active', true)
      .limit(1);

    const supervisors = data as unknown as { name: string }[] | null;
    if (!supervisors || supervisors.length === 0) {
      setPinError(true);
      setPin('');
      return;
    }

    const name = supervisors[0].name;
    if (showPinFor === 'close') {
      const ok = await closeDay(name);
      if (ok) onDayCloseChange?.(true);
    } else if (showPinFor === 'reopen') {
      const ok = await reopenDay(name);
      if (ok) onDayCloseChange?.(false);
    }
    setShowPinFor(null);
    setPin('');
    setPinError(false);
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-background">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">Slip Summary</h1>
            <p className="text-muted-foreground mt-1">
              {new Date().toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={handleCSVExport} disabled={slips.length === 0}
              className="h-12 px-5 bg-foreground/10 text-foreground rounded-lg font-display font-semibold flex items-center gap-2 active:scale-[0.97] transition-transform disabled:opacity-30">
              <Download size={18} /> CSV Export
            </button>
            {dayClose.isClosed ? (
              <button onClick={() => setShowPinFor('reopen')}
                className="h-12 px-5 bg-pos-gold text-primary rounded-lg font-display font-semibold flex items-center gap-2 active:scale-[0.97] transition-transform">
                <Unlock size={18} /> Reopen Day
              </button>
            ) : (
              <button onClick={() => setShowPinFor('close')}
                className="h-12 px-5 bg-accent text-accent-foreground rounded-lg font-display font-semibold flex items-center gap-2 active:scale-[0.97] transition-transform">
                <Lock size={18} /> Close Day
              </button>
            )}
            <button onClick={onBack}
              className="h-12 px-6 bg-primary text-primary-foreground rounded-lg font-display font-semibold flex items-center gap-2 active:scale-[0.97] transition-transform">
              <ArrowLeft size={20} /> Back
            </button>
          </div>
        </div>

        {/* Day closed banner */}
        {dayClose.isClosed && (
          <div className="bg-accent/10 border border-accent/20 rounded-xl p-4 mb-6 flex items-center gap-3">
            <Lock size={20} className="text-accent" />
            <div>
              <p className="font-display font-bold text-foreground">Day Closed</p>
              <p className="text-xs text-foreground/50">
                Closed by {dayClose.closedBy} at {dayClose.closedAt ? new Date(dayClose.closedAt).toLocaleTimeString('en-PH') : ''}
              </p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 size={32} className="animate-spin text-foreground/30" /></div>
        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-5 gap-4 mb-8">
              <StatCard icon={FileText} label="Total Slips" value={String(slips.length)} />
              <StatCard icon={CheckCircle} label="Active" value={String(activeSlips.length)} color="text-green-500" />
              <StatCard icon={XCircle} label="Voided" value={String(voidedSlips.length)} color="text-accent" />
              <StatCard icon={FileText} label="Active Sales" value={`₱${totalActiveSales.toLocaleString()}`} />
              <StatCard icon={PrinterIcon} label="Reprints" value={String(reprintCount)} />
            </div>

            {/* Slip list */}
            {slips.length > 0 && (
              <div className="bg-card rounded-xl border-2 border-foreground/5 overflow-hidden">
                <div className="grid grid-cols-5 gap-4 p-4 bg-foreground/5 font-display font-semibold text-xs text-foreground/60 uppercase tracking-wide">
                  <span>Slip #</span>
                  <span>Time</span>
                  <span>Cashier</span>
                  <span>Status</span>
                  <span className="text-right">Total</span>
                </div>
                {slips.map(slip => (
                  <div key={slip.slip_number} className="grid grid-cols-5 gap-4 p-4 border-t border-foreground/5 items-center">
                    <span className="font-display font-bold text-sm">{slip.slip_number}</span>
                    <span className="text-foreground/60 text-sm">
                      {new Date(slip.created_at).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className="text-foreground/60 text-sm">{slip.cashier_name}</span>
                    <span className={`font-display font-bold text-xs uppercase ${slip.status === 'VOID' ? 'text-accent' : 'text-green-500'}`}>
                      {slip.status}
                    </span>
                    <span className="text-right font-display font-bold text-sm">₱{Number(slip.total).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}

            {slips.length === 0 && (
              <div className="text-center py-16 text-foreground/30">
                <FileText size={48} className="mx-auto mb-3" />
                <p className="font-display font-bold">No slips today</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Supervisor PIN overlay */}
      {showPinFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-card rounded-2xl p-8 shadow-2xl max-w-sm w-full mx-4" onClick={e => e.stopPropagation()}>
            <h2 className="font-display text-xl font-bold text-foreground mb-4">
              Supervisor PIN Required
            </h2>
            <p className="text-muted-foreground text-sm mb-4">
              {showPinFor === 'close' ? 'Enter PIN to close the day' : 'Enter PIN to reopen the day'}
            </p>
            <input type="password" value={pin} onChange={e => { setPin(e.target.value); setPinError(false); }} maxLength={8}
              className={`w-full h-14 px-4 bg-background border-2 rounded-xl font-display text-2xl text-center tracking-[0.5em] text-foreground focus:outline-none transition-colors ${
                pinError ? 'border-accent' : 'border-foreground/10 focus:border-pos-gold'
              }`}
              placeholder="••••" autoFocus />
            {pinError && <p className="text-accent text-xs font-display font-semibold mt-2 text-center">Invalid supervisor PIN</p>}
            <button onClick={handlePinSubmit} disabled={!pin.trim()}
              className="w-full mt-6 h-14 bg-pos-gold text-primary rounded-xl font-display font-bold text-lg active:scale-[0.97] transition-transform disabled:opacity-30">
              Authorize
            </button>
            <button onClick={() => { setShowPinFor(null); setPin(''); setPinError(false); }}
              className="w-full mt-2 h-11 text-foreground/40 font-display font-semibold">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
};

const StatCard = ({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color?: string }) => (
  <div className="bg-card rounded-xl p-4 border-2 border-foreground/5">
    <div className="flex items-center gap-2 mb-2">
      <Icon size={16} className={color || 'text-foreground/50'} />
      <span className="font-display font-semibold text-[10px] text-foreground/60 uppercase tracking-wide">{label}</span>
    </div>
    <p className={`font-display text-2xl font-bold ${color || 'text-foreground'}`}>{value}</p>
  </div>
);

export default SlipSummaryDashboard;
