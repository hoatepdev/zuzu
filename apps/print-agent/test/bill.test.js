import test from 'node:test';
import assert from 'node:assert/strict';
import { buildReceipt, maskPhone, wrap } from '../src/escpos.js';

const bill = {
  code: 'ZU-0125',
  createdAt: '2026-10-02T07:45:00.000Z',
  customerName: 'Nguyễn Lan',
  phone: '0987654321',
  note: 'Ít thơm'
};

test('maskPhone hides middle digits', () => {
  assert.equal(maskPhone('0987654321'), '098****321');
  assert.equal(maskPhone('02438221122'), '024****122');
  assert.equal(maskPhone('123'), '***');
  assert.equal(maskPhone(undefined), '');
});

test('wrap breaks long text within width and keeps content', () => {
  const long = 'Nguyễn Thị Mỹ Dung Ngọc Lan Hương Phượng Hoàng Thảo Kiều Trinh Thanh Mai Anh';
  const lines = wrap(long, 48);
  for (const line of lines) assert.ok(line.length <= 48);
  assert.equal(lines.join(' '), long);
  assert.deepEqual(wrap('a'.repeat(100), 48), ['a'.repeat(48), 'a'.repeat(48), 'a'.repeat(4)]);
});

test('bill contains title, code, masked phone, VN date, QR and cut', () => {
  const { text, data } = buildReceipt(bill);
  const hex = data.toString('hex');
  assert.ok(text.includes('GIẶT LÀ ZUZU'));
  assert.ok(text.includes('ZU-0125'));
  assert.ok(text.includes('098****321'));
  assert.ok(!text.includes('0987654321'), 'must not print full phone');
  assert.ok(text.includes('02/10/2026 14:45'), 'UTC+7 date');
  assert.ok(text.includes('Nguyễn Lan'));
  assert.ok(text.includes('Ít thơm'));
  assert.ok(text.includes('ZUZU'));
  assert.ok(text.includes('0876 833 068'));
  assert.ok(hex.includes('1d286b'), 'printer-native QR command');
  assert.ok(hex.includes(Buffer.from('ZU-0125').toString('hex')), 'QR payload is exactly the code');
  assert.ok(hex.endsWith('1d5600'), 'auto-cut at the end');
});

test('bill omits missing optional sections', () => {
  const { text } = buildReceipt({ code: 'ZU-0001' });
  assert.ok(!text.includes('Ngày nhận:'));
  assert.ok(!text.includes('Khách:'));
  assert.ok(!text.includes('SĐT:'));
  assert.ok(!text.includes('Lưu ý:'));
  assert.ok(text.includes('ZU-0001'));
});

test('bill wraps long Vietnamese content to 48 columns', () => {
  const longName = 'Nguyễn Thị Mỹ Dung Ngọc Lan Hương Phượng Hoàng Thảo Kiều Trinh Thanh Mai Anh';
  const longNote = 'áo trắng giặt tay không dùng chất tẩy mạnh tránh phai màu vải lụa cổ tay áo khoác ngoài';
  const { text } = buildReceipt({ code: 'ZU-0002', customerName: longName, note: longNote });
  for (const line of text.split('\n')) assert.ok(Array.from(line).length <= 48, `line too long: ${line}`);
  assert.ok(text.split('\n').filter((l) => l === longName).length === 0, 'long name must be wrapped');
});

test('ascii encoding folds Vietnamese diacritics', () => {
  const { text, data } = buildReceipt(bill, { encoding: 'ascii' });
  assert.ok(text.includes('Nguyen Lan'));
  assert.ok(text.includes('It thom'));
  assert.ok(!text.includes('Nguyễn'));
  assert.ok(!data.includes(Buffer.from('Nguyễn')));
});
