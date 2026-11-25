import { useMutation } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { authClient } from "~/lib/auth";
import { SAFE_ROUTES } from "~/safe-routes";

interface LogoutProps {
  children: ReactNode;
  className?: string;
}

export function Logout({ children, className }: LogoutProps) {
  const navigate = useNavigate();
  const logoutMutation = useMutation({
    mutationFn: async () => {
      const { error } = await authClient.signOut();
      if (error) throw error as unknown as Error;
    },
    onError: (_: unknown) => {
      toast.error("Something went wrong");
    },
    onSuccess: () => {
      navigate(SAFE_ROUTES.HOME);
    },
  });

  return (
    <div onClick={() => logoutMutation.mutate()} className={className}>
      {children}
    </div>
  );
}
