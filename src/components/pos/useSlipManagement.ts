/**
 * Slip Management Hook — day-close state, slip queries
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface DayCloseState {
  isClosed: boolean;
  closedBy?: string;
  closedAt?: string;
}

export function useSlipManagement(branchId: string = 'QC01') {
  const [dayClose, setDayClose] = useState<DayCloseState>({ isClosed: false });
  const [loading, setLoading] = useState(true);

  // Check day-close status on mount
  useEffect(() => {
    checkDayClose();
  }, [branchId]);

  const checkDayClose = useCallback(async () => {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const { data } = await supabase
        .from('day_close_log')
        .select('*')
        .eq('branch_id', branchId)
        .eq('close_date', today)
        .eq('is_reopened', false)
        .order('created_at', { ascending: false })
        .limit(1) as any;

      if (data && data.length > 0) {
        setDayClose({
          isClosed: true,
          closedBy: data[0].closed_by,
          closedAt: data[0].created_at,
        });
      } else {
        setDayClose({ isClosed: false });
      }
    } catch (err) {
      console.error('Failed to check day close:', err);
    } finally {
      setLoading(false);
    }
  }, [branchId]);

  const closeDay = useCallback(async (supervisorName: string) => {
    try {
      const { error } = await supabase.from('day_close_log').insert({
        branch_id: branchId,
        closed_by: supervisorName,
        close_date: new Date().toISOString().slice(0, 10),
      } as any);

      if (error) throw error;

      setDayClose({
        isClosed: true,
        closedBy: supervisorName,
        closedAt: new Date().toISOString(),
      });
      toast.success('Day closed successfully');
      return true;
    } catch (err) {
      console.error('Failed to close day:', err);
      toast.error('Failed to close day');
      return false;
    }
  }, [branchId]);

  const reopenDay = useCallback(async (supervisorName: string) => {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const { error } = await supabase
        .from('day_close_log')
        .update({
          is_reopened: true,
          reopened_by: supervisorName,
          reopened_at: new Date().toISOString(),
        } as any)
        .eq('branch_id', branchId)
        .eq('close_date', today)
        .eq('is_reopened', false);

      if (error) throw error;

      setDayClose({ isClosed: false });
      toast.success('Day reopened');
      return true;
    } catch (err) {
      console.error('Failed to reopen day:', err);
      toast.error('Failed to reopen day');
      return false;
    }
  }, [branchId]);

  return { dayClose, loading, checkDayClose, closeDay, reopenDay };
}
