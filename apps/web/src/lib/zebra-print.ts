declare global {
  interface Window {
    BrowserPrint?: {
      getDefaultDevice: (
        type: string,
        successCallback: (device: ZebraDevice) => void,
        errorCallback: (error: string) => void
      ) => void;
      getLocalDevices: (
        successCallback: (devices: ZebraDevice[]) => void,
        errorCallback: (error: string) => void,
        type?: string
      ) => void;
    };
  }
}

interface ZebraDevice {
  name: string;
  deviceType: string;
  connection: string;
  uid: string;
  provider: string;
  manufacturer: string;
  send: (
    data: string,
    successCallback: () => void,
    errorCallback: (error: string) => void
  ) => void;
  read: (
    successCallback: (data: string) => void,
    errorCallback: (error: string) => void
  ) => void;
}

let cachedDevice: ZebraDevice | null = null;

export async function getZebraPrinter(): Promise<ZebraDevice | null> {
  if (cachedDevice) {
    return cachedDevice;
  }

  if (typeof window === 'undefined' || !window.BrowserPrint) {
    console.warn('Zebra Browser Print not available');
    return null;
  }

  return new Promise((resolve) => {
    window.BrowserPrint!.getDefaultDevice(
      'printer',
      (device) => {
        if (device && device.name) {
          cachedDevice = device;
          resolve(device);
        } else {
          resolve(null);
        }
      },
      (error) => {
        console.error('Zebra Browser Print error:', error);
        resolve(null);
      }
    );
  });
}

export async function printZpl(zpl: string): Promise<boolean> {
  const device = await getZebraPrinter();

  if (!device) {
    console.warn('No Zebra printer found, copying ZPL to clipboard');
    try {
      await navigator.clipboard.writeText(zpl);
      alert('Yazıcı bulunamadı. ZPL panoya kopyalandı.');
    } catch {
      console.error('Could not copy ZPL to clipboard');
    }
    return false;
  }

  return new Promise((resolve) => {
    device.send(
      zpl,
      () => {
        console.log('ZPL sent to printer successfully');
        resolve(true);
      },
      (error) => {
        console.error('Failed to send ZPL to printer:', error);
        resolve(false);
      }
    );
  });
}

export async function getAvailablePrinters(): Promise<ZebraDevice[]> {
  if (typeof window === 'undefined' || !window.BrowserPrint) {
    return [];
  }

  return new Promise((resolve) => {
    window.BrowserPrint!.getLocalDevices(
      (devices) => {
        resolve(devices.filter((d) => d.deviceType === 'printer'));
      },
      (error) => {
        console.error('Failed to get printers:', error);
        resolve([]);
      },
      'printer'
    );
  });
}

export function isZebraBrowserPrintAvailable(): boolean {
  return typeof window !== 'undefined' && !!window.BrowserPrint;
}
