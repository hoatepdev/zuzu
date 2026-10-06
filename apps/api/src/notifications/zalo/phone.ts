export function normalizeZaloPhone(phone: string) {
  const compact = phone.replace(/[\s.()-]/g, '').replace(/-/g, '');
  const normalized = compact.startsWith('+84') ? `0${compact.slice(3)}` : compact.startsWith('84') ? `0${compact.slice(2)}` : compact;
  if (!/^0\d{9}$/.test(normalized)) throw new Error('Số điện thoại Zalo không hợp lệ');
  return normalized;
}

export function maskPhone(phone: string) {
  return phone.length > 6 ? `${phone.slice(0, 3)}***${phone.slice(-3)}` : '***';
}
