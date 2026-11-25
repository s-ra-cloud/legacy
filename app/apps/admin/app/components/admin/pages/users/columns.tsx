import type { UserManyOutput } from "@repo/server/client";
import type { ColumnDef } from "@tanstack/react-table";
import { createColumnHelper } from "@tanstack/react-table";
import { ArrowRightCircleIcon } from "lucide-react";
import { useMemo } from "react";
import { Link } from "react-router";
import { DateColumn } from "~/components/columns/date";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { SAFE_ROUTES } from "~/safe-routes";

const columnHelper = createColumnHelper<UserManyOutput["items"][number]>();

export function useUsersColumns() {
  const userColumns = useMemo(
    () =>
      [
        // columnHelper.accessor('media', {
        //   header: 'Image',
        //   cell: info => <MediaColumn media={info.getValue()} />,
        // }),

        columnHelper.accessor("name", {
          header: "Name",
          cell: (info) => info.getValue(),
        }),

        columnHelper.accessor("email", {
          header: "Email",
          cell: (info) => info.getValue(),
        }),

        columnHelper.accessor("phoneNumber", {
          header: "Phone Number",
          cell: (info) => info.getValue() ?? "No Phone",
        }),

        columnHelper.accessor("role", {
          header: "Role",
          cell: (info) => (
            <Badge className="font-bold text-[10px]">{info.getValue()}</Badge>
          ),
        }),

        columnHelper.accessor("createdAt", {
          header: "Created At",
          cell: (info) => <DateColumn date={info.getValue()} />,
        }),

        columnHelper.display({
          id: "actions",
          header: "",
          cell: ({ row }) => {
            const item = row.original;

            return (
              <Button
                className="rounded-full hover:text-primary"
                variant="ghost"
                size="icon"
              >
                <Link to={SAFE_ROUTES.ADMIN_USER_EDIT({ userId: item.id })}>
                  <ArrowRightCircleIcon className="" />
                </Link>
              </Button>
            );
          },
        }),
      ] as ColumnDef<UserManyOutput["items"][number]>[],
    [],
  );
  return userColumns;
}
