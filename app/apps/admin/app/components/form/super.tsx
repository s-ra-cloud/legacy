import type {
  FieldValues,
  FormProviderProps,
  SubmitErrorHandler,
  UseFormReturn,
} from "react-hook-form";
import { toast } from "sonner";
import { Form } from "~/components/ui/form";

interface SuperFormProps<
  TFieldValues extends FieldValues,
  TContext,
  TTransformedValues extends FieldValues,
> {
  form: UseFormReturn<TFieldValues, TContext, TTransformedValues>;
  children: React.ReactNode | React.ReactNode[];
  onError?: SubmitErrorHandler<TFieldValues>;
  onSubmit: Parameters<
    FormProviderProps<
      TFieldValues,
      TContext,
      TTransformedValues
    >["handleSubmit"]
  >[0];

  onBeforeSubmit?: () => Promise<boolean>;
  formProps?: React.InputHTMLAttributes<HTMLFormElement>;
}

export function SuperForm<
  TFieldValues extends FieldValues,
  TContext,
  TTransformedValues extends FieldValues,
>({
  form,
  children,
  onSubmit,
  onBeforeSubmit,
  onError = (err) => {
    console.error(err, form.getValues());
    toast.error("invalid data");
  },
  formProps,
}: SuperFormProps<TFieldValues, TContext, TTransformedValues>) {
  const rootError = form.formState.errors.root;
  return (
    <Form {...form}>
      <form
        {...formProps}
        method="post"
        onSubmit={async (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          if (onBeforeSubmit && !(await onBeforeSubmit())) return;
          form.handleSubmit(onSubmit, onError)(ev).catch(console.error);
        }}
      >
        {rootError && <RootErrorView error={rootError} />}
        {children}
      </form>
    </Form>
  );
}

interface RootErrorViewProps {
  error: { message?: string };
}

function RootErrorView({ error }: RootErrorViewProps) {
  return (
    <p className="grid grid-cols-1 gap-2 text-center text-destructive sm:col-span-2">
      {error.message}
    </p>
  );
}
