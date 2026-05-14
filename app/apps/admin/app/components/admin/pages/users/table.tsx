import { useQueryStates } from "nuqs";
import { DataTable } from "~/components/admin/data-table";
import { paginationFromQuery } from "~/components/paginator/pagination-query";
import { $api } from "@repo/ui";
import { userManyInputFilters, userManyInputNuqs } from "~/routes/admin/users";
import { excludeNullParams } from "~/utils/nuqs/clean-params";
import { useUsersColumns } from "./columns";

// biome-ignore lint/suspicious/noEmptyInterface: <explanation>
interface AdminManyUsersTableProps { }

export function AdminManyUsersTable(_: AdminManyUsersTableProps) {
  const [filters, setFilters] = useQueryStates(userManyInputNuqs, {
    shallow: true,
  });

  const query = $api.useQuery("get", "/users", {
    params: {
      query: excludeNullParams(filters),
    },
  });

  const columns = useUsersColumns();
  const pagination = paginationFromQuery(query);
  return (
    <DataTable
      filters={userManyInputFilters}
      isLoading={query.isPending}
      columns={columns}
      data={query.data?.items ?? []}
      pagination={pagination}
      paginationOptions={{
        rowCount: pagination.rowCount,
      }}
    />
  );
}
