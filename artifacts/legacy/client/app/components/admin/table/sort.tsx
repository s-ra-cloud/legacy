import { ArrowDownIcon, ArrowUpIcon, ChevronsUpDownIcon } from "lucide-react";

interface TableHeaderSortStatusProps {
  sortedStatus: "asc" | "desc" | false;
}

export function TableHeaderSortStatus({
  sortedStatus,
}: TableHeaderSortStatusProps) {
  if (sortedStatus === "asc")
    return <ArrowUpIcon className="ms-1 inline" size={15} />;
  if (sortedStatus === "desc")
    return <ArrowDownIcon className="ms-1 inline" size={15} />;
  if (!sortedStatus)
    return <ChevronsUpDownIcon className="ms-1 inline opacity-0" size={15} />;
  return null;
}
