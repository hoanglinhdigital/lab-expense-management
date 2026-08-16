"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";
import AccountListRow from "./AccountListRow";
import type { AccountGroup, AccountItem } from "@/lib/account-types";

interface AccountGroupCardProps {
  group: AccountGroup;
  hidden: boolean;
  onMenu: (account: AccountItem) => void;
}

export default function AccountGroupCard({
  group,
  hidden,
  onMenu,
}: AccountGroupCardProps) {
  const [expanded, setExpanded] = useState(true);
  const listId = `account-group-${group.id}`;

  return (
    <section className="overflow-hidden rounded-2xl bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setExpanded((previous) => !previous)}
        aria-expanded={expanded}
        aria-controls={listId}
        className="flex min-h-11 w-full items-center gap-2 px-4 py-3 text-left"
      >
        <span className="flex-1 text-base font-medium text-slate-800">
          {group.title} ({group.accounts.length})
        </span>
        <ChevronRight
          size={16}
          aria-hidden
          className={`shrink-0 text-slate-500 transition-transform ${
            expanded ? "rotate-90" : ""
          }`}
        />
      </button>

      {expanded ? (
        <ul id={listId}>
          {group.accounts.map((account) => (
            <AccountListRow
              key={account.id}
              account={account}
              hidden={hidden}
              onMenu={onMenu}
            />
          ))}
        </ul>
      ) : null}
    </section>
  );
}
