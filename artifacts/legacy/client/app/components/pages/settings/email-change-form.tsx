import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { StyledButton } from "~/components/extended-ui/Button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";

export const emailChangeSchema = z.object({
  oldEmail: z.string().email("Please enter a valid email address"),
  newEmail: z.string().email("Please enter a valid email address"),
});

type EmailFormData = z.infer<typeof emailChangeSchema>;

export default function EmailChangeForm() {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<EmailFormData>({
    resolver: zodResolver(emailChangeSchema),
  });

  const emailChangeMutation = useMutation({
    mutationFn: async (data: EmailFormData) => {
      // TODO: Replace with actual API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      console.log("Email change data:", data);
      return data;
    },
    onSuccess: () => {
      toast.success("Email updated successfully");
      reset();
    },
    onError: (err) => {
      toast.error("Failed to update email", {
        description: "Please try again later",
      });
      console.error("Email change error:", err);
    },
  });

  const onSubmit = (data: EmailFormData) => {
    if (data.oldEmail === data.newEmail) {
      toast.error("New email must be different from current email");
      return;
    }
    emailChangeMutation.mutate(data);
  };

  return (
    <div className="text-[20px] sm:text-[28px] max-w-6xl mx-auto px-4 sm:px-8">
      <div className="sm:px-4">
        <h3 className="text-[24px] sm:text-[32px] font-serif font-bold mb-8 tracking-wide">
          Change Email Address
        </h3>

        <form onSubmit={handleSubmit(onSubmit, console.error)}>
          <div className="grid gap-2">
            <div className="grid gap-1 mb-8">
              <Label className="text-xl" htmlFor="oldEmail">
                Current academic email:
              </Label>
              <Input
                id="oldEmail"
                placeholder="Current email"
                type="email"
                autoCapitalize="none"
                autoComplete="email"
                autoCorrect="off"
                disabled={emailChangeMutation.isPending}
                className="w-4/5 p-4 border border-black rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                {...register("oldEmail")}
              />
              {errors?.oldEmail && (
                <p className="px-1 text-red-600 text-xs">
                  {errors.oldEmail.message}
                </p>
              )}
            </div>

            <div className="grid gap-1 mb-8">
              <Label className="text-xl" htmlFor="newEmail">
                New academic email:
              </Label>
              <Input
                id="newEmail"
                placeholder="New email"
                type="email"
                autoCapitalize="none"
                autoComplete="email"
                autoCorrect="off"
                disabled={emailChangeMutation.isPending}
                className="w-4/5 p-4 border border-black rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                {...register("newEmail")}
              />
              {errors?.newEmail && (
                <p className="px-1 text-red-600 text-xs">
                  {errors.newEmail.message}
                </p>
              )}
            </div>

            <div className="text-center mt-12">
              <StyledButton
                className="py-3 px-10"
              >
                {emailChangeMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {!emailChangeMutation.isPending && "Update Email"}
              </StyledButton>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
