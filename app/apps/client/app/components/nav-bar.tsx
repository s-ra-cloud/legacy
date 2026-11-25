import type { AuthUser } from "@repo/server";
import { BellIcon, Loader2Icon } from "lucide-react";
import { useLayoutEffect, useState } from "react";
import { Link } from "react-router";
import { cn } from "~/lib/utils";
import { SAFE_ROUTES } from "~/safe-routes";
import { MainClientMenu } from "./nav/menu";
import { NotificationCenter } from "./notification/center";
import ProfileDropdown from "./pages/profile/profile-dropdown";
import { Button } from "./ui/button";
import { CONFIG } from "~/utils/config";

interface NavigationBarProps {
  title?: string;
  className?: string;
  user: AuthUser;
}

function NavigationBar({ className, user }: NavigationBarProps) {
  const [scrolled, setScrolled] = useState<boolean>(false);
  useLayoutEffect(() => {
    const handleScroll = (): void => {
      const isScrolled = window.scrollY > 50;
      if (isScrolled !== scrolled) {
        setScrolled(isScrolled);
      }
    };

    window.addEventListener("scroll", handleScroll);
    handleScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [scrolled]);

  return (
    <div
      className={cn(
        "fixed top-0 z-30 w-full transition-all duration-300",
        scrolled ? "bg-white/80 backdrop-blur-md " : "bg-white/80",
        className,
      )}
    >
      <div
        className={cn(
          "!px-6 flex items-center justify-between duration-300",
          scrolled ? " py-3.5" : "!py-4",
        )}
      >
        <Link to={SAFE_ROUTES.HOME}>
          <img src={CONFIG.logo} alt="Logo" className="w-20 md:w-24" />
        </Link>
        <MainClientMenu />
        <div className="flex items-center gap-4">
          <NotificationCenter>
            {(unseenCount, status) => (
              <Button size="icon" className="rounded-full" variant="outline">
                <BellIcon size={20} />
                <div className="absolute end-0 top-0">
                  {status === "success" && unseenCount !== 0 && (
                    <span className="block size-4 rounded-full bg-destructive text-xs">
                      {unseenCount}
                    </span>
                  )}
                  {status === "pending" && (
                    <Loader2Icon className="animate-spin" size={10} />
                  )}
                  {status === "error" && (
                    <span
                      title="Erreur"
                      className="block size-4 rounded-full bg-red-500 text-xs"
                    >
                      !
                    </span>
                  )}
                </div>
              </Button>
            )}
          </NotificationCenter>

          <ProfileDropdown user={user} />
        </div>
      </div>
    </div>
  );
}

export default NavigationBar;
