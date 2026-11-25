import { RotateCcw } from "lucide-react";
import { useSearchParams } from "react-router";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

interface TableResetProps {
  variant?: "default" | "legacy";
}

export function TableReset({ variant = "default" }: TableResetProps) {
  const [_, setQueryParams] = useSearchParams();
  return (
    <Button
      size="sm"
      variant="outline"
      className={cn(
        variant === "legacy" &&
          "rounded-none border-white/10 bg-transparent text-ivory/50 hover:bg-white/[0.05] hover:text-ivory",
      )}
      onClick={() => {
        setQueryParams?.({});
      }}
    >
      <RotateCcw className="size-4" />
    </Button>
  );
}
