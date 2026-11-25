import GenderToggle from "~/components/common/gender-toggle";
import { FormMessage } from "~/components/ui/form";
import { Label } from "~/components/ui/label";
import { cn } from "~/lib/utils";
import { useFormField } from "../hook";

type Gender = "MALE" | "FEMALE";

interface GenderFieldProps {
  formName: string;
  label?: string;
  description?: string;
  disabled?: boolean;
  hidden?: boolean;
}

export function GenderField({
  formName,
  label,
  description,
  disabled,
  hidden,
}: GenderFieldProps) {
  const control = useFormField<Gender>(formName);
  const field = control.field;

  return (
    <div className={cn(hidden && "hidden")}>
      {label && <p className="capitalize">{label}</p>}
      <GenderToggle
        disabled={disabled}
        value={field.value}
        onChange={(gender) => field.onChange(gender)}
      />
      {description && (
        <p className="text-muted-foreground text-sm">{description}</p>
      )}
      <FormMessage fieldState={control.fieldState} />
    </div>
  );
}
