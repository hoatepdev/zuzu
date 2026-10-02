import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { CreateExpenseDto, ListExpensesDto, UpdateExpenseDto } from './expenses.dto';

const include = { createdBy: { select: { id: true, name: true } }, voidedBy: { select: { id: true, name: true } } };
@Injectable()
export class ExpensesService {
  constructor(private readonly prisma: PrismaService) {}
  async create(dto: CreateExpenseDto, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const shift = await tx.shift.findFirst({ where: { closedAt: null }, select: { id: true } });
      const expense = await tx.expense.create({ data: { amount: dto.amount, category: dto.category, description: dto.description, expenseDate: new Date(dto.expenseDate), paymentMethod: dto.paymentMethod, receiptUrl: dto.receiptUrl, createdById: userId, shiftId: shift?.id }, include });
      await tx.auditLog.create({ data: { userId, action: 'EXPENSE_CREATED', entityType: 'EXPENSE', entityId: expense.id, after: { amount: expense.amount.toString(), category: expense.category, paymentMethod: expense.paymentMethod, shiftId: expense.shiftId } } });
      return expense;
    });
  }
  async list(query: ListExpensesDto) {
    const where: Prisma.ExpenseWhereInput = { category: query.category, paymentMethod: query.paymentMethod, voidedAt: query.includeVoided ? undefined : null, expenseDate: query.from || query.to ? { gte: query.from ? new Date(query.from) : undefined, lte: query.to ? new Date(query.to) : undefined } : undefined };
    const [items, total] = await Promise.all([this.prisma.expense.findMany({ where, include, orderBy: { expenseDate: 'desc' }, skip: (query.page - 1) * query.limit, take: query.limit }), this.prisma.expense.count({ where })]);
    return { items, total, page: query.page, limit: query.limit };
  }
  async update(id: string, dto: UpdateExpenseDto, userId: string) {
    const current = await this.prisma.expense.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Không tìm thấy khoản chi');
    if (current.voidedAt) throw new BadRequestException('Khoản chi đã bị huỷ');
    return this.prisma.$transaction(async (tx) => {
      const expense = await tx.expense.update({ where: { id }, data: { ...dto, expenseDate: dto.expenseDate ? new Date(dto.expenseDate) : undefined }, include });
      await tx.auditLog.create({ data: { userId, action: 'EXPENSE_UPDATED', entityType: 'EXPENSE', entityId: id, before: { amount: current.amount.toString(), category: current.category, description: current.description }, after: { amount: expense.amount.toString(), category: expense.category, description: expense.description } } });
      return expense;
    });
  }
  async void(id: string, reason: string, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const claimed = await tx.expense.updateMany({ where: { id, voidedAt: null }, data: { voidedAt: new Date(), voidedById: userId, voidReason: reason } });
      if (!claimed.count) throw new BadRequestException('Khoản chi không tồn tại hoặc đã bị huỷ');
      const expense = await tx.expense.findUniqueOrThrow({ where: { id }, include });
      await tx.auditLog.create({ data: { userId, action: 'EXPENSE_VOIDED', entityType: 'EXPENSE', entityId: id, before: { voidedAt: null }, after: { voidedAt: expense.voidedAt?.toISOString(), reason } } });
      return expense;
    });
  }
}
