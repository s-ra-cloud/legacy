import { Minus, Plus } from "lucide-react";
import type { ComponentProps } from "react";
import { Button, Group, Input, NumberField } from "react-aria-components";
import { cn } from "~/lib/utils";

interface PageNumberInputProps extends ComponentProps<typeof NumberField> {
  variant?: "default" | "legacy" | "paper";
}

const groupStyles = {
  default:
    "rounded-lg border border-input bg-background shadow-sm data-[focus-within]:border-ring",
  paper:
    "rounded-none border border-charcoal/15 bg-white shadow-none data-[focus-within]:border-gold/50",
  legacy:
    "rounded-none border border-white/10 bg-white/[0.04] shadow-none data-[focus-within]:border-gold/50",
};

const buttonStyles = {
  default:
    "border-input bg-background text-muted-foreground/80 hover:bg-accent hover:text-foreground",
  paper:
    "border-charcoal/15 bg-charcoal/[0.02] text-charcoal/50 hover:bg-gold/10 hover:text-charcoal",
  legacy:
    "border-white/10 bg-transparent text-ivory/40 hover:bg-white/[0.05] hover:text-ivory",
};

const inputStyles = {
  default: "bg-background text-foreground",
  paper: "bg-white text-charcoal",
  legacy: "bg-transparent text-ivory",
};

export function PageNumberInput({
  variant = "default",
  className,
  ...props
}: PageNumberInputProps) {
  return (
    <NumberField {...props} className={cn("inline-flex", className)}>
      <Group
        className={cn(
          "relative inline-flex h-9 items-center overflow-hidden whitespace-nowrap text-sm transition-colors data-[disabled]:opacity-50 data-[focus-within]:outline-none",
          groupStyles[variant],
        )}
      >
        <Button
          slot="decrement"
          className={cn(
            "flex aspect-square h-9 w-9 shrink-0 items-center justify-center border-r text-sm transition-colors disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-40",
            buttonStyles[variant],
          )}
        >
          <Minus size={14} strokeWidth={2} aria-hidden="true" />
        </Button>
        <Input
          className={cn(
            "w-10 min-w-0 grow px-1 py-2 text-center text-sm tabular-nums focus:outline-none",
            inputStyles[variant],
          )}
        />
        <Button
          slot="increment"
          className={cn(
            "flex aspect-square h-9 w-9 shrink-0 items-center justify-center border-l text-sm transition-colors disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-40",
            buttonStyles[variant],
          )}
        >
          <Plus size={14} strokeWidth={2} aria-hidden="true" />
        </Button>
      </Group>
    </NumberField>
  );
}
