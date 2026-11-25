interface ReadOnlyCellProps {
  label: string;
  value: string;
}

export function ReadOnlyCell({ value, label }: ReadOnlyCellProps) {
  return (
    <div>
      <p>{label}</p>
      <div className="flex h-10 items-center rounded border bg-sidebar px-4">
        <span className="text-muted-foreground">{value}</span>
      </div>
    </div>
  );
}
