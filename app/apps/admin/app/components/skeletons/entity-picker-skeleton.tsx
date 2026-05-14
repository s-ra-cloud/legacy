import { Skeleton } from "../ui/skeleton";

export function EntityPickerSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, index) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
        <div key={index} className="flex items-center gap-2 p-2">
          <Skeleton className="size-12 rounded" />
          <div className="space-y-1">
            <Skeleton className="h-4 w-[150px]" />
            <Skeleton className="h-3 w-[80px]" />
          </div>
          <div className="grow" />
          <Skeleton className="h-5 w-[60px]" />
        </div>
      ))}
    </div>
  );
}
