import { Minus, Plus } from "lucide-react";
import type { ComponentProps } from "react";
import { Button, Group, Input, NumberField } from "react-aria-components";
import { cn } from "~/lib/utils";

interface PageNumberInputProps extends ComponentProps<typeof NumberField> {
  variant?: "default";
}

export function PageNumberInput({
  variant = "default",
  className,
  ...props
}: PageNumberInputProps) {
  return (
    <NumberField {...props} className={cn("inline-flex", className)}>
      <Group
        className={cn(
          "relative inline-flex h-9 items-center overflow-hidden whitespace-nowrap rounded-lg border border-input bg-background text-sm shadow-sm transition-colors data-[disabled]:opacity-50 data-[focus-within]:border-ring data-[focus-within]:outline-none",
          variant === "default" && "",
        )}
      >
        <Button
          slot="decrement"
          className="flex aspect-square h-9 w-9 shrink-0 items-center justify-center border-r border-input bg-background text-muted-foreground/80 text-sm transition-colors hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Minus size={14} strokeWidth={2} aria-hidden="true" />
        </Button>
        <Input className="w-10 min-w-0 grow bg-background px-1 py-2 text-center text-sm text-foreground tabular-nums focus:outline-none" />
        <Button
          slot="increment"
          className="flex aspect-square h-9 w-9 shrink-0 items-center justify-center border-l border-input bg-background text-muted-foreground/80 text-sm transition-colors hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Plus size={14} strokeWidth={2} aria-hidden="true" />
        </Button>
      </Group>
    </NumberField>
  );
}
