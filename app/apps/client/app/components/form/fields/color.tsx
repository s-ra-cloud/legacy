import { PaletteIcon } from "lucide-react";
import type { ComponentProps } from "react";
import { CirclePicker } from "react-color";
import { FormMessage } from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { cn } from "~/lib/utils";
import { useFormField } from "../hook";

interface TextFormInputProps {
  formName: string;
  label?: string;
  description?: string;
  inputProps?: ComponentProps<typeof Input>;
}

export function CircleColorFormInput({
  formName,
  label,
  description,
  inputProps,
}: TextFormInputProps) {
  const control = useFormField<string>(formName);
  const field = control.field;

  return (
    <div className={cn(inputProps?.hidden && "hidden")}>
      {label && <p className="capitalize">{label}</p>}
      <div className="flex items-center justify-center overflow-hidden rounded-sm bg-input">
        <Input
          className="min-w-24 rounded-sm text-start focus-visible:ring-primaryColor"
          {...inputProps}
          value={field.value}
          onChange={(e) => field.onChange(e.target.value)}
        />
        <Popover>
          <PopoverTrigger
            className="flex size-10 items-center justify-center bg-black/10"
            style={{ backgroundColor: field.value }}
          >
            <PaletteIcon size={15} />
          </PopoverTrigger>
          <PopoverContent>
            <CirclePicker
              onChange={(color) => {
                field.onChange(color.hex);
              }}
            />
          </PopoverContent>
        </Popover>
      </div>
      {description && (
        <p className="text-muted-foreground text-sm">{description}</p>
      )}
      <FormMessage fieldState={control.fieldState} />
    </div>
  );
}
