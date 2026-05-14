import type { ComponentProps } from "react";
import { FormControl, FormItem, FormLabel } from "~/components/ui/form";
import { FormMessage } from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import { cn } from "~/lib/utils";
import { useFormField } from "../hook";

interface TextFieldProps {
  formName: string;
  label?: string;
  description?: string;
  inputProps?: ComponentProps<typeof Input>;
}

export function TextField({
  formName,
  label,
  description,
  inputProps,
}: TextFieldProps) {
  const control = useFormField<string>(formName);
  const field = control.field;

  return (
    <FormItem className={cn(inputProps?.hidden && "hidden")}>
      {/* {label && <FormLabel className="capitalize">{label}</FormLabel>} */}
      {label && <p className="">{label}</p>}
      <FormControl>
        <Input
          className="h-12 w-full min-w-48 bg-sidebar"
          {...inputProps}
          {...field}
        />
      </FormControl>
      {description && (
        <p className="text-muted-foreground text-sm">{description}</p>
      )}
      <FormMessage fieldState={control.fieldState} />
    </FormItem>
  );
}
