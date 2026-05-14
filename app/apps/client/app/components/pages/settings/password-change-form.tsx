import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { authClient } from "~/lib/auth";

export const passwordChangeSchema = z.object({
  oldPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string().min(1, "Please confirm your password"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type PasswordFormData = z.infer<typeof passwordChangeSchema>;

export default function PasswordChangeForm() {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<PasswordFormData>({
    resolver: zodResolver(passwordChangeSchema),
  });

  const passwordChangeMutation = useMutation({
    mutationFn: async (pwdata: PasswordFormData) => {
      const { data, error } = await authClient.changePassword({
        newPassword: pwdata.newPassword,
        currentPassword: pwdata.oldPassword,
        revokeOtherSessions: true,
      });
      if (error) {
        throw error;
      }
      return data;
    },
    onSuccess: () => {
      toast.success("Password updated successfully");
      reset();
    },
    onError: (err) => {
      toast.error("Failed to update password", {
        description: "Please try again later",
      });
      console.error("Password change error:", err);
    },
  });

  const onSubmit = (data: PasswordFormData) => {
    if (data.oldPassword === data.newPassword) {
      toast.error("New password must be different from current password");
      return;
    }
    passwordChangeMutation.mutate(data);
  };

  return (
    <div className="border border-white/10 p-8 relative">
      <div className="absolute top-2 left-2 w-3 h-px bg-gold/40" />
      <div className="absolute top-2 left-2 w-px h-3 bg-gold/40" />
      <div className="absolute top-2 right-2 w-3 h-px bg-gold/40" />
      <div className="absolute top-2 right-2 w-px h-3 bg-gold/40" />
      <div className="absolute bottom-2 left-2 w-3 h-px bg-gold/40" />
      <div className="absolute bottom-2 left-2 w-px h-3 bg-gold/40" />
      <div className="absolute bottom-2 right-2 w-3 h-px bg-gold/40" />
      <div className="absolute bottom-2 right-2 w-px h-3 bg-gold/40" />

      <div className="flex items-center gap-3 mb-8">
        <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-gold/60">
          01 · Security
        </span>
        <div className="h-px flex-1 bg-gold/20" />
      </div>

      <h3
        className="font-serif text-2xl text-ivory mb-8 leading-tight"
        style={{ fontFamily: "Didot, Georgia, serif" }}
      >
        Change Password
      </h3>

      <form onSubmit={handleSubmit(onSubmit, console.error)} className="space-y-6">
        <div className="space-y-2">
          <label
            htmlFor="oldPassword"
            className="block text-[10px] font-bold uppercase tracking-[0.3em] text-ivory/50"
          >
            Current Password
          </label>
          <input
            id="oldPassword"
            placeholder="Enter current password"
            type="password"
            autoCapitalize="none"
            autoComplete="current-password"
            autoCorrect="off"
            disabled={passwordChangeMutation.isPending}
            className="w-full bg-white/5 border border-white/10 px-4 py-3 text-ivory placeholder:text-ivory/20 focus:outline-none focus:border-gold/50 transition-colors text-sm disabled:opacity-50"
            {...register("oldPassword")}
          />
          {errors?.oldPassword && (
            <p className="text-red-400 text-xs tracking-wide">
              {errors.oldPassword.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <label
            htmlFor="newPassword"
            className="block text-[10px] font-bold uppercase tracking-[0.3em] text-ivory/50"
          >
            New Password
          </label>
          <input
            id="newPassword"
            placeholder="Enter new password"
            type="password"
            autoCapitalize="none"
            autoComplete="new-password"
            autoCorrect="off"
            disabled={passwordChangeMutation.isPending}
            className="w-full bg-white/5 border border-white/10 px-4 py-3 text-ivory placeholder:text-ivory/20 focus:outline-none focus:border-gold/50 transition-colors text-sm disabled:opacity-50"
            {...register("newPassword")}
          />
          {errors?.newPassword && (
            <p className="text-red-400 text-xs tracking-wide">
              {errors.newPassword.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <label
            htmlFor="confirmPassword"
            className="block text-[10px] font-bold uppercase tracking-[0.3em] text-ivory/50"
          >
            Confirm New Password
          </label>
          <input
            id="confirmPassword"
            placeholder="Confirm new password"
            type="password"
            autoCapitalize="none"
            autoComplete="new-password"
            autoCorrect="off"
            disabled={passwordChangeMutation.isPending}
            className="w-full bg-white/5 border border-white/10 px-4 py-3 text-ivory placeholder:text-ivory/20 focus:outline-none focus:border-gold/50 transition-colors text-sm disabled:opacity-50"
            {...register("confirmPassword")}
          />
          {errors?.confirmPassword && (
            <p className="text-red-400 text-xs tracking-wide">
              {errors.confirmPassword.message}
            </p>
          )}
        </div>

        <div className="pt-4">
          <button
            type="submit"
            disabled={passwordChangeMutation.isPending}
            className="inline-flex items-center gap-2 px-8 py-3 bg-white/10 border border-white/10 text-[10px] font-bold uppercase tracking-[0.3em] text-ivory transition-all hover:bg-gold hover:border-gold hover:text-charcoal disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {passwordChangeMutation.isPending && (
              <Loader2 className="h-3 w-3 animate-spin" />
            )}
            {passwordChangeMutation.isPending ? "Updating..." : "Update Password"}
          </button>
        </div>
      </form>
    </div>
  );
}
