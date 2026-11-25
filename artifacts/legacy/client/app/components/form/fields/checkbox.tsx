import { Checkbox } from "~/components/ui/checkbox";
import { FormControl } from "~/components/ui/form";
import { FormMessage } from "~/components/ui/form";
import { cn } from "~/lib/utils";
import { useFormField } from "../hook";

interface CheckboxOnlyFieldProps {
  formName: string;
  hidden?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

export function CheckboxOnlyField({
  formName,
  hidden,
  onCheckedChange,
}: CheckboxOnlyFieldProps) {
  const control = useFormField<boolean>(formName);
  const field = control.field;

  return (
    <div className={cn(hidden && "hidden")}>
      <FormControl>
        <Checkbox
          checked={field.value}
          onCheckedChange={(checked) => {
            if (checked === "indeterminate") return;
            field.onChange(checked);
            onCheckedChange?.(checked);
          }}
          className="focus-visible:ring-primaryColor"
        />
      </FormControl>
      <FormMessage fieldState={control.fieldState} />
    </div>
  );
}
