import { formatCurrency } from "@/lib/format";
import { currencySymbol } from "@/lib/account-types";
import type { FinancialStatement } from "@/lib/report-types";

interface FinancialStatementCardProps {
  statement: FinancialStatement;
}

interface StatementTileProps {
  label: string;
  amount: number;
}

function StatementTile({ label, amount }: StatementTileProps) {
  return (
    <div className="min-w-0 flex-1 rounded-2xl bg-white/15 p-3">
      <p className="text-sm text-white/80">{label}</p>
      <p className="mt-1 truncate text-base font-medium tabular-nums text-white">
        {formatCurrency(amount)}
      </p>
    </div>
  );
}

export default function FinancialStatementCard({
  statement,
}: FinancialStatementCardProps) {
  return (
    <section className="rounded-2xl bg-emerald-600 p-4 shadow-sm">
      <h2 className="text-center text-base font-medium text-white">
        Financial statement
      </h2>
      <p className="mt-1 truncate text-center text-xl font-semibold tabular-nums text-white">
        {formatCurrency(statement.netWorth)} {currencySymbol(statement.currency)}
      </p>

      <div className="mt-4 flex gap-3">
        <StatementTile label="Assets" amount={statement.assets} />
        <StatementTile label="Liabilities" amount={statement.liabilities} />
      </div>
    </section>
  );
}
