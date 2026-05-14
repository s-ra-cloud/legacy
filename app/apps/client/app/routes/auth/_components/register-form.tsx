import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router";
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
  firstName: z.string().min(3),
  lastName: z.string().min(3),
  institution: z.string().min(3),
  repeatPassword: z.string().min(8),
}).refine((data) => data.password === data.repeatPassword, {
  message: "Passwords don't match",
  path: ["repeatPassword"],
});

type FormData = z.infer<typeof userAuthSchema>;

export default function RegisterForm() {
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(userAuthSchema),
  });

  const registerMutation = useMutation({
    mutationFn: async (data: FormData) => {
      console.log("-------------------------------- data:");
      console.log(data);

      const result = await authClient.signUp.email({
        email: data.email,
        password: data.password,
        name: `${data.firstName} ${data.lastName}`,
        // @ts-ignore - firstName, lastName, and institution are added as additionalFields in better-auth config
        firstName: data.firstName,
        // @ts-ignore
        lastName: data.lastName,
        // @ts-ignore
        institution: data.institution,
      });
      if (result.error) throw result.error;
      else {
        console.log("-------------------------------- result:");
        console.log(result);
        navigate(SAFE_ROUTES.HOME);
      }
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
    registerMutation.mutate(data);
  };

  const inputClass =
    "bg-white/[0.04] border-white/[0.12] text-ivory placeholder:text-ivory/25 focus-visible:border-gold/50 focus-visible:ring-gold/15 h-11 rounded-none";
  const labelClass =
    "text-[10px] uppercase tracking-[0.3em] text-ivory/50 font-bold mb-1";

  return (
    <AuthFormWrapper>
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid gap-2">
          {/* Email */}
          <div className="grid gap-1 mb-5">
            <Label className={labelClass} htmlFor="email">
              Academic email
            </Label>
            <Input
              id="email"
              placeholder={m["auth.signUp.form.emailPlaceholder"]()}
              type="email"
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect="off"
              disabled={registerMutation.isPending}
              className={inputClass}
              {...register("email")}
            />
            {errors.email && (
              <p className="px-1 text-red-400 text-xs mt-1">{errors.email.message}</p>
            )}
          </div>

          {/* Name */}
          <div className="grid gap-1 mb-5">
            <Label className={labelClass}>
              {m["auth.signUp.form.name"]()}
            </Label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Input
                  id="firstName"
                  placeholder="First name"
                  type="text"
                  autoCapitalize="none"
                  autoComplete="given-name"
                  autoCorrect="off"
                  disabled={registerMutation.isPending}
                  className={inputClass}
                  {...register("firstName")}
                />
                {errors.firstName && (
                  <p className="px-1 text-red-400 text-xs mt-1">{errors.firstName.message}</p>
                )}
              </div>
              <div>
                <Input
                  id="lastName"
                  placeholder="Last name"
                  type="text"
                  autoCapitalize="none"
                  autoComplete="family-name"
                  autoCorrect="off"
                  disabled={registerMutation.isPending}
                  className={inputClass}
                  {...register("lastName")}
                />
                {errors.lastName && (
                  <p className="px-1 text-red-400 text-xs mt-1">{errors.lastName.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Institution */}
          <div className="grid gap-1 mb-5">
            <Label className={labelClass} htmlFor="institution">
              Institution
            </Label>
            <Input
              id="institution"
              placeholder="Your institution"
              type="text"
              autoCapitalize="none"
              autoComplete="organization"
              autoCorrect="off"
              disabled={registerMutation.isPending}
              className={inputClass}
              {...register("institution")}
            />
            {errors.institution && (
              <p className="px-1 text-red-400 text-xs mt-1">{errors.institution.message}</p>
            )}
          </div>

          {/* Password */}
          <div className="grid gap-1 mb-5">
            <Label className={labelClass} htmlFor="password">
              {m["auth.signUp.form.password"]()}
            </Label>
            <Input
              id="password"
              placeholder={m["auth.signUp.form.passwordPlaceholder"]()}
              type="password"
              autoCapitalize="none"
              autoComplete="new-password"
              autoCorrect="off"
              disabled={registerMutation.isPending}
              className={inputClass}
              {...register("password")}
            />
            {errors.password && (
              <p className="px-1 text-red-400 text-xs mt-1">
                {errors.password.message}
              </p>
            )}
          </div>

          {/* Repeat password */}
          <div className="grid gap-1 mb-8">
            <Label className={labelClass} htmlFor="repeatPassword">
              {m["auth.signUp.form.repeatPassword"]()}
            </Label>
            <Input
              id="repeatPassword"
              placeholder={m["auth.signUp.form.repeatPasswordPlaceholder"]()}
              type="password"
              autoCapitalize="none"
              autoComplete="new-password"
              autoCorrect="off"
              disabled={registerMutation.isPending}
              className={inputClass}
              {...register("repeatPassword")}
            />
            {errors.repeatPassword && (
              <p className="px-1 text-red-400 text-xs mt-1">
                {errors.repeatPassword.message}
              </p>
            )}
          </div>

          {/* Submit */}
          <div className="flex justify-center mb-6">
            <button
              type="submit"
              disabled={registerMutation.isPending}
              className="px-12 py-3 border border-gold/50 text-ivory text-[11px] uppercase tracking-[0.35em] font-bold transition-all duration-300 hover:bg-gold/10 hover:border-gold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {registerMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mx-auto" />
              ) : (
                m["auth.signUp.form.submit"]()
              )}
            </button>
          </div>

          {/* Link */}
          <div className="flex items-center justify-center">
            <a
              href={SAFE_ROUTES.AUTH_SIGN_IN}
              className="text-[10px] uppercase tracking-[0.25em] text-ivory/35 hover:text-gold/80 transition-colors duration-200"
            >
              Already have an account
            </a>
          </div>
        </div>
      </form>
    </AuthFormWrapper>
  );
}
