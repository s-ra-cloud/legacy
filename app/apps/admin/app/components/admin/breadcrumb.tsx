import React from "react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "~/components/ui/breadcrumb";

interface DashboardBreadcrumbProps {
  items: {
    title: string;
    link?: string;
  }[];
}

export function DashboardBreadcrumb({ items }: DashboardBreadcrumbProps) {
  return (
    <Breadcrumb>
      <BreadcrumbList>
        {items.map((it, i) => (
          <React.Fragment key={it.title + it.link}>
            <BreadcrumbItem>
              <BreadcrumbLink href={it.link ?? ""}>{it.title}</BreadcrumbLink>
            </BreadcrumbItem>
            {i + 1 !== items.length && <BreadcrumbSeparator />}
          </React.Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
