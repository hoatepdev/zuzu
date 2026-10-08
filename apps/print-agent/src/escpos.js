// ESC/POS receipt generation for ZY908 K80 (80mm, ~48 columns).

export function maskPhone(phone) {
  const digits = String(phone ?? "").trim();
  if (!digits) return "";
  if (digits.length < 7) return "*".repeat(digits.length);
  return `${digits.slice(0, 3)}****${digits.slice(-3)}`;
}

// 'utf8' assumes printer firmware renders UTF-8. 'ascii' folds diacritics
// (Nguyễn -> Nguyen) for units whose code pages mangle Vietnamese.
export function encodeText(text, encoding) {
  if (encoding === "ascii") {
    return text
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/Đ/g, "D");
  }
  return text;
}

// Greedy word wrap; words longer than width are hard-split.
export function wrap(text, width) {
  const lines = [];
  let line = "";
  for (const word of String(text).split(/\s+/).filter(Boolean)) {
    let rest = word;
    while (rest.length > 0) {
      const room = width - Array.from(line).length;
      if (Array.from(rest).length <= room) {
        line = line ? `${line} ${rest}` : rest;
        rest = "";
      } else if (line) {
        lines.push(line);
        line = "";
      } else {
        const chars = Array.from(rest);
        line = chars.slice(0, width).join("");
        rest = chars.slice(width).join("");
      }
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

function vnDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Ho_Chi_Minh",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(date)
      .map((p) => [p.type, p.value]),
  );
  return `${parts.day}/${parts.month}/${parts.year} ${parts.hour}:${parts.minute}`;
}

function qrCommands(data, moduleSize = 6) {
  const payload = Buffer.from(data, "utf8");
  const len = payload.length + 3;
  return Buffer.concat([
    Buffer.from([0x1d, 0x28, 0x6b, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00]), // model 2
    Buffer.from([0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x43, moduleSize]), // module size
    Buffer.from([0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x45, 0x32]), // error correction M
    Buffer.from([
      0x1d,
      0x28,
      0x6b,
      len & 0xff,
      (len >> 8) & 0xff,
      0x31,
      0x50,
      0x30,
      ...payload,
    ]),
    Buffer.from([0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x51, 0x30]), // print
  ]);
}

// Returns { text: human-readable preview, data: ESC/POS bytes }.
export function buildReceipt(bill, opts = {}) {
  const width = opts.width ?? 48;
  const encoding = opts.encoding ?? "utf8";
  const enc = (s) => encodeText(String(s ?? ""), encoding);
  const chunks = [];
  const lines = [];
  const out = (buf) => chunks.push(buf);
  const say = (s) => lines.push(s);
  const feed = (n = 1) => out(Buffer.from("\n".repeat(n)));
  const align = (n) => out(Buffer.from([0x1b, 0x61, n]));
  const size = (n) => out(Buffer.from([0x1d, 0x21, n]));
  const bold = (on) => out(Buffer.from([0x1b, 0x45, on ? 1 : 0]));
  const newline = () => out(Buffer.from("\n"));
  const line = (value = "") => {
    const rendered = enc(value);
    const renderedLines = [];
    for (const wrappedLine of wrap(rendered, width)) {
      const chars = Array.from(wrappedLine);
      for (let offset = 0; offset < chars.length; offset += width) {
        renderedLines.push(chars.slice(offset, offset + width).join(""));
      }
    }
    for (const renderedLine of renderedLines.length ? renderedLines : [""]) {
      out(Buffer.from(renderedLine, "utf8"));
      newline();
      say(renderedLine);
    }
  };
  const divider = (char = "-") => line(char.repeat(width));
  const heading = (value) => {
    bold(true);
    line(value);
    bold(false);
  };
  const field = (label, value) => {
    const prefix = `${label}:`;
    const indent = " ".repeat(Array.from(prefix).length + 1);
    const available = Math.max(8, width - Array.from(prefix).length - 1);
    const values = wrap(enc(value), available);
    line(`${prefix} ${values[0]}`);
    for (const valueLine of values.slice(1)) line(`${indent}${valueLine}`);
  };

  out(Buffer.from([0x1b, 0x40])); // init

  // Compact centered header for the narrow receipt.
  align(1);
  bold(true);
  size(0x11);
  line("GIẶT LÀ ZUZU");
  size(0x00);
  bold(false);
  line("0876 833 068");
  line("PHIẾU NHẬN ĐỒ");
  feed(1);

  align(0);
  divider("=");
  heading("MÃ ĐƠN");
  align(1);
  size(0x11);
  bold(true);
  line(bill.code);
  size(0x00);
  bold(false);
  align(0);
  divider("=");

  const created = vnDateTime(bill.createdAt);
  const periodLabel =
    { MORNING: "Sáng", AFTERNOON: "Chiều" }[bill.duePeriod] ?? "";
  if (
    created ||
    bill.customerName ||
    bill.phone ||
    bill.note ||
    bill.dueDate ||
    periodLabel ||
    bill.deliveryAddress
  ) {
    heading("THÔNG TIN KHÁCH");
    if (created) field("Ngày nhận", created);
    if (bill.customerName) field("Khách", bill.customerName);
    if (bill.phone) field("SĐT", maskPhone(bill.phone));
    if (bill.dueDate || periodLabel)
      field(
        "Hẹn trả",
        [
          bill.dueDate &&
            new Intl.DateTimeFormat("vi-VN", {
              timeZone: "Asia/Ho_Chi_Minh",
              dateStyle: "short",
            }).format(new Date(bill.dueDate)),
          periodLabel,
        ]
          .filter(Boolean)
          .join(" "),
      );
    if (bill.note) field("Lưu ý", bill.note);
    if (bill.deliveryAddress) field("Giao đến", bill.deliveryAddress);
    divider("-");
  }

  if (Array.isArray(bill.services) && bill.services.length) {
    heading("Dịch vụ dự kiến:");
    for (const service of bill.services) {
      for (const serviceLine of wrap(enc(`[ ] ${service}`), width))
        line(serviceLine);
    }
    divider("-");
  }

  heading("CHECKLIST");
  line("[ ] Giặt, xả");
  line("[ ] Ủ thơm");
  line("[ ] Sấy, gấp");
  divider("-");

  // Keep the printer-native QR payload exactly equal to the order code.
  feed(1);
  align(1);
  bold(true);
  line("QUÉT ĐỂ TRA ĐƠN");
  bold(false);
  out(qrCommands(String(bill.code)));
  newline();
  say(`[QR] ${bill.code}`);
  size(0x11);
  bold(true);
  line(bill.code);
  size(0x00);
  bold(false);
  feed(1);

  line("CẢM ƠN QUÝ KHÁCH");
  line("HẸN GẶP LẠI");
  feed(3);
  out(Buffer.from([0x1d, 0x56, 0x00])); // cut

  return { text: lines.join("\n"), data: Buffer.concat(chunks) };
}
