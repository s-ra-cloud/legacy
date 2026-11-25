import type {
  NotificationUpdateInput,
  NotificationUpdateOutput,
} from "@repo/server";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import type { ComponentProps } from "react";
import { useState } from "react";
import { useNavigate } from "react-router";
import { Tabs, TabsList, TabsTrigger } from "~/components/ui/tabs2";
import { cn } from "~/lib/utils";
import { Button } from "../ui/button";
import InfiniteScroll from "../ui/infinite-scroll";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { NotificationCard } from "./card";
import { EmptyNotifications } from "./empty";
import { NotificationError } from "./error";
import { NotificationSkeleton } from "./skeleton";

const notificationTags = ["ACCOUNT"] as const;

type NotificationTags = (typeof notificationTags)[number];

export type FilterType = "unread" | "read" | "archived" | null;

interface NotificationListProps {
  close: () => void;
}

function MarkAllAsReadButton(props: ComponentProps<typeof Button>) {
  const { mutateAsync, isPending } = useMutation({
    mutationKey: ["notifications", "mark-all-as-read"],
    mutationFn: async () => {
      return fetch("/api/v1/notifications/mark-all-as-read", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      }).then((res) => res.json()) as Promise<NotificationUpdateOutput>;
    },
  });

  return (
    <Button
      {...props}
      size="sm"
      onClick={() => {
        void mutateAsync();
      }}
    >
      {isPending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        "Marquer tout comme lu"
      )}
    </Button>
  );
}

function SelectFilter({
  activeFilter,
  setActiveFilter,
}: {
  activeFilter: FilterType;
  setActiveFilter: (filter: FilterType) => void;
}) {
  return (
    <Select
      defaultValue={activeFilter ?? "all"}
      onValueChange={(value) =>
        setActiveFilter(value === "all" ? null : (value as FilterType))
      }
    >
      <SelectTrigger className="h-[32px] w-[100px]">
        <SelectValue placeholder="All" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Tous</SelectItem>
        <SelectItem value={"read" satisfies FilterType}>Lu</SelectItem>
        <SelectItem value={"unread" satisfies FilterType}>Non lu</SelectItem>
        <SelectItem value={"archived" satisfies FilterType}>Archivé</SelectItem>
      </SelectContent>
    </Select>
  );
}

export function NotificationList({ close }: NotificationListProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeFilter, setActiveFilter] = useState<FilterType>(null);
  const [activeTag, setActiveTag] = useState<NotificationTags | null>(null);
  const translation = {
    all: "Tous",
    ACCOUNT: "Compte",
  };

  const mutations = useMutation({
    mutationFn: async (action: { id: string } & NotificationUpdateInput) => {
      return fetch(`/api/v1/notifications/${action.id}`, {
        method: "POST",
        body: JSON.stringify({
          seen: action.seen,
          archived: action.archived,
          clicked: action.clicked,
        }),
        headers: {
          "Content-Type": "application/json",
        },
      }).then((res) => res.json() as Promise<NotificationUpdateOutput>);
    },
    onSuccess: (data) => {
      queryClient
        .invalidateQueries({ queryKey: ["/notifications"] })
        .catch(console.error);
      if ("redirect" in data && data.redirect) {
        navigate(data.redirect);
        close();
      }
    },
  });

  const handleNotificationAction = (
    id: string,
    input: NotificationUpdateInput,
  ) => {
    mutations.mutate({ id, ...input });
  };

  return (
    <div className="flex h-full flex-col space-y-4">
      <div className="flex items-center justify-between px-4">
        <SelectFilter
          activeFilter={activeFilter}
          setActiveFilter={setActiveFilter}
        />
        <MarkAllAsReadButton
          size="sm"
          className="h-[32px] rounded-sm text-xs"
        />
      </div>
      <div className="flex-none px-4">
        <Tabs
          value={activeTag ?? "all"}
          onValueChange={(value) => {
            if (value === "all") {
              setActiveTag(null);
            } else {
              setActiveTag(value as NotificationTags);
            }
          }}
          className="w-full"
        >
          <TabsList className="inline-flex h-9 items-center justify-start rounded-lg bg-slate-50/50 p-1">
            {["all"].concat(notificationTags).map((tag) => (
              <TabsTrigger
                key={tag}
                value={tag}
                className={cn(
                  "rounded-none px-3 py-1.5 font-medium text-slate-500 text-sm transition-all",
                  "hover:bg-slate-100/80 hover:text-slate-700",
                  "data-[state=active]:bg-blue-50/80 data-[state=active]:text-blue-700",
                  "data-[state=active]:shadow-[0_1px_2px_rgba(0,0,0,0.02)] data-[state=active]:ring-[0.5px] data-[state=active]:ring-blue-100",
                  "first:rounded-l-md last:rounded-r-md",
                )}
              >
                {translation[tag as "all"] ?? tag}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <InfiniteScroll
        endpoint="/notifications"
        queryParams={{
          tag: activeTag,
          filter: activeFilter,
          archived: activeFilter === "archived",
          seen: (() => {
            if (activeFilter === "unread") {
              return false;
            }
            if (activeFilter === "read") {
              return true;
            }
            return null;
          })(),
        }}
        renderItem={(notification) => (
          <NotificationCard
            key={notification.id}
            notification={notification}
            handleNotificationAction={handleNotificationAction}
          />
        )}
        LoadingComponent={() => (
          <div>
            {Array.from({ length: 5 }).map((_, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
              <NotificationSkeleton key={i} />
            ))}
          </div>
        )}
        ErrorComponent={(error) => <NotificationError error={error} />}
        EmptyComponent={() => <EmptyNotifications />}
      />
    </div>
  );
}
