import { BellIcon } from "lucide-react";

export function EmptyNotifications() {
  return (
    <div className="flex h-[400px] flex-col items-center justify-center space-y-3 px-4 text-center">
      <div className="rounded-full bg-slate-100 p-3">
        <BellIcon className="h-6 w-6 text-slate-400" />
      </div>
      <div className="space-y-1">
        <h3 className="font-medium text-slate-900 text-sm">
          Pas encore de notifications.
        </h3>
        <p className="text-slate-500 text-sm">
          Lorsque vous recevrez des notifications, elles s'afficheront ici.
        </p>
      </div>
    </div>
  );
}
