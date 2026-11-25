import { useMutation } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import * as React from "react";
import { z } from "zod";
import Apple from "~/components/brand/apple-icon";
import Facebook from "~/components/brand/facebook-icon";
import Google from "~/components/brand/google-icon";
import { Button } from "~/components/ui/button";
import { authClient } from "~/lib/auth";
import { cn } from "~/lib/utils";
import { m } from "~/paraglide/messages";

export const userAuthSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

interface UserAuthFormProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
}

export function AuthFormWrapper({
  className,
  children,
  ...props
}: UserAuthFormProps) {
  const googleMutation = useMutation({
    mutationFn: async () => {
      return await authClient.signIn.social({
          provider: "google",
          callbackURL: `${window.location.origin}/`,
      });
    },
  });
  return (
    <div className={cn("grid gap-6", className)} {...props}>
      {children}
      {/* <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            {m["auth.social.continueWith"]()}
          </span>
        </div>
      </div> */}

      <div className="flex flex-col space-y-2">
        {/* <SocialLoginButton
          provider={m["auth.social.providers.apple"]()}
          variant="outline"
          onClick={() => {}}
        >
          <Apple className="h-4 w-4 text-white" />
        </SocialLoginButton> */}
        {/* <SocialLoginButton
          provider={m["auth.social.providers.google"]()}
          variant="outline"
          onClick={(e) => {
            e.stopPropagation();
            googleMutation.mutate();
          }}
        >
          <Google className="h-4 w-4" />
        </SocialLoginButton> */}
        {/* <SocialLoginButton
          provider={m["auth.social.providers.facebook"]()}
          variant="outline"
          onClick={() => {}}
        >
          <Facebook className="h-4 w-4" />
        </SocialLoginButton> */}
      </div>
    </div>
  );
}

function SocialLoginButton({
  disabled,
  className,
  onClick,
  children,
  provider,
  ...props
}: React.ComponentProps<typeof Button> & { provider: string }) {
  const [isLoading, setIsLoading] = React.useState<boolean>(false);

  return (
    <Button
      {...props}
      className={cn("space-x-2", className)}
      onClick={(e) => {
        setIsLoading(true);
        onClick?.(e);
      }}
      disabled={isLoading || disabled}
    >
      {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : children}
      <span>{provider}</span>
    </Button>
  );
}
