import { Prisma } from '@prisma/client';

export function calculateLineTotal(quantity: Prisma.Decimal.Value, price: Prisma.Decimal.Value) {
  return new Prisma.Decimal(quantity).mul(price).toDecimalPlaces(0, Prisma.Decimal.ROUND_HALF_UP);
}

export function calculatePoints(total: Prisma.Decimal.Value, vndPerPoint: number) {
  return new Prisma.Decimal(total).div(vndPerPoint).floor().toNumber();
}
