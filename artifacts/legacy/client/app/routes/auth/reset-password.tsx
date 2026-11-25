import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { useNavigate, useSearchParams } from "react-router";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { authClient } from "~/lib/auth";
import { m } from "~/paraglide/messages";
import { SAFE_ROUTES } from "~/safe-routes";
import { protectAuthRoute } from "~/utils/auth";
import type { Route } from "./+types/reset-password";
import { AuthFormWrapper } from "./_components/auth-form-wrapper";

export async function loader({ request }: Route.LoaderArgs) {
  await protectAuthRoute(request);
  return null;
}

const resetPasswordSchema = z
  .object({
    password: z.string().min(8),
    confirmPassword: z.string().min(8),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
  });

type FormData = z.infer<typeof resetPasswordSchema>;

type ResetPasswordPageProps = { phantom?: unknown };

export default function ResetPasswordPage(_props: ResetPasswordPageProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(resetPasswordSchema),
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async (data: FormData) => {
      if (!token) {
        throw new Error("Missing reset token");
      }
      const result = await authClient.resetPassword({
        token,
        newPassword: data.password,
      });
      if (result.error) {
        throw result.error;
      }
      return result;
    },
    onSuccess: () => {
      toast.success(m["auth.resetPassword.form.success.title"](), {
        description: m["auth.resetPassword.form.success.description"](),
      });
      navigate(SAFE_ROUTES.AUTH_SIGN_IN);
    },
    onError: (err) => {
      const errorMap = {
        INVALID_TOKEN: m["auth.errors.INVALID_TOKEN"](),
        PASSWORD_TOO_SHORT: m["auth.errors.PASSWORD_TOO_SHORT"](),
        PASSWORD_TOO_LONG: m["auth.errors.PASSWORD_TOO_LONG"](),
        UNKNOWN_ERROR: m["auth.errors.UNKNOWN_ERROR"](),
      };
      if ("code" in err && errorMap[err.code as keyof typeof errorMap]) {
        toast.error(errorMap[err.code as keyof typeof errorMap], {
          description: m["auth.resetPassword.form.error.description"](),
        });
      } else {
        toast.error(m["auth.resetPassword.form.error.title"](), {
          description: m["auth.resetPassword.form.error.description"](),
        });
      }
    },
  });

  const onSubmit = (data: FormData) => {
    resetPasswordMutation.mutate(data);
  };

  if (!token) {
    return (
      <AuthFormWrapper>
        <div className="flex flex-col space-y-2 text-center">
          <h1 className="font-semibold text-2xl text-red-600 tracking-tight">
            {m["auth.resetPassword.invalidLink.title"]()}
          </h1>
          <p className="text-muted-foreground text-sm">
            {m["auth.resetPassword.invalidLink.description"]()}
          </p>
          <Button
            variant="link"
            onClick={() => navigate(SAFE_ROUTES.AUTH_SIGN_IN)}
          >
            {m["auth.resetPassword.invalidLink.requestNew"]()}
          </Button>
        </div>
      </AuthFormWrapper>
    );
  }

  return (
    <AuthFormWrapper>
      <div className="flex flex-col space-y-2 text-center">
        <h1 className="font-semibold text-2xl tracking-tight">
          {m["auth.resetPassword.title"]()}
        </h1>
        <p className="text-muted-foreground text-sm">
          {m["auth.resetPassword.description"]()}
        </p>
      </div>
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid gap-2">
          <div className="grid gap-1">
            <Label className="sr-only" htmlFor="password">
              {m["auth.resetPassword.form.password"]()}
            </Label>
            <Input
              id="password"
              placeholder={m["auth.resetPassword.form.passwordPlaceholder"]()}
              type="password"
              autoCapitalize="none"
              autoComplete="new-password"
              autoCorrect="off"
              disabled={resetPasswordMutation.isPending}
              {...register("password")}
            />
            {errors?.password && (
              <p className="px-1 text-red-600 text-xs">
                {errors.password.message}
              </p>
            )}
          </div>
          <div className="grid gap-1">
            <Label className="sr-only" htmlFor="confirmPassword">
              {m["auth.resetPassword.form.confirmPassword"]()}
            </Label>
            <Input
              id="confirmPassword"
              placeholder={m[
                "auth.resetPassword.form.confirmPasswordPlaceholder"
              ]()}
              type="password"
              autoCapitalize="none"
              autoComplete="new-password"
              autoCorrect="off"
              disabled={resetPasswordMutation.isPending}
              {...register("confirmPassword")}
            />
            {errors?.confirmPassword && (
              <p className="px-1 text-red-600 text-xs">
                {errors.confirmPassword.message}
              </p>
            )}
          </div>
          <Button disabled={resetPasswordMutation.isPending}>
            {resetPasswordMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            {m["auth.resetPassword.form.submit"]()}
          </Button>
        </div>
      </form>
    </AuthFormWrapper>
  );
}
