import { LogOut, Ban } from "lucide-react";
import { redirect } from "react-router";
import { Logout } from "~/components/logout";
import { Button } from "~/components/ui/button";
import { getUserOrNull } from "~/utils/auth";

interface LoaderArgs {
  request: Request;
}

export async function loader({ request }: LoaderArgs) {
  const user = await getUserOrNull(request);
  // If user is authenticated and their account is not disabled, redirect to home
  if (user && user.status !== "DISABLED") {
    throw redirect("/home");
  }
  return null;
}

export default function AccountDisabledPage() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-gray-500/50 px-4">
      <div className="w-full max-w-lg text-center">
        <div className="mb-8 flex justify-center">
          <Ban className="h-24 w-24 text-orange-500" />
        </div>

        <h1 className="mb-4 font-bold text-6xl text-gray-900">Account Disabled</h1>

        <h2 className="mb-4 font-semibold text-3xl text-gray-800">
          Your account has been disabled
        </h2>

        <p className="mb-8 text-gray-600 text-lg">
          Your account is currently disabled. Please contact an administrator to
          regain access to your account.
        </p>

        <div className="flex flex-col justify-center space-y-4 sm:flex-row sm:space-x-4 sm:space-y-0">
          <Logout className="mt-4">
            <Button variant="destructive">
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </Logout>
        </div>
      </div>
    </div>
  );
}

