import type { ComponentProps } from "react";
import { DatePicker } from "~/components/extended-ui/date-picker";
import type { DateRangePicker } from "~/components/extended-ui/date-range-picker";
import { FormMessage } from "~/components/ui/form";
import { Label } from "~/components/ui/label";
import { useFormField } from "../hook";
import { format } from "date-fns";

interface DateFieldProps {
  formName: string;
  label?: string;
  description?: string;
  calendarProps?: React.ComponentProps<
    typeof DateRangePicker
  >["calendarProps"];
  datePickerProps?: ComponentProps<typeof DatePicker>;
}

export function DateField({
  formName,
  label,
  description,
  calendarProps,
  datePickerProps,
}: DateFieldProps) {
  const control = useFormField<string>(formName);
  const field = control.field;

  const handleChange = (date: string | undefined) => {
    field.onChange(date ?? "");
  };

  return (
    <div>
      {label && <p className="capitalize">{label}</p>}
      <DatePicker
        date={field.value}
        onChange={(value) => {
          if (value)
            handleChange(format(value, "yyyy-MM-dd"));
        }}
        calendarProps={calendarProps}
        {...datePickerProps}
      />
      {description && (
        <p className="text-muted-foreground text-sm">{description}</p>
      )}
      <FormMessage fieldState={control.fieldState} />
    </div>
  );
}
