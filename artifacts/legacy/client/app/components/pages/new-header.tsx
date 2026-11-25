import { motion } from "framer-motion";
import { ChevronDown, LogOut, Menu } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router";
import { SAFE_ROUTES } from "~/safe-routes";
import type { AuthUser } from "@repo/server";
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "~/components/ui/sheet";
import { Logout } from "~/components/logout";

interface NewHeaderProps {
  user?: AuthUser | null;
}

const NAV_LINKS = [
  { to: SAFE_ROUTES.PROJECTS_LIBRARY, label: "NeoAlexandria" },
  { to: SAFE_ROUTES.PROJECTS_CONVERSATION, label: "Great Conversation" },
  { to: SAFE_ROUTES.PROJECTS_TREE, label: "Knowledge Tree" },
  { to: SAFE_ROUTES.TEAM, label: "Team" },
  { to: SAFE_ROUTES.MANIFESTO, label: "Manifesto" },
] as const;

export default function NewHeader({ user }: NewHeaderProps) {
  const [scrolled, setScrolled] = useState(false);
  const [isLargeViewport, setIsLargeViewport] = useState<boolean | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const { pathname } = useLocation();

  const isActive = (to: string) => pathname === to || pathname.startsWith(`${to}/`);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 40);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const mql = window.matchMedia("(min-width: 1024px)");
    function sync() {
      setIsLargeViewport(mql.matches);
    }
    sync();
    mql.addEventListener("change", sync);
    return () => mql.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  const isHomePage = pathname === SAFE_ROUTES.HOME;
  const hideUntilScroll = isLargeViewport === true && !scrolled && isHomePage;

  return (
    <motion.nav
      animate={{
        y: hideUntilScroll ? -100 : 0,
        opacity: hideUntilScroll ? 0 : 1,
      }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      className={`fixed top-0 z-40 flex h-16 w-full items-center backdrop-blur-md transition-colors sm:h-20 ${
        hideUntilScroll ? "pointer-events-none" : "pointer-events-auto"
      } ${scrolled ? "border-b border-white/10 bg-charcoal/85" : "border-b border-white/5 bg-charcoal/75"}`}
    >
      <div className="flex h-full items-center border-r border-white/10 px-4 sm:px-6 lg:px-8">
        <Link to={SAFE_ROUTES.HOME} className="group shrink-0">
          <span className="marquee-label text-base font-bold tracking-widest text-white sm:text-lg">
            <span className="transition-colors group-hover:text-gold">LEGACY</span>
          </span>
        </Link>
      </div>

      <nav className="hidden h-full flex-1 items-center justify-center gap-8 xl:gap-12 lg:flex">
        {NAV_LINKS.map(({ to, label }) => (
          <Link
            key={to}
            to={to}
            className={`text-[10px] font-bold uppercase tracking-[0.2em] transition-colors ${
              isActive(to) ? "text-gold" : "text-ivory/80 hover:text-ivory"
            }`}
          >
            {label}
          </Link>
        ))}
        {user?.role === "ADMIN" && (
          <details className="group relative flex h-full items-center">
            <summary className="cursor-pointer list-none text-[10px] font-bold uppercase tracking-[0.2em] text-gold transition-colors hover:text-ivory [&::-webkit-details-marker]:hidden">
              Admin
            </summary>
            <div className="absolute top-full right-0 z-50 min-w-52 border border-white/10 bg-charcoal p-2 shadow-xl">
              <Link
                to={SAFE_ROUTES.ADMIN_USERS}
                className="block px-3 py-3 text-[10px] font-bold uppercase tracking-[0.16em] text-ivory/80 transition-colors hover:bg-white/5 hover:text-gold"
              >
                User management
              </Link>
              <Link
                to={SAFE_ROUTES.ADMIN_KNOWLEDGE_TREE}
                className="block px-3 py-3 text-[10px] font-bold uppercase tracking-[0.16em] text-ivory/80 transition-colors hover:bg-white/5 hover:text-gold"
              >
                Knowledge Tree data
              </Link>
              <Link
                to={SAFE_ROUTES.ADMIN_GREAT_CONVERSATION}
                className="block px-3 py-3 text-[10px] font-bold uppercase tracking-[0.16em] text-ivory/80 transition-colors hover:bg-white/5 hover:text-gold"
              >
                Scholar connections
              </Link>
              <Link
                to={SAFE_ROUTES.PROJECTS_LIBRARY}
                className="block px-3 py-3 text-[10px] font-bold uppercase tracking-[0.16em] text-ivory/80 transition-colors hover:bg-white/5 hover:text-gold"
              >
                Update a library text
              </Link>
            </div>
          </details>
        )}
      </nav>

      <div className="ml-auto flex h-full shrink-0 items-stretch">
        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetTrigger asChild>
            <button
              type="button"
              className="flex h-full items-center justify-center px-3 text-ivory transition-colors hover:text-gold lg:hidden"
              aria-label="Open menu"
            >
              <Menu className="size-6" strokeWidth={1.75} />
            </button>
          </SheetTrigger>
          <SheetContent
            side="right"
            className="border-white/10 bg-charcoal text-ivory sm:max-w-sm [&>button]:text-ivory [&>button]:hover:text-white"
          >
            <SheetHeader className="border-b border-white/10 text-left">
              <SheetTitle className="font-bold tracking-widest text-white">Menu</SheetTitle>
            </SheetHeader>
            <nav className="flex flex-col gap-1 px-4 py-6">
              {NAV_LINKS.map(({ to, label }) => (
                <SheetClose asChild key={to}>
                  <Link
                    to={to}
                    className={`rounded-md px-3 py-3 text-sm font-bold uppercase tracking-[0.2em] transition-colors ${
                      isActive(to)
                        ? "bg-white/10 text-gold"
                        : "text-ivory/80 hover:bg-white/5 hover:text-ivory"
                    }`}
                  >
                    {label}
                  </Link>
                </SheetClose>
              ))}
              {user?.role === "ADMIN" && (
                <>
                  <SheetClose asChild>
                    <Link
                      to={SAFE_ROUTES.ADMIN_USERS}
                      className="rounded-md px-3 py-3 text-sm font-bold uppercase tracking-[0.2em] text-gold transition-colors hover:bg-white/5 hover:text-ivory"
                    >
                      Admin · User management
                    </Link>
                  </SheetClose>
                  <SheetClose asChild>
                    <Link
                      to={SAFE_ROUTES.ADMIN_KNOWLEDGE_TREE}
                      className="rounded-md px-3 py-3 text-sm font-bold uppercase tracking-[0.2em] text-gold transition-colors hover:bg-white/5 hover:text-ivory"
                    >
                      Admin · Knowledge Tree data
                    </Link>
                  </SheetClose>
                  <SheetClose asChild>
                    <Link
                      to={SAFE_ROUTES.ADMIN_GREAT_CONVERSATION}
                      className="rounded-md px-3 py-3 text-sm font-bold uppercase tracking-[0.2em] text-gold transition-colors hover:bg-white/5 hover:text-ivory"
                    >
                      Admin · Scholar connections
                    </Link>
                  </SheetClose>
                  <SheetClose asChild>
                    <Link
                      to={SAFE_ROUTES.PROJECTS_LIBRARY}
                      className="rounded-md px-3 py-3 text-sm font-bold uppercase tracking-[0.2em] text-gold transition-colors hover:bg-white/5 hover:text-ivory"
                    >
                      Admin · Update a library text
                    </Link>
                  </SheetClose>
                </>
              )}
            </nav>
            {user && (
              <div className="border-t border-white/10 px-4 pt-4">
                <Logout>
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 rounded-md px-3 py-3 text-sm font-bold uppercase tracking-[0.2em] text-ivory/80 transition-colors hover:bg-white/5 hover:text-ivory"
                  >
                    <LogOut size={16} aria-hidden="true" />
                    Log out
                  </button>
                </Logout>
              </div>
            )}
          </SheetContent>
        </Sheet>

        {user ? (
          <>
            <Link to={SAFE_ROUTES.MY_RECORD} className="flex h-full items-stretch">
              <button
                type="button"
                className="flex h-full min-w-0 max-w-[50vw] items-center justify-center gap-2 bg-white/10 px-4 text-[10px] font-bold uppercase tracking-widest text-white transition-all hover:bg-gold hover:text-charcoal sm:min-w-[140px] sm:max-w-none sm:px-8 lg:min-w-[180px]"
              >
                <span className="truncate">{user.name}</span>
                <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-charcoal/20 text-current">
                  <ChevronDown size={12} className="-rotate-90" />
                </div>
              </button>
            </Link>
            <Logout className="flex h-full">
              <button
                type="button"
                aria-label="Log out"
                title="Log out"
                className="flex h-full items-center justify-center gap-2 border-l border-white/10 px-3 text-ivory/75 transition-colors hover:bg-white/10 hover:text-gold sm:px-4"
              >
                <LogOut size={16} aria-hidden="true" />
                <span className="hidden text-[10px] font-bold uppercase tracking-widest sm:inline">
                  Log out
                </span>
              </button>
            </Logout>
          </>
        ) : (
          <Link to={SAFE_ROUTES.SIGN_IN} className="flex h-full items-stretch">
            <button
              type="button"
              className="flex h-full items-center justify-center gap-2 bg-white/10 px-4 text-[10px] font-bold uppercase tracking-widest text-white transition-all hover:bg-gold hover:text-charcoal sm:px-8"
            >
              <span className="whitespace-nowrap">SIGN IN/UP</span>
              <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-charcoal/20 text-current">
                <ChevronDown size={12} className="-rotate-90" />
              </div>
            </button>
          </Link>
        )}
      </div>
    </motion.nav>
  );
}
