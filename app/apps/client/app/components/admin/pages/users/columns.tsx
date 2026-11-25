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

const roleLabels: Record<string, string> = {
  ADMIN: "Admin",
  CLIENT: "Client",
  MANAGER: "Manager",
  ACCESS_MANAGER: "Access manager",
};

const roleStyles: Record<string, string> = {
  ADMIN: "border-gold/40 bg-gold/10 text-[#8a6d2f]",
  MANAGER: "border-charcoal/15 bg-charcoal/5 text-charcoal/70",
  ACCESS_MANAGER: "border-charcoal/15 bg-charcoal/5 text-charcoal/70",
  CLIENT: "border-charcoal/10 bg-charcoal/[0.03] text-charcoal/55",
};

const statusStyles: Record<string, string> = {
  ENABLED: "border-emerald-600/25 bg-emerald-50 text-emerald-800",
  DISABLED: "border-red-300/60 bg-red-50 text-red-800",
};

const statusLabels: Record<string, string> = {
  ENABLED: "Active",
  DISABLED: "Disabled",
};

function RoleStatusBadge({
  value,
  styles,
  labels,
}: {
  value: string;
  styles: Record<string, string>;
  labels?: Record<string, string>;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-none border px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.15em]",
        styles[value] ?? "border-charcoal/10 bg-charcoal/[0.03] text-charcoal/50",
      )}
    >
      {labels?.[value] ?? value}
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
    <div className="flex h-8 w-8 shrink-0 items-center justify-center border border-gold/35 bg-gold/10 text-[10px] font-bold text-[#8a6d2f]">
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
              <span className="font-medium text-charcoal">{info.getValue()}</span>
            </div>
          ),
        }),

        columnHelper.accessor("email", {
          header: "Email",
          cell: (info) => (
            <span className="text-charcoal/65">{info.getValue()}</span>
          ),
        }),

        columnHelper.accessor("institution", {
          header: "Institution",
          cell: (info) => (
            <span className="text-charcoal/50">{info.getValue() ?? "—"}</span>
          ),
        }),

        columnHelper.accessor("role", {
          header: "Role",
          cell: (info) => (
            <RoleStatusBadge
              value={info.getValue()}
              styles={roleStyles}
              labels={roleLabels}
            />
          ),
        }),

        columnHelper.accessor("status", {
          header: "Status",
          cell: (info) => (
            <RoleStatusBadge
              value={info.getValue()}
              styles={statusStyles}
              labels={statusLabels}
            />
          ),
        }),

        columnHelper.accessor("createdAt", {
          header: "Joined",
          cell: (info) => (
            <span className="font-mono text-[11px] text-charcoal/45">
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
                className="inline-flex h-8 w-8 items-center justify-center text-charcoal/30 transition-colors hover:text-gold"
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
