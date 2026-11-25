import { useQueryStates } from "nuqs";
import { Users } from "lucide-react";
import { DataTable } from "~/components/admin/data-table";
import { ErrorView } from "~/components/common/error";
import { paginationFromQuery } from "~/components/paginator/pagination-query";
import { $api } from "@repo/ui";
import { parseUserManyQuery } from "~/routes/admin/users/query";
import { userManyInputFilters, userManyInputNuqs } from "~/routes/admin/users";
import { useUsersColumns } from "./columns";

interface AdminManyUsersTableProps {}

export function AdminManyUsersTable(_: AdminManyUsersTableProps) {
  const [filters, setFilters] = useQueryStates(userManyInputNuqs, {
    shallow: true,
  });

  const queryParams = parseUserManyQuery(filters);

  const query = $api.useQuery("get", "/users", {
    params: {
      query: queryParams,
    },
  });

  const columns = useUsersColumns();
  const pagination = paginationFromQuery(query);

  const total = query.data?.pagination.total ?? 0;
  const page = Math.max(pagination.pageIndex + 1, 1);
  const pageSize = Math.max(pagination.pageSize, 1);
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  if (query.isError) {
    return <ErrorView error={query.error} retry={() => query.refetch()} />;
  }

  return (
    <div className="relative overflow-hidden border border-charcoal/10 bg-paper text-charcoal shadow-[0_24px_80px_rgba(15,17,19,0.12)]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage:
            "linear-gradient(to right, #0F1113 1px, transparent 1px), linear-gradient(to bottom, #0F1113 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      <div className="pointer-events-none absolute top-3 left-3 h-px w-3 bg-charcoal/25" />
      <div className="pointer-events-none absolute top-3 left-3 h-3 w-px bg-charcoal/25" />
      <div className="pointer-events-none absolute top-3 right-3 h-px w-3 bg-charcoal/25" />
      <div className="pointer-events-none absolute top-3 right-3 h-3 w-px bg-charcoal/25" />
      <div className="pointer-events-none absolute bottom-3 left-3 h-px w-3 bg-charcoal/25" />
      <div className="pointer-events-none absolute bottom-3 left-3 h-3 w-px bg-charcoal/25" />
      <div className="pointer-events-none absolute bottom-3 right-3 h-px w-3 bg-charcoal/25" />
      <div className="pointer-events-none absolute bottom-3 right-3 h-3 w-px bg-charcoal/25" />

      <div className="relative z-10 p-6 sm:p-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-charcoal/10 pb-4">
          <div className="flex items-center gap-3">
            <Users className="h-4 w-4 text-gold" strokeWidth={1.5} />
            <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-charcoal/50">
              {query.isPending
                ? "Loading…"
                : `${total} ${total === 1 ? "member" : "members"}`}
            </span>
          </div>
          {!query.isPending && total > 0 && (
            <span className="text-[10px] uppercase tracking-[0.2em] text-charcoal/35">
              Showing {from}–{to}
            </span>
          )}
        </div>

        <DataTable
          filters={userManyInputFilters}
          isLoading={query.isPending}
          columns={columns}
          data={query.data?.items ?? []}
          pagination={pagination}
          paginationOptions={{
            rowCount: pagination.rowCount,
          }}
          onPaginationChange={({ pageIndex, pageSize: limit }) => {
            setFilters({
              cursor: pageIndex + 1,
              limit,
            }).catch(console.error);
          }}
        />
      </div>
    </div>
  );
}
