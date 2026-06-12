import { protectAuthRoute } from "~/utils/auth";
import type { Route } from "./+types/sign-up";
import { AuthPageShell } from "./_components/auth-page-shell";
import RegisterForm from "./_components/register-form";

export async function loader({ request }: Route.LoaderArgs) {
  await protectAuthRoute(request);
  return null;
}

export default function SignUpPage() {
  return (
    <AuthPageShell
      volumeLabel="Vol. I · Enlistment"
      title={
        <>
          Sign U<span className="text-gold">p</span>
        </>
      }
      subtitle="The Hidden Networks"
      cardClassName="max-w-lg"
    >
      <RegisterForm />
    </AuthPageShell>
  );
}
