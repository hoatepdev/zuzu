import { calculateLineTotal, calculatePoints } from '../src/orders/money';

describe('money rules', () => {
  it('rounds line totals to whole VND and floors loyalty points', () => {
    expect(calculateLineTotal('5.2', '15000').toString()).toBe('78000');
    expect(calculatePoints('78000', 10000)).toBe(7);
  });
});
