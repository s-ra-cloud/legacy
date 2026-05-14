import type { NotificationCountUnseenOutput } from "@repo/server";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "~/components/ui/sheet";
import { NotificationList } from "./list";

export function NotificationCenter({
  children,
}: {
  children: (
    unseenCount: number,
    status: "pending" | "error" | "success",
  ) => ReactNode;
}) {
  const oldUnseenCount = useRef(-1);
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const notificationUnseen = useQuery({
    queryKey: ["notifications", "count"],
    queryFn: async () => {
      return fetch("/api/v1/notifications/count-unseen").then(
        (res) => res.json() as Promise<NotificationCountUnseenOutput>,
      );
    },
    refetchInterval: 1000 * 10,
  });

  const unseenCount = notificationUnseen.data?.count ?? 0;

  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  useEffect(() => {
    if (oldUnseenCount.current === -1) {
      oldUnseenCount.current = unseenCount;
    }
    // const audio = new Audio("/assets/notif.wav");
    if (unseenCount > oldUnseenCount.current) {
      oldUnseenCount.current = unseenCount;
      queryClient
        .invalidateQueries({ queryKey: ["notifications"] })
        .catch(console.error);

      // audio.play().catch(console.error);
    }
  }, [unseenCount]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {children(unseenCount, notificationUnseen.status)}
      </SheetTrigger>
      <SheetContent
        // side="left"
        className="flex flex-col gap-0 p-0 md:w-[400px] md:min-w-[400px]"
      >
        <SheetHeader className="p-4 text-start">
          <SheetTitle>Notifications</SheetTitle>
        </SheetHeader>
        <div className="flex flex-1 flex-col overflow-hidden">
          <NotificationList close={() => setOpen(false)} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
