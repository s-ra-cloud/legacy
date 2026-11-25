import { format } from "date-fns";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";

export function DateColumn({ date }: { date: Date | string | null }) {
  if (!date) return "-";

  const formattedDate = format(date, "dd-MM-yyyy");
  const formattedTime = format(date, "HH:mm:ss '+01'");
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <div className="flex flex-col">
            <div
              className="font-extralight font-mono text-xs"
              suppressHydrationWarning
            >
              {formattedDate}
            </div>
            <div
              className="font-mono font-thin text-[10px] text-gray-500"
              suppressHydrationWarning
            >
              {formattedTime}
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p
            className="font-extralight font-mono text-xs"
            suppressHydrationWarning
          >
            {formattedDate} {formattedTime}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
