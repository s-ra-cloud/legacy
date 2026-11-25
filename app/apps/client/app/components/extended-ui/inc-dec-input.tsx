import { MinusIcon, PlusIcon } from "lucide-react";
import { Button } from "../ui/button";

interface IncDecInputProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
  disabled?: boolean;
}

export function IncDecInput({
  value,
  onChange,
  min = Number.MIN_SAFE_INTEGER,
  max = Number.MAX_SAFE_INTEGER,
  step = 1,
  label,
  disabled,
}: IncDecInputProps) {
  return (
    <div className="flex items-center">
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={() => {
          onChange(value - step);
        }}
        className="size-6 cursor-pointer rounded-full"
        disabled={value === 0}
      >
        <MinusIcon className="h-4 w-4" />
      </Button>
      <input
        className="w-12"
        type="number"
        value={value}
        max={max}
        min={min}
        onChange={(e) => {
          if (e.target.value === "") {
            // @ts-expect-error - allow empty input
            onChange("");
            return;
          }
          const newValue = Number.parseInt(e.target.value, 10);
          if (!Number.isNaN(newValue) && newValue >= min && newValue <= max) {
            onChange(newValue);
          }
        }}
      />
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={() => {
          onChange(value + step);
        }}
        className="size-6 cursor-pointer rounded-full"
        disabled={value === max}
      >
        <PlusIcon className="h-4 w-4" />
      </Button>
    </div>
  );
}
