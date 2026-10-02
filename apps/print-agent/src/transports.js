import net from 'node:net';

// PrinterTransport: { health(): Promise<boolean>, write(data: Buffer, preview: string): Promise<void> }

export function createTransport(env = process.env) {
  switch (String(env.PRINTER_CONNECTION ?? 'console').toLowerCase()) {
    case 'usb':
      return usbTransport(env);
    case 'tcp':
      return tcpTransport(env);
    default:
      return consoleTransport();
  }
}

export function consoleTransport() {
  return {
    async health() {
      return true;
    },
    async write(_data, preview) {
      console.log(`[print-agent:console]\n${preview}\n`);
    }
  };
}

export function tcpTransport(env) {
  const host = env.PRINTER_HOST ?? '192.168.1.100';
  const port = Number(env.PRINTER_PORT ?? 9100);
  const timeoutMs = Number(env.PRINTER_TIMEOUT_MS ?? 5000);
  const connect = (onOpen) =>
    new Promise((resolve, reject) => {
      const socket = net.connect({ host, port });
      socket.setTimeout(timeoutMs);
      socket.on('connect', () => onOpen(socket, resolve, reject));
      socket.on('timeout', () => {
        socket.destroy();
        reject(new Error('Máy in không phản hồi'));
      });
      socket.on('error', () => reject(new Error('Máy in đang ngoại tuyến')));
    });
  return {
    health() {
      return new Promise((resolve) => {
        const socket = net.connect({ host, port });
        socket.setTimeout(1500);
        socket.on('connect', () => {
          socket.destroy();
          resolve(true);
        });
        socket.on('timeout', () => {
          socket.destroy();
          resolve(false);
        });
        socket.on('error', () => resolve(false));
      });
    },
    write(data) {
      return connect((socket, resolve, _reject) => socket.end(data, () => resolve()));
    }
  };
}

let usbModule;
async function loadUsb() {
  if (!usbModule) usbModule = await import('usb');
  return usbModule.usb ?? usbModule.default?.usb;
}

const parseId = (value) => {
  const n = Number.parseInt(String(value ?? '').replace(/^0x/i, ''), 16);
  return Number.isNaN(n) ? undefined : n;
};

export function usbTransport(env) {
  const vendorId = parseId(env.PRINTER_VENDOR_ID);
  const productId = parseId(env.PRINTER_PRODUCT_ID);
  const openDevice = async () => {
    if (vendorId === undefined || productId === undefined) {
      throw new Error('Cấu hình thiếu PRINTER_VENDOR_ID / PRINTER_PRODUCT_ID');
    }
    const usb = await loadUsb();
    const device = usb.findByIds(vendorId, productId);
    if (!device) throw new Error('USB device not found');
    device.open();
    return device;
  };
  return {
    async health() {
      try {
        const device = await openDevice();
        device.close();
        return true;
      } catch {
        return false;
      }
    },
    async write(data) {
      let device;
      try {
        device = await openDevice();
      } catch (error) {
        console.error(`[print-agent] usb open failed: ${error.message}`);
        throw new Error('Không kết nối được máy in ZY908');
      }
      try {
        for (const iface of device.interfaces) {
          const endpoint = iface.endpoints.find((e) => e.direction === 'out');
          if (!endpoint) continue;
          iface.claim();
          try {
            await endpoint.transfer(data);
          } finally {
            iface.release(true);
          }
          return;
        }
        throw new Error('no OUT endpoint');
      } catch (error) {
        console.error(`[print-agent] usb write failed: ${error.message}`);
        throw new Error('Không kết nối được máy in ZY908');
      } finally {
        device.close();
      }
    }
  };
}
