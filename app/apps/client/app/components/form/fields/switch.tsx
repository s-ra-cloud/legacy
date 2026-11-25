import {
  FormControl,
  FormDescription,
  FormItem,
  FormLabel,
} from "~/components/ui/form";
import { FormMessage } from "~/components/ui/form";
import { Switch } from "~/components/ui/switch";
import { cn } from "~/lib/utils";
import { useFormField } from "../hook";

interface SwitchFieldProps {
  formName: string;
  label?: string;
  description?: string;
  hidden?: boolean;
}

export function SwitchField({
  formName,
  label,
  description,
  hidden,
}: SwitchFieldProps) {
  const control = useFormField<boolean>(formName);
  const field = control.field;

  return (
    <div className={cn(hidden && "hidden")}>
      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
        <div className="space-y-0.5">
          {label && <FormLabel className="capitalize">{label}</FormLabel>}
          {description && <FormDescription>{description}</FormDescription>}
        </div>
        <FormControl>
          <Switch
            checked={field.value}
            onCheckedChange={field.onChange}
            className="focus-visible:ring-primaryColor"
          />
        </FormControl>
      </FormItem>
      <FormMessage fieldState={control.fieldState} />
    </div>
  );
}
