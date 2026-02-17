/**
 * Bluetooth Thermal Printer Service
 * Uses Web Bluetooth API (works on Android Chrome / Capacitor WebView)
 * Target: OFFICOM PT-120 via SPP
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Navigator {
    bluetooth?: any;
  }
}

const PRINTER_SERVICE_UUID = '000018f0-0000-1000-8000-00805f9b34fb';
// Some printers use these alternate UUIDs
const ALT_SERVICE_UUID = 'e7810a71-73ae-499d-8c15-faa9aef0c3f2';
const ALT_CHAR_UUID = 'bef8d6c9-9c21-4c9e-b632-bd58c1009f9f';

const SAVED_PRINTER_KEY = 'fwc_printer_mac';
const CHUNK_SIZE = 512; // bytes per write
const CHUNK_DELAY = 50; // ms between chunks

export interface PrinterStatus {
  connected: boolean;
  deviceName: string | null;
  error: string | null;
}

type StatusCallback = (status: PrinterStatus) => void;

class BluetoothPrinterService {
  private device: any = null;
  private characteristic: any = null;
  private statusCallbacks: Set<StatusCallback> = new Set();
  private _status: PrinterStatus = { connected: false, deviceName: null, error: null };

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
    return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
  }

  /**
   * Scan for and connect to a thermal printer
   */
  async connect(): Promise<boolean> {
    if (!this.isSupported()) {
      this.updateStatus({ error: 'Bluetooth not supported in this browser' });
      return false;
    }

    try {
      this.updateStatus({ error: null });

      // Request device with printer-like filters
      const device = await navigator.bluetooth.requestDevice({
        filters: [
          { namePrefix: 'PT' },
          { namePrefix: 'Printer' },
          { namePrefix: 'POS' },
          { namePrefix: 'OFFICOM' },
        ],
        optionalServices: [PRINTER_SERVICE_UUID, ALT_SERVICE_UUID],
      });

      if (!device) {
        this.updateStatus({ error: 'No device selected' });
        return false;
      }

      this.device = device;
      device.addEventListener('gattserverdisconnected', () => {
        this.updateStatus({ connected: false, error: 'Printer disconnected' });
        this.characteristic = null;
      });

      const connected = await this.connectToDevice(device);
      if (connected) {
        // Save for auto-reconnect
        localStorage.setItem(SAVED_PRINTER_KEY, device.id);
        this.updateStatus({ connected: true, deviceName: device.name || 'Unknown Printer', error: null });
      }
      return connected;
    } catch (err: any) {
      const msg = err?.message || 'Failed to connect';
      this.updateStatus({ error: msg.includes('cancelled') ? null : msg });
      return false;
    }
  }

  private async connectToDevice(device: any): Promise<boolean> {
    try {
      const server = await device.gatt?.connect();
      if (!server) return false;

      // Try primary service UUID, then alternate
      let service: any = null;
      try {
        service = await server.getPrimaryService(PRINTER_SERVICE_UUID);
      } catch {
        try {
          service = await server.getPrimaryService(ALT_SERVICE_UUID);
        } catch {
          // Try getting all services
          const services = await server.getPrimaryServices();
          if (services.length > 0) service = services[0];
        }
      }

      if (!service) {
        this.updateStatus({ error: 'Printer service not found' });
        return false;
      }

      // Find writable characteristic
      const chars = await service.getCharacteristics();
      for (const char of chars) {
        if (char.properties.write || char.properties.writeWithoutResponse) {
          this.characteristic = char;
          return true;
        }
      }

      this.updateStatus({ error: 'No writable characteristic found' });
      return false;
    } catch (err: any) {
      this.updateStatus({ error: err?.message || 'Connection failed' });
      return false;
    }
  }

  /**
   * Attempt silent reconnection to previously paired printer
   */
  async autoReconnect(): Promise<boolean> {
    const savedId = localStorage.getItem(SAVED_PRINTER_KEY);
    if (!savedId || !this.isSupported()) return false;

    try {
      // Web Bluetooth doesn't support reconnection without user gesture
      // This is a limitation - auto-reconnect only works with native plugins
      return false;
    } catch {
      return false;
    }
  }

  /**
   * Send raw bytes to printer in chunks
   */
  async sendBytes(data: Uint8Array): Promise<boolean> {
    if (!this.characteristic) {
      this.updateStatus({ error: 'Printer not connected' });
      return false;
    }

    try {
      // Send in chunks to avoid buffer overflow
      for (let offset = 0; offset < data.length; offset += CHUNK_SIZE) {
        const chunk = data.slice(offset, offset + CHUNK_SIZE);
        if (this.characteristic.properties.writeWithoutResponse) {
          await this.characteristic.writeValueWithoutResponse(chunk);
        } else {
          await this.characteristic.writeValue(chunk);
        }
        if (offset + CHUNK_SIZE < data.length) {
          await new Promise(resolve => setTimeout(resolve, CHUNK_DELAY));
        }
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
  disconnect() {
    if (this.device?.gatt?.connected) {
      this.device.gatt.disconnect();
    }
    this.device = null;
    this.characteristic = null;
    this.updateStatus({ connected: false, deviceName: null, error: null });
  }

  /**
   * Send test print
   */
  async testPrint(): Promise<boolean> {
    const encoder = new TextEncoder();
    const testData = encoder.encode(
      '\x1b\x40' + // Init
      '\x1b\x61\x01' + // Center
      '*** TEST PRINT ***\n' +
      'Alignment OK\n' +
      'Printer OK\n' +
      '\n\n\n' +
      '\x1d\x56\x01' // Cut
    );
    return this.sendBytes(testData);
  }
}

// Singleton instance
export const bluetoothPrinter = new BluetoothPrinterService();
