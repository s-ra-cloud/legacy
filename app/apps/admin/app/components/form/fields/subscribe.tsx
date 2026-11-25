import { Loader2Icon } from "lucide-react";
import { useFormContext } from "react-hook-form";
import { Button } from "~/components/ui/button";

interface SubscribeButtonProps {
  label: string;
}

export function SubscribeButton({ label }: SubscribeButtonProps) {
  const form = useFormContext();
  const isSubmitting = form.formState.isSubmitting;
  return (
    <Button type="submit" disabled={isSubmitting}>
      {isSubmitting ? (
        <Loader2Icon className="me-2 h-4 w-4 animate-spin" />
      ) : null}
      {label}
    </Button>
  );
}
