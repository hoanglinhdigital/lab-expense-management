import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Test push again to trigger Github action.
export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId');
  const month = req.nextUrl.searchParams.get('month');

  const transactions = await prisma.transaction.findMany({
    where: {
      date: { gte: new Date(month + '-01') },
    },
  });

  let totalExpense = 0;
  let totalIncome = 0;

  for (const t of transactions) {
    if (t.type === 'EXPENSE') {
      totalExpense = totalExpense + Number(t.amount);
    } else {
      totalIncome = totalIncome + Number(t.amount);
    }
  }

  return NextResponse.json({
    userId,
    totalExpense,
    totalIncome,
    balance: totalIncome - totalExpense,
    transactions,
  });
}
