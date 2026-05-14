import type { AuthUser, UserRole } from "@repo/server";
import { ChevronRight } from "lucide-react";
import { Link, useLocation } from "react-router";
import type { SideBarItem } from "~/hooks/use-sidebar";
import { useSideBar } from "~/hooks/use-sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../ui/collapsible";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "../ui/sidebar";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";

interface RecursiveSideBarItemProps {
  item: SideBarItem;
  user: AuthUser;
}

function RecursiveSideBarItem({ item, user }: RecursiveSideBarItemProps) {
  const pathname = useLocation().pathname;
  const { state } = useSidebar();
  const isActive = pathname === item.link;
  const hasActiveChild = item.links?.some(
    (link) =>
      pathname === link.link ||
      link.links?.some((subLink) => pathname === subLink.link),
  );

  if (!item.links?.length) {
    return (
      <Collapsible asChild defaultOpen={isActive} className="group/collapsible">
        <SidebarMenuItem>
          <SidebarMenuButton asChild tooltip={item.title} isActive={isActive}>
            <Link to={item.link ?? "#"} className="flex items-center">
              {item.icon && <item.icon className="mr-2 h-4 w-4" />}
              <span>{item.title}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </Collapsible>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Collapsible
          asChild
          defaultOpen={isActive || hasActiveChild}
          className="group/collapsible"
        >
          <SidebarMenuItem>
            <CollapsibleTrigger asChild>
              <SidebarMenuButton isActive={isActive || hasActiveChild}>
                {item.icon && <item.icon className="mr-2 h-4 w-4" />}
                <span>{item.title}</span>
                <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
              </SidebarMenuButton>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarMenuSub>
                {item.links
                  .filter((subItem) =>
                    hasAccess(
                      user,
                      subItem.for ?? [],
                      subItem.forServices ?? [],
                    ),
                  )
                  .map((subItem) => (
                    <SidebarMenuSubItem key={subItem.key}>
                      {subItem.links?.length ? (
                        <RecursiveSideBarItem item={subItem} user={user} />
                      ) : (
                        <SidebarMenuSubButton
                          asChild
                          isActive={pathname === subItem.link}
                        >
                          <Link to={subItem.link ?? "#"}>
                            {subItem.icon && (
                              <subItem.icon className="mr-2 h-4 w-4" />
                            )}
                            <span>{subItem.title}</span>
                          </Link>
                        </SidebarMenuSubButton>
                      )}
                    </SidebarMenuSubItem>
                  ))}
              </SidebarMenuSub>
            </CollapsibleContent>
          </SidebarMenuItem>
        </Collapsible>
      </TooltipTrigger>
      {state === "collapsed" && (
        <TooltipContent side="right" align="start" className="w-48 p-2">
          <div className="mb-2 border-b pb-2">
            <div className="flex items-center gap-2 font-medium">
              {item.icon && <item.icon className="h-4 w-4" />}
              <span>{item.title}</span>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            {item.links
              .filter(
                (subItem) => true,
                // hasAccess(user, subItem.for ?? [], subItem.forServices ?? []),
              )
              .map((subItem) => (
                <Link
                  key={subItem.key}
                  to={subItem.link ?? "#"}
                  className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent"
                >
                  {subItem.icon && <subItem.icon className="h-4 w-4" />}
                  <span>{subItem.title}</span>
                </Link>
              ))}
          </div>
        </TooltipContent>
      )}
    </Tooltip>
  );
}

interface AdminSideBarProps {
  user: AuthUser;
}

export function AdminSideBar({ user }: AdminSideBarProps) {
  const sideBarItems = useSideBar();
  return (
    <div className="space-y-6">
      {sideBarItems
        .filter((item) => hasAccess(user, item.for, item.forServices))
        .map((section) => {
          const Icon = section.icon;
          return (
            <SidebarGroup key={section.key}>
              <div className="flex items-center">
                {Icon && <Icon className="h-4 w-4" />}
                <SidebarGroupLabel className="bg-gradient-to-r from-primary to-black bg-clip-text font-black text-transparent text-xs uppercase dark:to-white">
                  {section.title}
                </SidebarGroupLabel>
              </div>
              <SidebarMenu>
                {(section.links ?? [])
                  .filter((item) =>
                    hasAccess(user, item.for ?? [], item.forServices ?? []),
                  )
                  .map((item) => (
                    <RecursiveSideBarItem
                      key={item.key}
                      item={item}
                      user={user}
                    />
                  ))}
              </SidebarMenu>
            </SidebarGroup>
          );
        })}
    </div>
  );
}

function hasAccess(
  user: AuthUser,
  roles: UserRole[] | undefined,
  services: string[] | undefined,
) {
  if (!roles?.length && !services?.length) return true;

  const hasRoleAccess = roles?.some((role) => user.role === role) ?? true;

  return hasRoleAccess;
}
