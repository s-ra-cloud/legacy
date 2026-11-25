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
  labelClassName?: string;
  inputProps?: ComponentProps<typeof Input>;
}

export function TextField({
  formName,
  label,
  description,
  labelClassName,
  inputProps,
}: TextFieldProps) {
  const control = useFormField<string>(formName);
  const field = control.field;
  const { className: inputClassName, ...restInputProps } = inputProps ?? {};

  return (
    <FormItem className={cn(restInputProps.hidden && "hidden")}>
      {label && (
        <p
          className={cn(
            "mb-1.5 text-sm font-medium capitalize text-foreground",
            labelClassName,
          )}
        >
          {label}
        </p>
      )}
      <FormControl>
        <Input
          className={cn("h-12 w-full min-w-48 bg-sidebar", inputClassName)}
          {...restInputProps}
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
