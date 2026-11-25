import type { ComponentProps } from "react";
import { FormControl, FormLabel } from "~/components/ui/form";
import { FormItem, FormMessage } from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import { cn } from "~/lib/utils";
import { useFormField } from "../hook";

interface NumberFieldProps {
  formName: string;
  label?: string;
  description?: string;
  inputProps?: ComponentProps<typeof Input>;
}

export function NumberField({
  formName,
  label,
  description,
  inputProps,
}: NumberFieldProps) {
  const control = useFormField<number>(formName);
  const field = control.field;

  return (
    <FormItem className={cn(inputProps?.hidden && "hidden")}>
      {label && <FormLabel className="capitalize">{label}</FormLabel>}
      <FormControl>
        <Input
          className="min-w-24 rounded-sm focus-visible:ring-primaryColor"
          type="number"
          {...inputProps}
          value={field.value}
          onChange={(e) => field.onChange(e.target.valueAsNumber)}
        />
      </FormControl>
      {description && (
        <p className="text-muted-foreground text-sm">{description}</p>
      )}
      <FormMessage fieldState={control.fieldState} />
    </FormItem>
  );
}
