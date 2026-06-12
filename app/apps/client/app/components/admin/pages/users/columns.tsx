import type { UserManyOutput } from "@repo/server/client";
import type { ColumnDef } from "@tanstack/react-table";
import { createColumnHelper } from "@tanstack/react-table";
import { format } from "date-fns";
import { ChevronRight } from "lucide-react";
import { useMemo } from "react";
import { Link } from "react-router";
import { cn } from "~/lib/utils";
import { SAFE_ROUTES } from "~/safe-routes";

const columnHelper = createColumnHelper<UserManyOutput["items"][number]>();

const roleStyles: Record<string, string> = {
  ADMIN: "border-gold/30 bg-gold/10 text-gold",
  MANAGER: "border-ivory/20 bg-ivory/5 text-ivory/70",
  ACCESS_MANAGER: "border-ivory/20 bg-ivory/5 text-ivory/70",
  CLIENT: "border-white/10 bg-white/[0.03] text-ivory/50",
};

const statusStyles: Record<string, string> = {
  ENABLED: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400/90",
  DISABLED: "border-red-400/30 bg-red-500/10 text-red-400/90",
};

function LegacyBadge({
  value,
  styles,
}: {
  value: string;
  styles: Record<string, string>;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-none border px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.15em]",
        styles[value] ?? "border-white/10 bg-white/[0.03] text-ivory/50",
      )}
    >
      {value}
    </span>
  );
}

function UserInitials({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center border border-gold/20 bg-gold/5 text-[10px] font-bold text-gold/80">
      {initials}
    </div>
  );
}

export function useUsersColumns() {
  const userColumns = useMemo(
    () =>
      [
        columnHelper.accessor("name", {
          header: "Name",
          cell: (info) => (
            <div className="flex items-center gap-3">
              <UserInitials name={info.getValue()} />
              <span className="font-medium text-ivory/90">{info.getValue()}</span>
            </div>
          ),
        }),

        columnHelper.accessor("email", {
          header: "Email",
          cell: (info) => (
            <span className="text-ivory/60">{info.getValue()}</span>
          ),
        }),

        columnHelper.accessor("institution", {
          header: "Institution",
          cell: (info) => (
            <span className="text-ivory/50">
              {info.getValue() ?? "—"}
            </span>
          ),
        }),

        columnHelper.accessor("role", {
          header: "Role",
          cell: (info) => (
            <LegacyBadge value={info.getValue()} styles={roleStyles} />
          ),
        }),

        columnHelper.accessor("status", {
          header: "Status",
          cell: (info) => (
            <LegacyBadge value={info.getValue()} styles={statusStyles} />
          ),
        }),

        columnHelper.accessor("createdAt", {
          header: "Joined",
          cell: (info) => (
            <span className="font-mono text-[11px] text-ivory/40">
              {format(info.getValue(), "dd MMM yyyy")}
            </span>
          ),
        }),

        columnHelper.display({
          id: "actions",
          header: "",
          cell: ({ row }) => {
            const item = row.original;

            return (
              <Link
                to={SAFE_ROUTES.ADMIN_USER_EDIT({ userId: item.id })}
                className="inline-flex h-8 w-8 items-center justify-center text-ivory/25 transition-colors hover:text-gold"
                aria-label={`Edit ${item.name}`}
              >
                <ChevronRight className="h-4 w-4" />
              </Link>
            );
          },
        }),
      ] as ColumnDef<UserManyOutput["items"][number]>[],
    [],
  );
  return userColumns;
}
