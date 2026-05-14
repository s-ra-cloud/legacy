import { RotateCcw } from "lucide-react";
import { useSearchParams } from "react-router";
import { Button } from "~/components/ui/button";

// biome-ignore lint/complexity/noBannedTypes: <explanation>
type Props = {};

export function TableReset(_: Props) {
  const [searchParams, setQueryParams] = useSearchParams();
  return (
    <Button
      size="sm"
      variant="outline"
      onClick={() => {
        setQueryParams?.({});
      }}
    >
      <RotateCcw className="size-4" />
    </Button>
  );
}
