import type {
  NotificationManyOutput,
  NotificationUpdateInput,
} from "@repo/server";
import { format } from "date-fns";
import { CheckIcon } from "lucide-react";
import { cn } from "~/lib/utils";

export function NotificationCard({
  notification,
  handleNotificationAction,
}: {
  notification: NotificationManyOutput["items"][number];
  handleNotificationAction: (
    id: string,
    input: NotificationUpdateInput,
  ) => void;
}) {
  const styles = notificationStyles[notification.type];

  return (
    <div
      title={notification.route ?? undefined}
      className={cn(
        "group relative border-slate-200 border-b p-4 transition-all duration-150",
        notification.route && "cursor-pointer",
        styles.bg,
        notification.userNotification.clicked && "bg-gray-50",
        styles.hover,
      )}
      onClick={() =>
        handleNotificationAction(notification.userNotification.id, {
          clicked: true,
        })
      }
    >
      <div className="absolute end-4 top-4">
        <div className="relative">
          <CheckIcon
            className={cn(
              "h-4 w-4",
              notification.userNotification.seen
                ? "text-blue-500"
                : "text-slate-300",
            )}
          />
          <CheckIcon
            className={cn(
              "-left-[5px] absolute top-0 h-4 w-4",
              notification.userNotification.seen
                ? "text-blue-500"
                : "text-slate-300",
            )}
          />
        </div>
      </div>
      <div className="pb-2">
        <div className="flex items-center gap-3">
          <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-full">
            {notification.user.image ? (
              <img
                src={notification.user.image}
                alt={`${notification.user.name}`}
                className="object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-slate-100 font-medium text-slate-600 text-sm uppercase">
                {notification.user.name[0]}
                {notification.user.name.split(" ")?.at(1)?.at(0) ?? ""}
              </div>
            )}
          </div>
          <div className="flex flex-col">
            <h3 className={cn("font-medium text-base", styles.text)}>
              {notification.title}
            </h3>
            <div className="flex items-center gap-2">
              <span className="font-medium text-slate-700 text-sm">
                {notification.user.name[0]}
                {notification.user.name.split(" ")?.at(1)?.at(0) ?? ""}
              </span>
              <span className="text-slate-400 text-xs">
                {format(new Date(notification.createdAt), "dd/MM/yyyy HH:mm")}
              </span>
            </div>
          </div>
        </div>
      </div>
      <div className="space-y-2">
        <p className="text-slate-600 text-sm">{notification.message}</p>
        <div className="flex flex-wrap gap-1.5">
          {notification.tags?.map((tag) => (
            <span
              key={tag}
              className={cn(
                "inline-flex items-center rounded-full px-2 py-0.5 font-medium text-xs",
                styles.bg,
                styles.text,
              )}
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

const notificationStyles = {
  POSITIVE: {
    hover: "hover:bg-emerald-50/50",
    bg: "bg-emerald-50/20",
    text: "text-emerald-700",
    badge: "text-emerald-600 border-emerald-200",
  },
  NEGATIVE: {
    hover: "hover:bg-rose-50/50",
    bg: "bg-rose-50/20",
    text: "text-rose-700",
    badge: "text-rose-600 border-rose-200",
  },
  NEUTRAL: {
    hover: "hover:bg-blue-50/50",
    bg: "bg-blue-50/20",
    text: "text-blue-700",
    badge: "text-blue-600 border-blue-200",
  },
} as const;
