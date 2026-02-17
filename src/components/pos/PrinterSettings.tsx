import { Bluetooth, BluetoothOff, Printer, CheckCircle2, XCircle, RefreshCw, Settings2 } from 'lucide-react';
import { usePrinter } from './print/usePrinter';

interface PrinterSettingsProps {
  onBack: () => void;
}

const PrinterSettings = ({ onBack }: PrinterSettingsProps) => {
  const { status, settings, connect, disconnect, testPrint, updateSettings, isSupported } = usePrinter();

  const handleTestPrint = async () => {
    const ok = await testPrint();
    if (!ok && !status.connected) {
      // If not connected, just show message
    }
  };

  return (
    <div className="h-full overflow-y-auto p-6 bg-background">
      <div className="max-w-lg mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <Settings2 size={28} className="text-foreground/60" />
          <h1 className="font-display text-2xl font-bold text-foreground">Printer Settings</h1>
        </div>

        {!isSupported && (
          <div className="bg-accent/10 border border-accent/20 rounded-xl p-4 mb-6">
            <p className="font-display font-semibold text-accent text-sm mb-1">Bluetooth Not Available</p>
            <p className="text-xs text-accent/80">Web Bluetooth API is not supported in this browser. Use Chrome on Android or enable the experimental flag.</p>
          </div>
        )}

        {/* Connection Status */}
        <div className="bg-card rounded-xl border-2 border-foreground/10 p-5 mb-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-bold text-foreground">Connection</h2>
            {status.connected ? (
              <span className="flex items-center gap-1.5 text-xs font-display font-semibold text-pos-gold-dark bg-pos-gold/20 px-3 py-1 rounded-full">
                <CheckCircle2 size={14} /> Connected
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-xs font-display font-semibold text-foreground/40 bg-foreground/5 px-3 py-1 rounded-full">
                <XCircle size={14} /> Disconnected
              </span>
            )}
          </div>

          {status.deviceName && (
            <div className="bg-foreground/5 rounded-lg p-3 mb-4">
              <p className="text-xs text-foreground/50 uppercase tracking-wide">Connected Printer</p>
              <p className="font-display font-bold text-foreground">{status.deviceName}</p>
            </div>
          )}

          {status.error && (
            <div className="bg-accent/10 border border-accent/20 rounded-lg p-3 mb-4">
              <p className="text-xs text-accent">{status.error}</p>
            </div>
          )}

          <div className="flex gap-2">
            {status.connected ? (
              <>
                <button
                  onClick={disconnect}
                  className="flex-1 h-12 border-2 border-foreground/15 text-foreground/60 rounded-xl font-display font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.97] transition-transform"
                >
                  <BluetoothOff size={16} />
                  Disconnect
                </button>
                <button
                  onClick={() => { disconnect(); setTimeout(connect, 300); }}
                  className="flex-1 h-12 border-2 border-foreground/15 text-foreground/60 rounded-xl font-display font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.97] transition-transform"
                >
                  <RefreshCw size={16} />
                  Reconnect
                </button>
              </>
            ) : (
              <button
                onClick={connect}
                disabled={!isSupported}
                className="flex-1 h-12 bg-primary text-primary-foreground rounded-xl font-display font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.97] transition-transform disabled:opacity-30"
              >
                <Bluetooth size={16} />
                Connect Printer
              </button>
            )}
          </div>
        </div>

        {/* Print Settings */}
        <div className="bg-card rounded-xl border-2 border-foreground/10 p-5 mb-4">
          <h2 className="font-display font-bold text-foreground mb-4">Print Options</h2>

          {/* Auto-print toggle */}
          <div className="flex items-center justify-between py-3 border-b border-foreground/5">
            <div>
              <p className="font-display font-semibold text-sm text-foreground">Auto-print after payment</p>
              <p className="text-xs text-foreground/40">Automatically print receipts when payment completes</p>
            </div>
            <button
              onClick={() => updateSettings({ autoPrint: !settings.autoPrint })}
              className={`w-12 h-7 rounded-full transition-colors relative ${settings.autoPrint ? 'bg-pos-gold' : 'bg-foreground/15'}`}
            >
              <span className={`absolute top-0.5 w-6 h-6 rounded-full bg-card shadow transition-transform ${settings.autoPrint ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
          </div>

          {/* Copies */}
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="font-display font-semibold text-sm text-foreground">Copies per receipt</p>
              <p className="text-xs text-foreground/40">Number of thermal copies to print</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => updateSettings({ copies: Math.max(1, settings.copies - 1) })}
                className="w-8 h-8 rounded-lg bg-foreground/5 border border-foreground/10 font-display font-bold text-foreground flex items-center justify-center active:scale-[0.95]"
              >
                −
              </button>
              <span className="w-8 text-center font-display font-bold text-lg text-foreground">{settings.copies}</span>
              <button
                onClick={() => updateSettings({ copies: Math.min(5, settings.copies + 1) })}
                className="w-8 h-8 rounded-lg bg-foreground/5 border border-foreground/10 font-display font-bold text-foreground flex items-center justify-center active:scale-[0.95]"
              >
                +
              </button>
            </div>
          </div>
        </div>

        {/* Test Print */}
        <button
          onClick={handleTestPrint}
          disabled={!status.connected}
          className="w-full h-14 bg-pos-gold text-primary rounded-xl font-display font-bold text-lg flex items-center justify-center gap-2 active:scale-[0.97] transition-transform disabled:opacity-30 mb-4"
        >
          <Printer size={20} />
          Test Print
        </button>

        <button
          onClick={onBack}
          className="w-full h-12 border-2 border-foreground/15 text-foreground/50 rounded-xl font-display font-semibold active:scale-[0.97] transition-transform"
        >
          Back to POS
        </button>
      </div>
    </div>
  );
};

export default PrinterSettings;
