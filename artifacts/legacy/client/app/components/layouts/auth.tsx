import { Link, Outlet } from "react-router";
import { SAFE_ROUTES } from "~/safe-routes";
import { CONFIG } from "~/utils/config";

type AuthLayoutProps = { phantom?: unknown };

export default function AuthLayout(_props: AuthLayoutProps) {
  return (
    <div className="flex h-dvh">
      <div className="lg:!block relative hidden lg:w-1/2">
        <img
          src={CONFIG.auth.login.bg}
          alt="Modern corporate headquarters"
          className="absolute inset-0 z-0 size-full object-cover object-center"
          style={{
            filter: "contrast(1.05) brightness(0.85)",
          }}
        />
        <div className="absolute inset-0 z-10 " />
        <div className="absolute inset-0 z-20 flex flex-col p-16 text-white">
          <div className="flex items-center space-x-6">
            <img
              src={CONFIG.logo}
              alt="Logo"
              width={50}
              height={50}
              className="rounded-lg drop-shadow-lg filter transition-opacity hover:opacity-90"
            />
            <div className="border-white/20 border-l-2 pl-6">
              <h2 className="text-[#3d4831] font-semibold text-2xl tracking-wide">
                {CONFIG.name}
              </h2>
            </div>
          </div>

          <div className="mx-auto mt-48 max-w-lg text-center">
            <p className="mb-2 font-bold text-3xl">{CONFIG.title}</p>
            <p className="text-[15px] text-white/80 leading-relaxed">
              {CONFIG.description}
            </p>
          </div>

          <div className="flex-grow" />

          <div className="flex items-center justify-center gap-8">
            <Link
              to={SAFE_ROUTES.CONTACT_US}
              className="flex items-center gap-2 text-sm transition-colors hover:text-primary"
            >
              <span className="h-1 w-1 rounded-full bg-white/60" />
              Contactez-nous
            </Link>
            <Link
              to={SAFE_ROUTES.PRIVACY_POLICY}
              className="flex items-center gap-2 text-sm transition-colors hover:text-primary"
            >
              <span className="h-1 w-1 rounded-full bg-white/60" />
              Politique de confidentialité
            </Link>
          </div>
        </div>
      </div>

      <div className="relative flex w-full items-center justify-center bg-gradient-to-b from-primary/10 via-white to-primary/10 px-4 py-8 sm:px-6 md:px-8 lg:ml-auto lg:w-1/2">
        <div className="absolute top-0 left-0 h-32 w-full bg-gradient-to-b from-emerald-600/5 to-transparent lg:hidden" />

        <div className="relative w-full max-w-lg space-y-8">
          <Outlet />
        </div>

        <div className="absolute bottom-8 left-0 flex w-full flex-wrap justify-center gap-6 pt-6 lg:hidden">
          <div className="center basis-full drop-shadow-sm filter sm:basis-[unset]">
            <img src={CONFIG.logo} alt="Company Logo" width={85} height={85} /> {/* //logo should be on top left */}
          </div>
          <Link
            to={SAFE_ROUTES.CONTACT_US}
            className="text-primaryColor text-sm hover:underline"
          >
            Contactez-nous
          </Link>
          <Link
            to={SAFE_ROUTES.PRIVACY_POLICY}
            className="text-primaryColor text-sm hover:underline"
          >
            Politique de confidentialité
          </Link>
        </div>
      </div>
    </div>
  );
}
