import type { AuthUser } from "@repo/server";
import type * as React from "react";
import { useState } from "react";

import { Link } from "react-router";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  useSidebar,
} from "~/components/ui/sidebar";
import { cn } from "~/lib/utils";
import { SAFE_ROUTES } from "~/safe-routes";
import { NavUser } from "../nav-user";
import { AdminSideBar } from "../nav/admin-menu";
import { CONFIG } from "~/utils/config";
import { SearchIcon, SettingsIcon, UserIcon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { mediaIdToImageUrl } from "~/lib/api/client";
import { NotificationCenter } from "../notification/center";
import EditProfileDialog from "../pages/profile/edit-profile";
import { SearchDialog } from "./srch";
import { UserPreferencesDialog } from "./pref";

type AppSidebarProps = React.ComponentProps<typeof Sidebar> & {
  user: AuthUser;
};

export default function AppSidebar({ user, ...props }: AppSidebarProps) {
  const { state } = useSidebar();
  const [isDialogOpen, setIsDialogOpen] = useState(false);


  const collapsed = state === "collapsed";
  const userImage = user.imageId
    ? `${mediaIdToImageUrl(user.imageId)}`
    : "https://letsenhance.io/static/73136da51c245e80edc6ccfe44888a99/1015f/MainBefore.jpg";
  return (
    <div className="relative z-20">
      <Sidebar collapsible="icon" {...props} className="">
        <SidebarHeader>
          <div
            className={cn(
              "sticky top-0 flex w-full cursor-pointer items-center space-x-2 transition-all",
              collapsed && "px-[2px]",
            )}
          >
            {!collapsed && (
              <div className="grow">
                <div className="flex w-full items-center justify-between truncate ps-2">
                  <div>
                    <p
                      title={user.name}
                      className="truncate font-bold uppercase"
                    >
                      {user.name}
                    </p>
                  </div>
                </div>
              </div>
            )}
            <NotificationCenter>
              {(unseenCount) => {
                return (
                  <div className="relative size-10">
                    {unseenCount !== undefined && unseenCount !== 0 && (
                      <div className="absolute inset-0 z-10 block size-4 bg-red-500 text-center text-white text-xs">
                        {unseenCount > 9 ? "+9" : unseenCount}
                      </div>
                    )}
                    <Avatar className="size-10 rounded-sm">
                      <AvatarImage
                        className="object-cover"
                        src={userImage}
                        alt={user.name}
                      />
                      <AvatarFallback className="size-10 rounded-sm">
                        {user.name
                          .split(" ")
                          .map((name) => name.charAt(0))
                          .slice(0, 2)
                          .join("")}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                );
              }}
            </NotificationCenter>
          </div>

          <div></div>
        </SidebarHeader>
        <SidebarContent className="no-scrollbar">
          <AdminSideBar user={user} />
        </SidebarContent>
        <SidebarFooter className="flex items-center justify-between p-0">
          <div
            className={cn(
              "flex w-full items-center justify-between bg-primary/10 px-2 py-3 text-primary text-xs",
            )}
          >
            <EditProfileDialog
              user={user}
              open={isDialogOpen}
              onOpenChange={setIsDialogOpen}
            >
              <button type="button" className="min-w-10 flex items-center">
                <UserIcon className="mr-1 h-4 w-4" />
              </button>
            </EditProfileDialog>

            <SearchDialog>
              <button type="button" className="min-w-10">
                <SearchIcon className="mr-1 h-4 w-4" />
              </button>
            </SearchDialog>

            <UserPreferencesDialog>
              <button type="button" className="min-w-10">
                <SettingsIcon className="mr-1 h-4 w-4" />
              </button>
            </UserPreferencesDialog>
            <div className="grow"></div>
            <div>v1.0</div>
          </div>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
    </div>
  );
}


// export default function AppSidebar({ user, ...props }: AppSidebarProps) {
//   const { state } = useSidebar();

//   return (
//     <div className="relative">
//       <Sidebar collapsible="icon" {...props} className="">
//         <SidebarHeader>
//           {state === "collapsed" ? <DashboardLogoCollap /> : <DashboardLogo />}
//         </SidebarHeader>
//         <SidebarContent className="no-scrollbar">
//           <AdminSideBar user={user} />
//         </SidebarContent>
//         <SidebarFooter className="flex items-center justify-between">
//           <div
//             className={cn(
//               "flex w-full items-center justify-between gap-2",
//               state === "collapsed" && "flex-col-reverse",
//             )}
//           >
//             <NavUser user={user} />
//           </div>
//         </SidebarFooter>
//         <SidebarRail />
//       </Sidebar>
//     </div>
//   );
// }

// function DashboardLogo() {
//   return (
//     <Link to={SAFE_ROUTES.HOME}>
//       <img src={CONFIG.logo} alt="Logo" className="w-20 md:w-24" />
//     </Link>
//   );
// }

// function DashboardLogoCollap() {
//   return (
//     <Link to={SAFE_ROUTES.HOME}>
//       <img src={CONFIG.logo} alt="Logo" className="w-20 md:w-24" />
//     </Link>
//   );
// }
