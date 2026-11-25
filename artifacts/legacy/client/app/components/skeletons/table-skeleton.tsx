import { Skeleton } from "~/components/ui/skeleton";
import { TableBody, TableCell, TableRow } from "~/components/ui/table";

interface ShadTableRowsSkeletonProps {
  rows: number;
  cols: number;
}

export function ShadTableRowsSkeleton({
  rows,
  cols,
}: ShadTableRowsSkeletonProps) {
  return (
    <TableBody>
      {Array.from({ length: rows })
        .fill(0)
        .map((_row, row) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
          <TableRow key={row}>
            {Array.from({ length: cols })
              .fill(0)
              .map((_col, col) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
                <TableCell key={col} className="border-y px-1 py-6">
                  <Skeleton className="h-4" />
                </TableCell>
              ))}
          </TableRow>
        ))}
    </TableBody>
  );
}
