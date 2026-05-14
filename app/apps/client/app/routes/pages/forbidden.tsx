import { LogOut, XOctagon } from "lucide-react";
import { Logout } from "~/components/logout";
import { Button } from "~/components/ui/button";
import { getUserCtxOrRedirect } from "~/utils/auth";

interface LoaderArgs {
  request: Request;
}
export async function loader({ request }: LoaderArgs) {
  await getUserCtxOrRedirect(request);
  return null;
}

export default function ForbiddenPage() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-gray-500/50 px-4">
      <div className="w-full max-w-lg text-center">
        <div className="mb-8 flex justify-center">
          <XOctagon className="h-24 w-24 text-red-500" />
        </div>

        <h1 className="mb-4 font-bold text-6xl text-gray-900">403</h1>

        <h2 className="mb-4 font-semibold text-3xl text-gray-800">
          Access Forbidden
        </h2>

        <p className="mb-8 text-gray-600 text-lg">
          Sorry, you don&apos;t have permission to access this page. Please
          contact your administrator if you believe this is a mistake.
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
