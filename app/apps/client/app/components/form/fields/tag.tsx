import { TagInput } from "emblor";
import type { ComponentProps } from "react";
import { useState } from "react";
import { FormMessage } from "~/components/ui/form";
import { Label } from "~/components/ui/label";
import { useFormField } from "../hook";

interface TagsFormInputProps {
  formName: string;
  label?: string;
  description?: string;
  inputProps?: ComponentProps<typeof TagInput>;
}

export function TagsField({
  formName,
  label,
  description,
}: TagsFormInputProps) {
  const [activeTagIndex, setActiveTagIndex] = useState<number | null>(null);
  const control = useFormField<string[]>(formName);
  const field = control.field;
  return (
    <div>
      {label && <p className="capitalize">{label}</p>}
      <TagInput
        activeTagIndex={activeTagIndex}
        setActiveTagIndex={setActiveTagIndex}
        tags={field.value.map((it) => ({ text: it, id: it }))}
        setTags={(newTags) => {
          field.onChange(
            (newTags as unknown as { id: string }[]).map((it) => it.id),
          );
        }}
      />
      {description && (
        <p className="text-muted-foreground text-sm">{description}</p>
      )}
      <FormMessage fieldState={control.fieldState} />
    </div>
  );
}
