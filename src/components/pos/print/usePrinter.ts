/**
 * React hook for printer state management
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { bluetoothPrinter, PrinterStatus } from './bluetoothPrinter';
import { printQueue, PrintJob } from './printQueue';
import { buildReceiptBytes, ReceiptData } from './escpos';
import { downloadReceiptImage } from './pdfReceipt';

const SETTINGS_KEY = 'fwc_printer_settings';

export interface PrinterSettings {
  autoPrint: boolean;
  copies: number;
}

const DEFAULT_SETTINGS: PrinterSettings = {
  autoPrint: false,
  copies: 3,
};

function loadSettings(): PrinterSettings {
  try {
    const saved = localStorage.getItem(SETTINGS_KEY);
    if (saved) return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
  } catch {}
  return { ...DEFAULT_SETTINGS };
}

function saveSettings(settings: PrinterSettings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function usePrinter() {
  const [status, setStatus] = useState<PrinterStatus>(bluetoothPrinter.status);
  const [jobs, setJobs] = useState<PrintJob[]>([]);
  const [settings, setSettingsState] = useState<PrinterSettings>(loadSettings);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  useEffect(() => {
    const unsub1 = bluetoothPrinter.onStatusChange(setStatus);
    const unsub2 = printQueue.onQueueChange(setJobs);

    // Attempt auto-reconnect on mount
    bluetoothPrinter.autoReconnect();

    return () => { unsub1(); unsub2(); };
  }, []);

  const connect = useCallback(async () => {
    return bluetoothPrinter.connect();
  }, []);

  const disconnect = useCallback(() => {
    bluetoothPrinter.disconnect();
  }, []);

  const testPrint = useCallback(async () => {
    return bluetoothPrinter.testPrint();
  }, []);

  const updateSettings = useCallback((partial: Partial<PrinterSettings>) => {
    setSettingsState(prev => {
      const next = { ...prev, ...partial };
      saveSettings(next);
      return next;
    });
  }, []);

  /**
   * Print a receipt (thermal + share/save PNG)
   */
  const printReceipt = useCallback(async (data: ReceiptData) => {
    const currentSettings = settingsRef.current;

    // Always share/save PNG
    try {
      await downloadReceiptImage(data);
    } catch (err) {
      console.warn('Share/save failed:', err);
    }

    // Thermal print if connected
    if (bluetoothPrinter.status.connected) {
      const bytes = buildReceiptBytes(data);
      printQueue.enqueue(bytes, currentSettings.copies);
    }
  }, []);

  /**
   * Manual print trigger (ignores autoPrint setting)
   */
  const manualPrint = useCallback((data: ReceiptData) => {
    if (!bluetoothPrinter.status.connected) {
      downloadReceiptImage(data);
      return;
    }
    const bytes = buildReceiptBytes(data);
    printQueue.enqueue(bytes, settingsRef.current.copies);
  }, []);

  return {
    status,
    jobs,
    settings,
    connect,
    disconnect,
    testPrint,
    updateSettings,
    printReceipt,
    manualPrint,
    isSupported: bluetoothPrinter.isSupported(),
  };
}
