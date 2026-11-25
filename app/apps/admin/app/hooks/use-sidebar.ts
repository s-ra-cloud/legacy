import type { AuthUser } from "@repo/server";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangleIcon,
  BuildingIcon,
  CalendarIcon,
  ChartNoAxesCombinedIcon,
  FileTextIcon,
  HomeIcon,
  LandPlotIcon,
  MonitorPlayIcon,
  RefreshCwIcon,
  UploadIcon,
  UserMinusIcon,
  UserXIcon,
  Users2Icon,
  UsersIcon,
  WrenchIcon,
} from "lucide-react";
import { SAFE_ROUTES } from "~/safe-routes";
import { useTheme } from "./use-theme";

export interface SideBarItem {
  key: string;
  for?: AuthUser["role"][];
  forServices?: string[];
  title: string;
  link?: string;
  isActive?: boolean;
  links?: SideBarItem[];
  icon?: LucideIcon;
}

export function useSideBar(): SideBarItem[] {
  useTheme();
  return [
    {
      key: "home",
      title: "",
      for: ["ADMIN"],
      links: [
        {
          key: "Accueil",
          title: "Accueil",
          link: SAFE_ROUTES.HOME,
          icon: HomeIcon,
        },
      ],
    },
    {
      key: "content",
      title: "content",
      for: ["ADMIN"],
      links: [
        {
          key: "Paths",
          title: "Paths",
          link: "#",
          icon: LandPlotIcon,
        },
        {
          key: "Levels",
          title: "Levels",
          link: "#",
          icon: ChartNoAxesCombinedIcon,
        },
        {
          key: "Lessons",
          title: "Lessons",
          link: "#",
          icon: BuildingIcon,
        },
        {
          key: "Media managements",
          title: "Media managements",
          link: "#",
          icon: MonitorPlayIcon,
        },
      ],
    },
    {
      key: "settings",
      title: "Settings",
      for: ["ADMIN"],
      links: [
        {
          key: "user",
          title: "Users",
          for: [],
          link: SAFE_ROUTES.ADMIN_USERS,
          icon: Users2Icon,
        },
      ],
    },
  ] satisfies SideBarItem[];
}
