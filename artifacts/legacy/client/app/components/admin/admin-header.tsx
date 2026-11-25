import { Separator } from "~/components/ui/separator";
import { SidebarTrigger } from "../ui/sidebar";
import { DashboardBreadcrumb } from "./breadcrumb";
// import { SidebarTrigger } from '~/components/ui/sidebar';

interface Props {
  children?: React.ReactNode;
  items: {
    title: string;
    link?: string;
  }[];
}

export function AdminHeader({ children, items }: Props) {
  return (
    <header className="flex h-16 shrink-0 items-center gap-2 border-b bg-sidebar transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
      <div className="flex w-full items-center gap-2 px-8">
        {/* <SidebarTrigger className="-ml-1" /> */}
        {/* <PanelLeftIcon className="h-4 w-4" /> */}
        <Separator orientation="vertical" className="mr-2 h-4" />
        <DashboardBreadcrumb items={items} />
        <div className="grow"></div>
        {children}
      </div>
    </header>
  );
}
