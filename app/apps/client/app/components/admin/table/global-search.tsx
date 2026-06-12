import { SearchIcon } from "lucide-react";
import { useQueryState } from "nuqs";
import { DebouncedInput } from "~/components/form/debounce-input";
import { cn } from "~/lib/utils";
import { m } from "~/paraglide/messages";

interface TableGlobalSearchProps {
  variant?: "default" | "legacy";
}

export function TableGlobalSearch({
  variant = "default",
}: TableGlobalSearchProps) {
  const isLegacy = variant === "legacy";
  const [q, setQ] = useQueryState("q", {
    shallow: true,
    throttleMs: 100,
  });
  return (
    <div className={cn("flex items-center", isLegacy && "gap-2")}>
      <SearchIcon
        className={isLegacy ? "text-ivory/30" : "text-muted-foreground"}
        size={16}
      />
      <DebouncedInput
        defaultValue={q ?? ""}
        placeholder={m.searchPlaceholder()}
        className={cn(
          "h-9 w-52 border-0 shadow-none outline-0 focus-visible:ring-transparent",
          isLegacy && "bg-transparent text-ivory placeholder:text-ivory/25",
        )}
        // value={q ?? ""}
        onChange={(value) => {
          setQ(value || null).catch(console.error);
        }}
      />
    </div>
  );
}
