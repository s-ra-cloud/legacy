import { MinusIcon, PlusIcon } from "lucide-react";
import {
  Button as Button2,
  Group,
  Input,
  NumberField,
} from "react-aria-components";

export function IncDecInput({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <NumberField defaultValue={value} minValue={0} onChange={onChange}>
      <Group className="inline-flex h-8 items-center rounded-md border border-input shadow-xs">
        <Button2
          slot="decrement"
          className="flex aspect-square h-full items-center justify-center rounded-l-md border-r"
        >
          <MinusIcon size={14} />
        </Button2>
        <Input className="h-full w-12 border-none p-0 text-center shadow-none outline-none ring-0 ring-offset-0 focus:outline-none focus:ring-0 focus:ring-offset-0 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0" />
        <Button2
          slot="increment"
          className="flex aspect-square h-full items-center justify-center rounded-r-md border-l"
        >
          <PlusIcon size={14} />
        </Button2>
      </Group>
    </NumberField>
  );
}
