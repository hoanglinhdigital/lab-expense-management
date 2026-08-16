"use client";

import { Check, Plus } from "lucide-react";
import BottomSheet from "../BottomSheet";
import type { ContactOption } from "@/lib/record-types";

interface ContactSheetProps {
  contacts: ContactOption[];
  selectedId: string;
  onSelect: (contactId: string) => void;
  onCreate: () => void;
  onClose: () => void;
}

export default function ContactSheet({
  contacts,
  selectedId,
  onSelect,
  onCreate,
  onClose,
}: ContactSheetProps) {
  return (
    <BottomSheet title="Chọn contact" onClose={onClose}>
      {contacts.length === 0 ? (
        <p className="px-6 pt-8 text-center text-sm text-slate-500">
          Chưa có contact nào. Tạo contact để ghi khoản vay/cho mượn.
        </p>
      ) : (
        <ul>
          {contacts.map((contact) => {
            const selected = contact.id === selectedId;
            return (
              <li key={contact.id}>
                <button
                  type="button"
                  onClick={() => onSelect(contact.id)}
                  className="flex min-h-11 w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-50"
                >
                  <span
                    aria-hidden
                    className="flex size-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-medium text-slate-800"
                  >
                    {contact.name.trim().charAt(0).toUpperCase()}
                  </span>
                  <span className="flex-1 truncate text-sm text-slate-800">
                    {contact.name}
                  </span>
                  {selected ? (
                    <Check size={16} className="shrink-0 text-emerald-600" aria-hidden />
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <div className="border-t border-slate-200">
        <button
          type="button"
          onClick={onCreate}
          className="flex min-h-11 w-full items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-emerald-600"
        >
          <Plus size={16} aria-hidden />
          Tạo mới contact
        </button>
      </div>
    </BottomSheet>
  );
}
