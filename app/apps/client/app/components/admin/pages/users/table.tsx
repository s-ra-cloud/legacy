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
    return (
      <ErrorView error={query.error} retry={() => query.refetch()} />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-3">
          <Users className="h-4 w-4 text-gold/60" strokeWidth={1.5} />
          <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-ivory/40">
            {query.isPending ? "Loading…" : `${total} ${total === 1 ? "member" : "members"}`}
          </span>
        </div>
        {!query.isPending && total > 0 && (
          <span className="text-[10px] uppercase tracking-[0.2em] text-ivory/25">
            Showing {from}–{to}
          </span>
        )}
      </div>

      <DataTable
        variant="legacy"
        filters={userManyInputFilters}
        isLoading={query.isPending}
        columns={columns}
        data={query.data?.items ?? []}
        pagination={pagination}
        paginationOptions={{
          rowCount: pagination.rowCount,
        }}
        onPaginationChange={({ pageIndex, pageSize }) => {
          setFilters({
            cursor: pageIndex + 1,
            limit: pageSize,
          }).catch(console.error);
        }}
      />
    </div>
  );
}
