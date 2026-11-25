import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { CheckCircle2, Loader2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link } from "react-router";
import { toast } from "sonner";
import { z } from "zod";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { authClient } from "~/lib/auth";
import { m } from "~/paraglide/messages";
import { SAFE_ROUTES } from "~/safe-routes";
import { protectAuthRoute } from "~/utils/auth";
import type { Route } from "./+types/forgot-password";
import { AuthPageShell } from "./_components/auth-page-shell";

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
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);

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
    onSuccess: (_, variables) => {
      setSubmittedEmail(variables.email);
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
    <AuthPageShell
      volumeLabel="Vol. I · Recovery"
      title={
        <>
          Forgot <span className="text-gold">Password</span>
        </>
      }
      subtitle="The Hidden Networks"
    >
      {submittedEmail ? (
        <div className="space-y-6 text-center">
          <div className="flex justify-center">
            <CheckCircle2 className="h-10 w-10 text-gold/80" strokeWidth={1.25} />
          </div>
          <div className="space-y-2">
            <p className="text-sm leading-relaxed text-ivory/70">
              {m["auth.forgotPassword.form.success.description"]()}
            </p>
            <p className="text-[10px] uppercase tracking-[0.2em] text-ivory/40">
              {submittedEmail}
            </p>
          </div>
          <div className="flex flex-col items-center gap-4 pt-2">
            <button
              type="button"
              onClick={() => setSubmittedEmail(null)}
              className="text-[10px] uppercase tracking-[0.25em] text-ivory/35 transition-colors duration-200 hover:text-gold/80"
            >
              Try another email
            </button>
            <Link
              to={SAFE_ROUTES.AUTH_SIGN_IN}
              className="group relative border border-gold/50 px-10 py-3 text-[11px] font-bold uppercase tracking-[0.35em] text-ivory transition-all duration-300 hover:border-gold hover:bg-gold/10"
            >
              Back to sign in
            </Link>
          </div>
        </div>
      ) : (
        <>
          <p className="mb-8 text-center text-sm leading-relaxed text-ivory/50">
            {m["auth.forgotPassword.description"]()}
          </p>
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="grid gap-2">
              <div className="mb-8 grid gap-1">
                <Label
                  className="mb-1 text-[10px] font-bold uppercase tracking-[0.3em] text-ivory/50"
                  htmlFor="email"
                >
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
                  className="h-11 rounded-none border-white/[0.12] bg-white/[0.04] text-ivory placeholder:text-ivory/25 focus-visible:border-gold/50 focus-visible:ring-gold/15"
                  {...register("email")}
                />
                {errors?.email && (
                  <p className="mt-1 px-1 text-xs text-red-400">
                    {errors.email.message}
                  </p>
                )}
              </div>

              <div className="mb-6 flex justify-center">
                <button
                  type="submit"
                  disabled={forgotPasswordMutation.isPending}
                  className="group relative border border-gold/50 px-12 py-3 text-[11px] font-bold uppercase tracking-[0.35em] text-ivory transition-all duration-300 hover:border-gold hover:bg-gold/10 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {forgotPasswordMutation.isPending ? (
                    <Loader2 className="mx-auto h-4 w-4 animate-spin" />
                  ) : (
                    m["auth.forgotPassword.form.submit"]()
                  )}
                </button>
              </div>

              <div className="flex items-center justify-center">
                <Link
                  to={SAFE_ROUTES.AUTH_SIGN_IN}
                  className="text-[10px] uppercase tracking-[0.25em] text-ivory/35 transition-colors duration-200 hover:text-gold/80"
                >
                  Back to sign in
                </Link>
              </div>
            </div>
          </form>
        </>
      )}
    </AuthPageShell>
  );
}
