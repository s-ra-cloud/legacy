import { useQueryStates } from "nuqs";
import { Users } from "lucide-react";
import { DataTable } from "~/components/admin/data-table";
import { paginationFromQuery } from "~/components/paginator/pagination-query";
import { $api } from "@repo/ui";
import { userManyInputFilters, userManyInputNuqs } from "~/routes/admin/users";
import { excludeNullParams } from "~/utils/nuqs/clean-params";
import { useUsersColumns } from "./columns";

interface AdminManyUsersTableProps {}

export function AdminManyUsersTable(_: AdminManyUsersTableProps) {
  const [filters] = useQueryStates(userManyInputNuqs, {
    shallow: true,
  });

  const query = $api.useQuery("get", "/users", {
    params: {
      query: excludeNullParams(filters),
    },
  });

  const columns = useUsersColumns();
  const pagination = paginationFromQuery(query);

  const total = query.data?.pagination.total ?? 0;
  const page = pagination.pageIndex + 1;
  const pageSize = pagination.pageSize;
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

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

      <div className="min-h-[480px]">
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
        />
      </div>
    </div>
  );
}
