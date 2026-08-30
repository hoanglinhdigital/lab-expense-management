import { z } from "zod";

import { withAuth } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { parseQuery } from "@/lib/api/validation";
import { prisma } from "@/lib/prisma";
import { toAmountString, toDecimal, ZERO } from "@/lib/domain/decimal";
import { TransactionType } from "@/generated/prisma/enums";

const querySchema = z.object({
  // Tháng cần tổng hợp, định dạng `YYYY-MM`.
  month: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "month phải có định dạng YYYY-MM."),
});

/** Đầu tháng (UTC) và đầu tháng kế tiếp, dùng làm khoảng `[gte, lt)`. */
function monthRange(month: string): { start: Date; end: Date } {
  const [year, mon] = month.split("-").map(Number);
  const start = new Date(Date.UTC(year, mon - 1, 1));
  const end = new Date(Date.UTC(year, mon, 1));
  return { start, end };
}

export const GET = withAuth(async (request, user) => {
  const { month } = parseQuery(request.nextUrl, querySchema);
  const { start, end } = monthRange(month);

  const rows = await prisma.transaction.groupBy({
    by: ["type"],
    where: {
      userId: user.id,
      isDeleted: false,
      type: { in: [TransactionType.INCOME, TransactionType.EXPENSE] },
      date: { gte: start, lt: end },
    },
    _sum: { amount: true },
  });

  let totalIncome = ZERO;
  let totalExpense = ZERO;

  for (const row of rows) {
    const amount = toDecimal(row._sum.amount);
    if (row.type === TransactionType.INCOME) totalIncome = totalIncome.add(amount);
    else totalExpense = totalExpense.add(amount);
  }

  return ok({
    month,
    totalIncome: toAmountString(totalIncome),
    totalExpense: toAmountString(totalExpense),
    balance: toAmountString(totalIncome.minus(totalExpense)),
  });
});
