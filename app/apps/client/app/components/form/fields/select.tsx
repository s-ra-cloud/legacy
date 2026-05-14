import type { LucideIcon } from "lucide-react";
import type { ComponentProps } from "react";
import {
  FormControl,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { useFormField } from "../hook";

interface SelectFieldProps {
  formName: string;
  label?: string;
  description?: string;
  disabled?: boolean;
  placeholder: string;
  options: {
    label: string;
    value: string;
    icon?: LucideIcon;
    disabled?: boolean;
  }[];
  selectProps?: ComponentProps<typeof Select>;
}

export function SelectField({
  formName,
  label,
  description,
  disabled,
  placeholder,
  options,
  selectProps,
}: SelectFieldProps) {
  const control = useFormField<string>(formName);
  const field = control.field;

  return (
    <FormItem>
      {label && <FormLabel className="capitalize">{label}</FormLabel>}
      <FormControl>
        <Select
          disabled={disabled}
          onValueChange={field.onChange}
          value={field.value}
          {...selectProps}
        >
          <SelectTrigger className="!h-12 w-full">
            <SelectValue defaultValue={field.value} placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.icon && <option.icon className="mr-2 h-4 w-4" />}
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormControl>
      {description && (
        <p className="text-muted-foreground text-sm">{description}</p>
      )}
      <FormMessage fieldState={control.fieldState} />
    </FormItem>
  );
}
