import { RefreshCwIcon, XCircleIcon } from "lucide-react";

interface ErrorProps {
  error: unknown;
}

export function NotificationError({ error }: ErrorProps) {
  const message = error instanceof Error ? error.message : null;
  return (
    <div className="flex h-[400px] flex-col items-center justify-center">
      <div className="w-full space-y-6 text-center">
        <div className="relative mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-rose-100/60">
          <XCircleIcon className="h-8 w-8 text-rose-500" />
        </div>

        <div className="space-y-3">
          <h3 className="font-semibold text-lg text-slate-900">
            Oops! Quelque chose s'est mal passé
          </h3>
          <p className="mx-auto max-w-sm text-slate-500 text-sm leading-relaxed">
            {message ??
              "Nous n'avons pas pu charger vos notifications pour le moment. Veuillez réessayer."}
          </p>
        </div>

        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-lg bg-slate-100 px-4 py-2 font-medium text-slate-700 text-sm transition-colors hover:bg-slate-200"
        >
          <RefreshCwIcon className="h-4 w-4" />
          Retry
        </button>
      </div>
    </div>
  );
}
