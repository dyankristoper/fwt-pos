import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Plus, Eye, EyeOff, Shield, ShieldCheck, Pencil, ToggleLeft, ToggleRight } from 'lucide-react';
import { toast } from 'sonner';
import ServiceChargeSettings from './ServiceChargeSettings';

interface Supervisor {
  id: string;
  name: string;
  pin: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

interface SupervisorManagementProps {
  onBack: () => void;
}

type View = 'auth' | 'list' | 'add' | 'edit';

const SupervisorManagement = ({ onBack }: SupervisorManagementProps) => {
  const [view, setView] = useState<View>('auth');
  const [supervisors, setSupervisors] = useState<Supervisor[]>([]);
  const [authPin, setAuthPin] = useState('');
  const [authError, setAuthError] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form state
  const [editId, setEditId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formPin, setFormPin] = useState('');
  const [formRole, setFormRole] = useState<'supervisor' | 'admin'>('supervisor');
  const [showPin, setShowPin] = useState(false);

  const fetchSupervisors = useCallback(async () => {
    const { data } = await supabase.from('supervisors').select('*').order('created_at', { ascending: true });
    if (data) setSupervisors(data as unknown as Supervisor[]);
  }, []);

  const handleAuth = async () => {
    const { data } = await supabase
      .from('supervisors')
      .select('id')
      .eq('pin', authPin)
      .eq('role', 'admin')
      .eq('is_active', true)
      .limit(1);

    if (data && (data as unknown[]).length > 0) {
      setAuthError(false);
      setView('list');
      fetchSupervisors();
    } else {
      setAuthError(true);
      setAuthPin('');
    }
  };

  const resetForm = () => {
    setEditId(null);
    setFormName('');
    setFormPin('');
    setFormRole('supervisor');
    setShowPin(false);
  };

  const handleAdd = () => {
    resetForm();
    setView('add');
  };

  const handleEdit = (sup: Supervisor) => {
    setEditId(sup.id);
    setFormName(sup.name);
    setFormPin(sup.pin);
    setFormRole(sup.role as 'supervisor' | 'admin');
    setView('edit');
  };

  const handleSave = async () => {
    if (!formName.trim() || !formPin.trim()) {
      toast.error('Name and PIN are required');
      return;
    }
    if (formPin.length < 4) {
      toast.error('PIN must be at least 4 characters');
      return;
    }

    setLoading(true);
    try {
      if (editId) {
        await supabase.from('supervisors').update({
          name: formName.trim(),
          pin: formPin,
          role: formRole,
        }).eq('id', editId);
        toast.success('Supervisor updated');
      } else {
        await supabase.from('supervisors').insert({
          name: formName.trim(),
          pin: formPin,
          role: formRole,
        });
        toast.success('Supervisor added');
      }
      await fetchSupervisors();
      setView('list');
      resetForm();
    } catch {
      toast.error('Failed to save');
    } finally {
      setLoading(false);
    }
  };

  const toggleActive = async (sup: Supervisor) => {
    // Prevent deactivating the last active admin
    if (sup.is_active && sup.role === 'admin') {
      const activeAdmins = supervisors.filter(s => s.role === 'admin' && s.is_active);
      if (activeAdmins.length <= 1) {
        toast.error('Cannot deactivate the last active admin');
        return;
      }
    }

    await supabase.from('supervisors').update({ is_active: !sup.is_active }).eq('id', sup.id);
    toast.success(sup.is_active ? `${sup.name} deactivated` : `${sup.name} activated`);
    fetchSupervisors();
  };

  // Auth gate
  if (view === 'auth') {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 bg-background">
        <div className="max-w-sm w-full">
          <div className="flex items-center gap-3 mb-8 justify-center">
            <Shield size={28} className="text-accent" />
            <h1 className="font-display text-2xl font-bold text-foreground">Supervisor Access</h1>
          </div>
          <p className="text-muted-foreground text-sm text-center mb-6">
            Enter admin PIN to manage supervisors
          </p>
          <input
            type="password"
            value={authPin}
            onChange={e => { setAuthPin(e.target.value); setAuthError(false); }}
            maxLength={8}
            className={`w-full h-14 px-4 bg-card border-2 rounded-xl font-display text-2xl text-center tracking-[0.5em] text-foreground focus:outline-none transition-colors ${
              authError ? 'border-accent' : 'border-foreground/10 focus:border-pos-gold'
            }`}
            placeholder="••••"
            autoFocus
            onKeyDown={e => e.key === 'Enter' && handleAuth()}
          />
          {authError && (
            <p className="text-accent text-xs font-display font-semibold mt-2 text-center">
              Invalid admin PIN
            </p>
          )}
          <div className="flex gap-3 mt-6">
            <button onClick={onBack} className="flex-1 h-12 border-2 border-foreground/15 text-foreground/50 rounded-xl font-display font-semibold active:scale-[0.97] transition-transform">
              Back
            </button>
            <button onClick={handleAuth} disabled={!authPin.trim()} className="flex-[2] h-12 bg-pos-gold text-primary rounded-xl font-display font-bold active:scale-[0.97] transition-transform disabled:opacity-30">
              Unlock
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Add / Edit form
  if (view === 'add' || view === 'edit') {
    return (
      <div className="h-full overflow-y-auto p-6 bg-background">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-2 mb-8">
            <button onClick={() => { setView('list'); resetForm(); }} className="text-foreground/40 active:text-foreground p-1">
              <ArrowLeft size={20} />
            </button>
            <h1 className="font-display text-2xl font-bold text-foreground">
              {view === 'add' ? 'Add Supervisor' : 'Edit Supervisor'}
            </h1>
          </div>

          <div className="bg-card rounded-xl border-2 border-foreground/10 p-6 space-y-5">
            <div>
              <label className="font-display text-xs font-semibold text-foreground/60 uppercase tracking-wide">Name *</label>
              <input type="text" value={formName} onChange={e => setFormName(e.target.value)} maxLength={100}
                className="w-full h-12 mt-1 px-4 bg-background border-2 border-foreground/10 rounded-xl font-body text-foreground focus:border-accent focus:outline-none transition-colors"
                placeholder="Supervisor name" autoFocus />
            </div>

            <div>
              <label className="font-display text-xs font-semibold text-foreground/60 uppercase tracking-wide">PIN *</label>
              <div className="flex items-center gap-2 mt-1">
                <input type={showPin ? 'text' : 'password'} value={formPin} onChange={e => setFormPin(e.target.value)} maxLength={8}
                  className="flex-1 h-12 px-4 bg-background border-2 border-foreground/10 rounded-xl font-display text-xl tracking-[0.3em] text-foreground focus:border-accent focus:outline-none transition-colors"
                  placeholder="••••" />
                <button onClick={() => setShowPin(!showPin)} className="h-12 w-12 flex items-center justify-center text-foreground/40 active:text-foreground">
                  {showPin ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <p className="text-xs text-foreground/40 mt-1">Minimum 4 characters</p>
            </div>

            <div>
              <label className="font-display text-xs font-semibold text-foreground/60 uppercase tracking-wide">Role</label>
              <div className="flex gap-2 mt-1">
                <button onClick={() => setFormRole('supervisor')}
                  className={`flex-1 h-12 rounded-xl font-display font-semibold text-sm flex items-center justify-center gap-2 transition-colors border-2 ${
                    formRole === 'supervisor' ? 'bg-primary text-primary-foreground border-primary' : 'bg-foreground/5 text-foreground/60 border-foreground/10'
                  }`}>
                  <Shield size={16} /> Supervisor
                </button>
                <button onClick={() => setFormRole('admin')}
                  className={`flex-1 h-12 rounded-xl font-display font-semibold text-sm flex items-center justify-center gap-2 transition-colors border-2 ${
                    formRole === 'admin' ? 'bg-primary text-primary-foreground border-primary' : 'bg-foreground/5 text-foreground/60 border-foreground/10'
                  }`}>
                  <ShieldCheck size={16} /> Admin
                </button>
              </div>
              <p className="text-xs text-foreground/40 mt-1">Admins can access this management panel</p>
            </div>
          </div>

          <button onClick={handleSave} disabled={loading || !formName.trim() || formPin.length < 4}
            className="w-full mt-6 h-14 bg-pos-gold text-primary rounded-xl font-display font-bold text-lg active:scale-[0.97] transition-transform disabled:opacity-30">
            {loading ? 'Saving...' : view === 'add' ? 'Add Supervisor' : 'Save Changes'}
          </button>
        </div>
      </div>
    );
  }

  // List view
  return (
    <div className="h-full overflow-y-auto p-6 bg-background">
      <div className="max-w-lg mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <button onClick={onBack} className="text-foreground/40 active:text-foreground p-1">
              <ArrowLeft size={20} />
            </button>
            <h1 className="font-display text-2xl font-bold text-foreground">Supervisors</h1>
          </div>
          <button onClick={handleAdd}
            className="h-10 px-4 bg-primary text-primary-foreground rounded-lg font-display font-semibold text-sm flex items-center gap-2 active:scale-[0.97] transition-transform">
            <Plus size={16} /> Add
          </button>
        </div>

        <div className="space-y-3">
          {supervisors.map(sup => (
            <div key={sup.id} className={`bg-card rounded-xl border-2 p-4 flex items-center justify-between ${sup.is_active ? 'border-foreground/10' : 'border-foreground/5 opacity-50'}`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${sup.role === 'admin' ? 'bg-accent/10 text-accent' : 'bg-foreground/5 text-foreground/40'}`}>
                  {sup.role === 'admin' ? <ShieldCheck size={20} /> : <Shield size={20} />}
                </div>
                <div>
                  <p className="font-display font-bold text-sm text-foreground">{sup.name}</p>
                  <p className="text-xs text-foreground/40 capitalize">{sup.role} · PIN: {'•'.repeat(sup.pin.length)}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => handleEdit(sup)}
                  className="h-9 w-9 rounded-lg flex items-center justify-center text-foreground/30 active:text-foreground active:bg-foreground/5 transition-colors">
                  <Pencil size={16} />
                </button>
                <button onClick={() => toggleActive(sup)}
                  className="h-9 w-9 rounded-lg flex items-center justify-center text-foreground/30 active:text-foreground active:bg-foreground/5 transition-colors">
                  {sup.is_active ? <ToggleRight size={20} className="text-pos-gold-dark" /> : <ToggleLeft size={20} />}
                </button>
              </div>
            </div>
          ))}
        </div>

        {supervisors.length === 0 && (
          <div className="text-center py-12 text-foreground/30">
            <Shield size={48} className="mx-auto mb-3" />
            <p className="font-display font-semibold">No supervisors yet</p>
          </div>
        )}

        {/* Admin Settings */}
        <div className="mt-8">
          <h2 className="font-display text-lg font-bold text-foreground mb-4">Settings</h2>
          <ServiceChargeSettings />
        </div>
      </div>
    </div>
  );
};

export default SupervisorManagement;
