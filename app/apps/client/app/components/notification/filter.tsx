import { ArchiveIcon, CheckIcon, EyeIcon } from "lucide-react";
import { cn } from "~/lib/utils";
import { Button } from "../ui/button";
import type { FilterType } from "./list";

export function NotificationFilters({
  activeFilter,
  onFilterChange,
}: {
  activeFilter: FilterType;
  onFilterChange: (filter: FilterType) => void;
}) {
  return (
    <div className="sticky bottom-0 border-t bg-white">
      <div className="flex items-center justify-around py-2">
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "flex flex-col gap-1 transition-colors",
            activeFilter === "archived" && "bg-slate-100 text-slate-900",
          )}
          onClick={() => onFilterChange("archived")}
        >
          <ArchiveIcon className="h-4 w-4" />
          <span className="text-xs">Archived</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "flex flex-col gap-1 transition-colors",
            activeFilter === "read" && "bg-slate-100 text-slate-900",
          )}
          onClick={() => onFilterChange("read")}
        >
          <CheckIcon className="h-4 w-4" />
          <span className="text-xs">Read</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "flex flex-col gap-1 transition-colors",
            activeFilter === null && "bg-slate-100 text-slate-900",
          )}
          onClick={() => onFilterChange(null)}
        >
          <EyeIcon className="h-4 w-4" />
          <span className="text-xs">Read & Unread</span>
        </Button>
      </div>
    </div>
  );
}
