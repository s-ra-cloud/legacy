import type { LucideIcon } from "lucide-react";

interface EmptyViewProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyView({
  icon: Icon,
  title,
  description,
  action,
}: EmptyViewProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center py-12 text-center">
      <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-gray-100">
        <Icon className="h-8 w-8 text-gray-500" />
      </div>
      <h3 className="mb-2 font-semibold text-lg">{title}</h3>
      {description && (
        <p className="mb-4 max-w-sm text-gray-500 text-sm">{description}</p>
      )}
      {action && <div>{action}</div>}
    </div>
  );
}
