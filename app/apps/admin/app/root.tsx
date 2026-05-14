import type { Route } from "./+types/root";

import { NuqsAdapter } from "nuqs/adapters/react-router/v7";
import { createContext, useContext } from "react";
import {
  Link,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  isRouteErrorResponse,
} from "react-router";
import { Toaster } from "sonner";
import { TopLoader } from "./components/common/top-loader";
import {
  assertIsLocale,
  baseLocale,
  isLocale,
  overwriteGetLocale,
} from "./paraglide/runtime";
import { ReactQueryProvider } from "./providers/react-query-provider";
import "./app.css";
import { HomeIcon } from "lucide-react";
import { Button } from "./components/ui/button";
import { SAFE_ROUTES } from "./safe-routes";

export const links: Route.LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
  },
];

export function loader(args: Route.LoaderArgs) {
  return {
    // detect the locale from the path. if no locale is found, the baseLocale is used.
    // e.g. /de will set the locale to "de"
    locale: isLocale(args.params.locale) ? args.params.locale : baseLocale,
  };
}

const LocaleContextSSR = createContext(baseLocale);
if (import.meta.env.SSR) {
  overwriteGetLocale(() => assertIsLocale(useContext(LocaleContextSSR)));
}

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        <TopLoader />
        <Toaster richColors />
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App(props: Route.ComponentProps) {
  return (
    <NuqsAdapter>
      <ReactQueryProvider>
        <LocaleContextSSR.Provider value={props.loaderData.locale}>
          <Outlet />
        </LocaleContextSSR.Provider>
        <ScrollRestoration />
      </ReactQueryProvider>
    </NuqsAdapter>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "Oops!";
  let details = "An unexpected error occurred.";
  let title = "An error occurred";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    if (error.status === 404) {
      message = "404";
      title = "The requested page could not be found.";
      details =
        "Désolé, nous n'avons pas pu trouver la page que vous recherchez. La page a peut-être été supprimée ou le lien est peut-être cassé.";
    }
    if (error.status === 403) {
      message = "403";
      title = "You are not authorized to access this page.";
      details =
        "Please contact the administrator for assistance to grant you access.";
    }
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4">
        <div className="max-w-lg space-y-6 text-center">
          {/* Large 404 text */}
          <h1 className="font-bold text-8xl text-gray-900">{message}</h1>

          {/* Error message */}
          <div className="space-y-2">
            <h2 className="font-semibold text-2xl text-gray-800">{title}</h2>
            <p className="text-gray-600">{details}</p>
          </div>

          {/* Return home button */}
          <Link
            to={SAFE_ROUTES.HOME}
            className="inline-flex items-center gap-2 "
          >
            <Button className="px-6 py-3">
              <HomeIcon size={20} />
              {"Retour à l'accueil"}
            </Button>
          </Link>
        </div>
      </div>
    </main>
  );
}
