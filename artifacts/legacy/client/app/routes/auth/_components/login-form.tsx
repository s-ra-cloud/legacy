import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router";
import { toast } from "sonner";
import { z } from "zod";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { authClient } from "~/lib/auth";
import { m } from "~/paraglide/messages";
import { SAFE_ROUTES } from "~/safe-routes";
import { AuthFormWrapper } from "./auth-form-wrapper";

export const userAuthSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

type FormData = z.infer<typeof userAuthSchema>;

export default function LoginForm() {
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(userAuthSchema),
  });

  const loginMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const result = await authClient.signIn.email({
        email: data.email,
        password: data.password,
      });
      if (result.error) {
        throw result.error;
      }
      return result;
    },
    onSuccess: () => {
      navigate(SAFE_ROUTES.HOME);
    },
    onError: (err) => {
      const errorMap = {
        USER_NOT_FOUND: m["auth.errors.USER_NOT_FOUND"](),
        FAILED_TO_CREATE_USER: m["auth.errors.FAILED_TO_CREATE_USER"](),
        FAILED_TO_CREATE_SESSION: m["auth.errors.FAILED_TO_CREATE_SESSION"](),
        FAILED_TO_UPDATE_USER: m["auth.errors.FAILED_TO_UPDATE_USER"](),
        FAILED_TO_GET_SESSION: m["auth.errors.FAILED_TO_GET_SESSION"](),
        INVALID_PASSWORD: m["auth.errors.INVALID_PASSWORD"](),
        INVALID_EMAIL: m["auth.errors.INVALID_EMAIL"](),
        INVALID_EMAIL_OR_PASSWORD: m["auth.errors.INVALID_EMAIL_OR_PASSWORD"](),
        SOCIAL_ACCOUNT_ALREADY_LINKED:
          m["auth.errors.SOCIAL_ACCOUNT_ALREADY_LINKED"](),
        PROVIDER_NOT_FOUND: m["auth.errors.PROVIDER_NOT_FOUND"](),
        INVALID_TOKEN: m["auth.errors.INVALID_TOKEN"](),
        ID_TOKEN_NOT_SUPPORTED: m["auth.errors.ID_TOKEN_NOT_SUPPORTED"](),
        FAILED_TO_GET_USER_INFO: m["auth.errors.FAILED_TO_GET_USER_INFO"](),
        USER_EMAIL_NOT_FOUND: m["auth.errors.USER_EMAIL_NOT_FOUND"](),
        EMAIL_NOT_VERIFIED: m["auth.errors.EMAIL_NOT_VERIFIED"](),
        PASSWORD_TOO_SHORT: m["auth.errors.PASSWORD_TOO_SHORT"](),
        PASSWORD_TOO_LONG: m["auth.errors.PASSWORD_TOO_LONG"](),
        USER_ALREADY_EXISTS: m["auth.errors.USER_ALREADY_EXISTS"](),
        EMAIL_CAN_NOT_BE_UPDATED: m["auth.errors.EMAIL_CAN_NOT_BE_UPDATED"](),
        CREDENTIAL_ACCOUNT_NOT_FOUND:
          m["auth.errors.CREDENTIAL_ACCOUNT_NOT_FOUND"](),
        SESSION_EXPIRED: m["auth.errors.SESSION_EXPIRED"](),
        FAILED_TO_UNLINK_LAST_ACCOUNT:
          m["auth.errors.FAILED_TO_UNLINK_LAST_ACCOUNT"](),
        ACCOUNT_NOT_FOUND: m["auth.errors.ACCOUNT_NOT_FOUND"](),
        UNKNOWN_ERROR: m["auth.errors.UNKNOWN_ERROR"](),
      };
      if ("code" in err && errorMap[err.code as keyof typeof errorMap]) {
        toast.error(errorMap[err.code as keyof typeof errorMap], {
          description: m["auth.signUp.form.error.description"](),
        });
      } else {
        toast.error(m["auth.signUp.form.error.title"](), {
          description: m["auth.signUp.form.error.description"](),
        });
      }
    },
  });

  const onSubmit = (data: FormData) => {
    loginMutation.mutate(data);
  };

  return (
    <AuthFormWrapper>
      <form onSubmit={handleSubmit(onSubmit, console.error)}>
        <div className="grid gap-2">
          <div className="grid gap-1 mb-7">
            <Label
              className="text-[10px] uppercase tracking-[0.3em] text-ivory/50 font-bold mb-1"
              htmlFor="email"
            >
              Academic email
            </Label>
            <Input
              id="email"
              placeholder="email@institution.edu"
              type="email"
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect="off"
              disabled={loginMutation.isPending}
              className="bg-white/[0.04] border-white/[0.12] text-ivory placeholder:text-ivory/25 focus-visible:border-gold/50 focus-visible:ring-gold/15 h-11 rounded-none"
              {...register("email")}
            />
            {errors?.email && (
              <p className="px-1 text-red-400 text-xs mt-1">
                {errors.email.message}
              </p>
            )}
          </div>

          <div className="grid gap-1 mb-8">
            <Label
              className="text-[10px] uppercase tracking-[0.3em] text-ivory/50 font-bold mb-1"
              htmlFor="password"
            >
              {m["auth.signIn.form.password"]()}
            </Label>
            <Input
              id="password"
              placeholder={m["auth.signIn.form.passwordPlaceholder"]()}
              type="password"
              autoCapitalize="none"
              autoComplete="off"
              autoCorrect="off"
              disabled={loginMutation.isPending}
              className="bg-white/[0.04] border-white/[0.12] text-ivory placeholder:text-ivory/25 focus-visible:border-gold/50 focus-visible:ring-gold/15 h-11 rounded-none"
              {...register("password")}
            />
            {errors?.password && (
              <p className="px-1 text-red-400 text-xs mt-1">
                {errors.password.message}
              </p>
            )}
            {/* <div className="mt-2 flex justify-end">
              <Link
                to={SAFE_ROUTES.AUTH_FORGOT_PASSWORD}
                className="text-[10px] uppercase tracking-[0.25em] text-ivory/35 transition-colors duration-200 hover:text-gold/80"
              >
                Forgot password?
              </Link>
            </div> */}
          </div>

          {/* Submit */}
          <div className="flex justify-center mb-6">
            <button
              type="submit"
              disabled={loginMutation.isPending}
              className="group relative px-12 py-3 border border-gold/50 text-ivory text-[11px] uppercase tracking-[0.35em] font-bold transition-all duration-300 hover:bg-gold/10 hover:border-gold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loginMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mx-auto" />
              ) : (
                m["auth.signIn.form.submit"]()
              )}
            </button>
          </div>

          {/* Links */}
          <div className="mt-1 flex items-center justify-center">
            <Link
              to={SAFE_ROUTES.AUTH_SIGN_UP}
              className="text-[10px] uppercase tracking-[0.25em] text-ivory/35 transition-colors duration-200 hover:text-gold/80"
            >
              Create account
            </Link>
          </div>
        </div>
      </form>
    </AuthFormWrapper>
  );
}
