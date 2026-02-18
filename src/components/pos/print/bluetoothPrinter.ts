/**
 * Bluetooth Thermal Printer Service
 * Uses Capacitor SPP plugin on native Android, Web Bluetooth as fallback
 * Target: OFFICOM PT-120 via SPP (Classic Bluetooth)
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Navigator {
    bluetooth?: any;
  }
}
import { Capacitor } from '@capacitor/core';

const SAVED_PRINTER_KEY = 'fwc_printer_address';

export interface PrinterStatus {
  connected: boolean;
  deviceName: string | null;
  error: string | null;
}

type StatusCallback = (status: PrinterStatus) => void;

/**
 * Dynamically import the Capacitor SPP plugin only on native
 */
async function getSppPlugin() {
  try {
    const mod = await import('@kduma-autoid/capacitor-bluetooth-printer');
    return mod.BluetoothPrinter;
  } catch {
    return null;
  }
}

class BluetoothPrinterService {
  private statusCallbacks: Set<StatusCallback> = new Set();
  private _status: PrinterStatus = { connected: false, deviceName: null, error: null };
  private connectedAddress: string | null = null;

  get status(): PrinterStatus {
    return { ...this._status };
  }

  onStatusChange(cb: StatusCallback): () => void {
    this.statusCallbacks.add(cb);
    return () => this.statusCallbacks.delete(cb);
  }

  private updateStatus(partial: Partial<PrinterStatus>) {
    this._status = { ...this._status, ...partial };
    this.statusCallbacks.forEach(cb => cb(this._status));
  }

  isSupported(): boolean {
    // On native Android, always supported via SPP
    if (Capacitor.isNativePlatform()) return true;
    // On web, check Web Bluetooth
    return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
  }

  isNative(): boolean {
    return Capacitor.isNativePlatform();
  }

  /**
   * Scan for and connect to a thermal printer
   */
  async connect(): Promise<boolean> {
    if (this.isNative()) {
      return this.connectNative();
    }
    return this.connectWebBluetooth();
  }

  // ─── Native SPP Flow ────────────────────────────────────

  private async connectNative(): Promise<boolean> {
    try {
      this.updateStatus({ error: null });
      const plugin = await getSppPlugin();
      if (!plugin) {
        this.updateStatus({ error: 'Bluetooth printer plugin not available' });
        return false;
      }

      // List paired Bluetooth devices
      const result = await plugin.list();
      const devices = result.devices || [];

      if (devices.length === 0) {
        this.updateStatus({ error: 'No paired printers found. Pair the printer in Android Bluetooth settings first.' });
        return false;
      }

      // Try saved printer first, then first available
      const savedAddr = localStorage.getItem(SAVED_PRINTER_KEY);
      let target = devices.find((d: any) => d.address === savedAddr);
      if (!target) target = devices[0];

      console.log('[BT-SPP] Connecting to:', target.name, target.address);
      await plugin.connect({ address: target.address });

      this.connectedAddress = target.address;
      localStorage.setItem(SAVED_PRINTER_KEY, target.address);
      this.updateStatus({
        connected: true,
        deviceName: target.name || target.address,
        error: null,
      });
      console.log('[BT-SPP] Connected successfully');
      return true;
    } catch (err: any) {
      console.error('[BT-SPP] Connection error:', err);
      this.updateStatus({ error: err?.message || 'Failed to connect' });
      return false;
    }
  }

  // ─── Web Bluetooth Flow (fallback) ──────────────────────

  private webDevice: any = null;
  private webCharacteristic: any = null;

  private async connectWebBluetooth(): Promise<boolean> {
    if (!navigator.bluetooth) {
      this.updateStatus({ error: 'Bluetooth not supported in this browser' });
      return false;
    }

    try {
      this.updateStatus({ error: null });

      const device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [
          '000018f0-0000-1000-8000-00805f9b34fb',
          '0000ff00-0000-1000-8000-00805f9b34fb',
          'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
          '49535343-fe7d-4ae5-8fa9-9fafd205e455',
        ],
      });

      if (!device) {
        this.updateStatus({ error: 'No device selected' });
        return false;
      }

      this.webDevice = device;
      device.addEventListener('gattserverdisconnected', () => {
        this.updateStatus({ connected: false, error: 'Printer disconnected' });
        this.webCharacteristic = null;
      });

