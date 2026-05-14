import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { authClient } from "~/lib/auth";
import { m } from "~/paraglide/messages";
import { protectAuthRoute } from "~/utils/auth";
import type { Route } from "./+types/forgot-password";
import { AuthFormWrapper } from "./_components/auth-form-wrapper";

export async function loader({ request }: Route.LoaderArgs) {
  await protectAuthRoute(request);
  return null;
}

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

type FormData = z.infer<typeof forgotPasswordSchema>;

type ForgotPasswordPageProps = { phantom?: unknown };

export default function ForgotPasswordPage(_props: ForgotPasswordPageProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const forgotPasswordMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const result = await authClient.forgetPassword({
        email: data.email,
      });
      if (result.error) {
        throw result.error;
      }
      return result;
    },
    onSuccess: () => {
      toast.success(m["auth.forgotPassword.form.success.title"](), {
        description: m["auth.forgotPassword.form.success.description"](),
      });
    },
    onError: (err) => {
      const errorMap = {
        USER_NOT_FOUND: m["auth.errors.USER_NOT_FOUND"](),
        USER_EMAIL_NOT_FOUND: m["auth.errors.USER_EMAIL_NOT_FOUND"](),
        EMAIL_NOT_VERIFIED: m["auth.errors.EMAIL_NOT_VERIFIED"](),
        UNKNOWN_ERROR: m["auth.errors.UNKNOWN_ERROR"](),
      };
      if ("code" in err && errorMap[err.code as keyof typeof errorMap]) {
        toast.error(errorMap[err.code as keyof typeof errorMap], {
          description: m["auth.forgotPassword.form.error.description"](),
        });
      } else {
        toast.error(m["auth.forgotPassword.form.error.title"](), {
          description: m["auth.forgotPassword.form.error.description"](),
        });
      }
    },
  });

  const onSubmit = (data: FormData) => {
    forgotPasswordMutation.mutate(data);
  };

  return (
    <AuthFormWrapper>
      <div className="flex flex-col space-y-2 text-center">
        <h1 className="font-semibold text-2xl tracking-tight">
          {m["auth.forgotPassword.title"]()}
        </h1>
        <p className="text-muted-foreground text-sm">
          {m["auth.forgotPassword.description"]()}
        </p>
      </div>
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid gap-2">
          <div className="grid gap-1">
            <Label className="sr-only" htmlFor="email">
              {m["auth.forgotPassword.form.email"]()}
            </Label>
            <Input
              id="email"
              placeholder={m["auth.forgotPassword.form.emailPlaceholder"]()}
              type="email"
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect="off"
              disabled={forgotPasswordMutation.isPending}
              {...register("email")}
            />
            {errors?.email && (
              <p className="px-1 text-red-600 text-xs">
                {errors.email.message}
              </p>
            )}
          </div>
          <Button disabled={forgotPasswordMutation.isPending}>
            {forgotPasswordMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            {m["auth.forgotPassword.form.submit"]()}
          </Button>
        </div>
      </form>
    </AuthFormWrapper>
  );
}
