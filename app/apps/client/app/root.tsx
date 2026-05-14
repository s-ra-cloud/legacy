import type { Route } from "./+types/root";

import { NuqsAdapter } from "nuqs/adapters/react-router/v7";
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  isRouteErrorResponse,
  type MetaFunction,
} from "react-router";
import { Toaster } from "sonner";
import { TopLoader } from "./components/common/top-loader";
import { NotFoundPage } from "./components/pages/not-found";
import { baseLocale, isLocale } from "./paraglide/runtime";
import { ReactQueryProvider } from "./providers/react-query-provider";
import { FAVICON_HREF } from "./lib/favicon-href";
import "./app.css";

export const links: Route.LinksFunction = () => [
  { rel: "icon", href: FAVICON_HREF, type: "image/svg+xml" },
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

export const meta: MetaFunction = () => [{ title: "Legacy" }];

export function loader({ request }: Route.LoaderArgs) {
  // Root has no `:locale` route param — optional prefix e.g. `/de/home` if first segment is a locale.
  const first = new URL(request.url).pathname.split("/").filter(Boolean)[0];
  const locale = first !== undefined && isLocale(first) ? first : baseLocale;
  return { locale };
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

export default function App(_props: Route.ComponentProps) {
  return (
    <NuqsAdapter>
      <ReactQueryProvider>
        <Outlet />
      </ReactQueryProvider>
    </NuqsAdapter>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  const is404 =
    isRouteErrorResponse(error) && error.status === 404;

  if (is404) {
    return <NotFoundPage />;
  }

  let message = "Oops!";
  let details = "An unexpected error occurred.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = "Error";
    details = error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-charcoal px-6 py-16 text-ivory">
      <div className="w-full max-w-lg rounded-lg border border-white/10 bg-white/[0.03] p-8 backdrop-blur-md">
        <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-gold/70">
          Something went wrong
        </p>
        <h1 className="mt-4 font-serif text-3xl tracking-tight">{message}</h1>
        <p className="mt-3 text-sm text-ivory/60">{details}</p>
        {stack && (
          <pre className="mt-6 max-h-64 w-full overflow-x-auto overflow-y-auto rounded-md border border-white/10 bg-black/40 p-4 text-left text-xs text-ivory/80">
            <code>{stack}</code>
          </pre>
        )}
      </div>
    </main>
  );
}
