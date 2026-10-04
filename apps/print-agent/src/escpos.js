// ESC/POS receipt generation for ZY908 K80 (80mm, ~48 columns).

export function maskPhone(phone) {
  const digits = String(phone ?? '').trim();
  if (!digits) return '';
  if (digits.length < 7) return '*'.repeat(digits.length);
  return `${digits.slice(0, 3)}****${digits.slice(-3)}`;
}

// 'utf8' assumes printer firmware renders UTF-8. 'ascii' folds diacritics
// (Nguyễn -> Nguyen) for units whose code pages mangle Vietnamese.
export function encodeText(text, encoding) {
  if (encoding === 'ascii') {
    return text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D');
  }
  return text;
}

// Greedy word wrap; words longer than width are hard-split.
export function wrap(text, width) {
  const lines = [];
  let line = '';
  for (const word of String(text).split(/\s+/).filter(Boolean)) {
    let rest = word;
    while (rest.length > 0) {
      const room = width - line.length;
      if (rest.length <= room) {
        line = line ? `${line} ${rest}` : rest;
        rest = '';
      } else if (line) {
        lines.push(line);
        line = '';
      } else {
        line = rest.slice(0, width);
        rest = rest.slice(width);
      }
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [''];
}

function vnDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Ho_Chi_Minh',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23'
    })
      .formatToParts(date)
      .map((p) => [p.type, p.value])
  );
  return `${parts.day}/${parts.month}/${parts.year} ${parts.hour}:${parts.minute}`;
}

function qrCommands(data, moduleSize = 6) {
  const payload = Buffer.from(data, 'utf8');
  const len = payload.length + 3;
  return Buffer.concat([
    Buffer.from([0x1d, 0x28, 0x6b, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00]), // model 2
    Buffer.from([0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x43, moduleSize]), // module size
    Buffer.from([0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x45, 0x32]), // error correction M
    Buffer.from([0x1d, 0x28, 0x6b, len & 0xff, (len >> 8) & 0xff, 0x31, 0x50, 0x30, ...payload]),
    Buffer.from([0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x51, 0x30]) // print
  ]);
}

// Returns { text: human-readable preview, data: ESC/POS bytes }.
export function buildReceipt(bill, opts = {}) {
  const width = opts.width ?? 48;
  const encoding = opts.encoding ?? 'utf8';
  const enc = (s) => encodeText(s, encoding);
  const chunks = [];
  const lines = [];
  const out = (buf) => chunks.push(buf);
  const say = (s) => lines.push(s);
  const bytes = (s) => Buffer.from(enc(s), 'utf8');
  const feed = (n = 1) => out(Buffer.from('\n'.repeat(n)));
  const align = (n) => out(Buffer.from([0x1b, 0x61, n]));
  const size = (n) => out(Buffer.from([0x1d, 0x21, n]));
  const bold = (on) => out(Buffer.from([0x1b, 0x45, on ? 1 : 0]));

  out(Buffer.from([0x1b, 0x40])); // init
  bold(true); align(1); size(0x33);
  out(bytes('GIẶT LÀ ZUZU')); feed(2); say('GIẶT LÀ ZUZU'); say('');
  bold(false); size(0x00); align(0);

  const section = (label, value) => {
    out(bytes(`${label}:\n`)); say(`${label}:`);
    for (const seg of wrap(enc(value), width)) {
      out(bytes(seg)); out(Buffer.from('\n')); say(seg);
    }
  };

  say(''); // spacer between title and body
  out(bytes('Mã đơn:\n')); say('Mã đơn:');
  size(0x30); bold(true);
  out(bytes(bill.code)); out(Buffer.from('\n')); say(bill.code);
  size(0x00); bold(false);

  const created = vnDateTime(bill.createdAt);
  if (created) section('Ngày nhận', created);
  if (bill.customerName) section('Khách', bill.customerName);
  if (bill.phone) section('SĐT', maskPhone(bill.phone));
  if (bill.note) section('Lưu ý', bill.note);
  const periodLabel = { MORNING: 'Sáng', AFTERNOON: 'Chiều' }[bill.duePeriod] ?? '';
  if (bill.dueDate || periodLabel) section('Hẹn trả', [bill.dueDate && new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', dateStyle: 'short' }).format(new Date(bill.dueDate)), periodLabel].filter(Boolean).join(' '));
  if (bill.deliveryAddress) section('Giao đến', bill.deliveryAddress);
  if (Array.isArray(bill.services) && bill.services.length) {
    out(bytes('Dịch vụ dự kiến:\n')); say('Dịch vụ dự kiến:');
    for (const service of bill.services) {
      for (const line of wrap(enc(`□ ${service}`), width)) { out(bytes(line)); out(Buffer.from('\n')); say(line); }
    }
  }

  feed(1); say('');
  align(1);
  out(qrCommands(String(bill.code)));
  out(bytes(bill.code)); out(Buffer.from('\n')); say(`[QR] ${bill.code}`);
  feed(1); say('');
  out(bytes('ZUZU')); out(Buffer.from('\n')); say('ZUZU');
  out(bytes('0876 833 068')); out(Buffer.from('\n')); say('0876 833 068');
  feed(3);
  out(Buffer.from([0x1d, 0x56, 0x00])); // cut

  return { text: lines.join('\n'), data: Buffer.concat(chunks) };
}