      const server = await device.gatt?.connect();
      if (!server) return false;

      // Discover services
      const services = await server.getPrimaryServices();
      let characteristic: any = null;

      for (const service of services) {
        const chars = await service.getCharacteristics();
        for (const c of chars) {
          if (c.properties.write) {
            characteristic = c;
            break;
          }
          if (!characteristic && c.properties.writeWithoutResponse) {
            characteristic = c;
          }
        }
        if (characteristic?.properties?.write) break;
      }

      if (!characteristic) {
        this.updateStatus({ error: 'No writable characteristic found' });
        return false;
      }

      this.webCharacteristic = characteristic;
      this.updateStatus({ connected: true, deviceName: device.name || 'Unknown Printer', error: null });
      return true;
    } catch (err: any) {
      const msg = err?.message || 'Failed to connect';
      this.updateStatus({ error: msg.includes('cancelled') ? null : msg });
      return false;
    }
  }

  /**
   * Send raw bytes to printer
   */
  async sendBytes(data: Uint8Array): Promise<boolean> {
    if (this.isNative()) {
      return this.sendBytesNative(data);
    }
    return this.sendBytesWeb(data);
  }

  private async sendBytesNative(data: Uint8Array): Promise<boolean> {
    try {
      const plugin = await getSppPlugin();
      if (!plugin) return false;

      // Convert Uint8Array to string for the SPP plugin
      const decoder = new TextDecoder('latin1');
      const str = decoder.decode(data);
      await plugin.print({ data: str });
      console.log('[BT-SPP] Print data sent, bytes:', data.length);
      return true;
    } catch (err: any) {
      console.error('[BT-SPP] Print error:', err);
      this.updateStatus({ error: err?.message || 'Print failed' });
      return false;
    }
  }

  private async sendBytesWeb(data: Uint8Array): Promise<boolean> {
    if (!this.webCharacteristic) {
      this.updateStatus({ error: 'Printer not connected' });
      return false;
    }

    try {
      const CHUNK = 20;
      const DELAY = 80;
      for (let offset = 0; offset < data.length; offset += CHUNK) {
        const chunk = data.slice(offset, offset + CHUNK);
        if (this.webCharacteristic.properties.write) {
          await this.webCharacteristic.writeValue(chunk);
        } else {
          await this.webCharacteristic.writeValueWithoutResponse(chunk);
        }
        await new Promise(resolve => setTimeout(resolve, DELAY));
      }
      return true;
    } catch (err: any) {
      this.updateStatus({ error: err?.message || 'Print failed' });
      return false;
    }
  }

  /**
   * Disconnect from printer
   */
  async disconnect() {
    if (this.isNative()) {
      try {
        const plugin = await getSppPlugin();
        await plugin?.disconnect();
      } catch { /* ignore */ }
      this.connectedAddress = null;
    } else {
      if (this.webDevice?.gatt?.connected) {
        this.webDevice.gatt.disconnect();
      }
      this.webDevice = null;
      this.webCharacteristic = null;
    }
    this.updateStatus({ connected: false, deviceName: null, error: null });
  }

  /**
   * Attempt silent reconnection to previously paired printer
   */
  async autoReconnect(): Promise<boolean> {
    if (!this.isNative()) return false;
    const savedAddr = localStorage.getItem(SAVED_PRINTER_KEY);
    if (!savedAddr) return false;

    try {
      const plugin = await getSppPlugin();
      if (!plugin) return false;
      await plugin.connect({ address: savedAddr });
      this.connectedAddress = savedAddr;
      this.updateStatus({ connected: true, deviceName: savedAddr, error: null });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Send test print
   */
  async testPrint(): Promise<boolean> {
    const encoder = new TextEncoder();
    const testData = encoder.encode(
      '\x1b\x40' +       // Init
      '\x1b\x61\x01' +   // Center
      '*** TEST PRINT ***\n' +
      'Alignment OK\n' +
      'Printer OK\n' +
      '\n\n\n' +
      '\x1d\x56\x01'     // Cut
    );
    return this.sendBytes(testData);
  }
}

// Singleton instance
export const bluetoothPrinter = new BluetoothPrinterService();
