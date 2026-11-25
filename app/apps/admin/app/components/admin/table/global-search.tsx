import { SearchIcon } from "lucide-react";
import { useQueryState } from "nuqs";
import { DebouncedInput } from "~/components/form/debounce-input";
import { m } from "~/paraglide/messages";

// interface Props {
// }

export function TableGlobalSearch() {
  const [q, setQ] = useQueryState("q", {
    shallow: true,
    throttleMs: 100,
  });
  return (
    <div className="flex items-center">
      <SearchIcon className="text-muted-foreground" size={16} />
      <DebouncedInput
        defaultValue={q ?? ""}
        placeholder={m.searchPlaceholder()}
        className="h-9 w-52 border-0 shadow-none outline-0 focus-visible:ring-transparent"
        // value={q ?? ""}
        onChange={(value) => {
          setQ(value || null).catch(console.error);
        }}
      />
    </div>
  );
}
