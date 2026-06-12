import { protectAuthRoute } from "~/utils/auth";
import type { Route } from "./+types/sign-in";
import { AuthPageShell } from "./_components/auth-page-shell";
import LoginForm from "./_components/login-form";

export async function loader({ request }: Route.LoaderArgs) {
  await protectAuthRoute(request);
  return null;
}

export default function SignIn() {
  return (
    <AuthPageShell
      volumeLabel="Vol. I · Archive"
      title={
        <>
          Sign I<span className="text-gold">n</span>
        </>
      }
      subtitle="The Hidden Networks"
    >
      <LoginForm />
    </AuthPageShell>
  );
}
