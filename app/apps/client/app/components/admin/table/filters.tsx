import { FilterIcon, SearchIcon, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useSearchParams } from "react-router";
import { TextField } from "~/components/form/fields/text";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Form } from "~/components/ui/form";
import { cn } from "~/lib/utils";
import type {
  FilterOperationName,
  zodToFiltersOutput,
} from "~/utils/nuqs/zod-to-filters";
import { SelectField } from "../../form/fields/select";

export type TableSearchParams = {
  cursor: number;
  limit: number;
} & Record<string, unknown>;

interface TableFiltersProps {
  filters: zodToFiltersOutput;
  variant?: "default" | "legacy";
}

const legacyToolbarButtonClass =
  "rounded-none border-white/10 bg-transparent text-[10px] uppercase tracking-[0.15em] text-ivory/50 hover:bg-white/[0.05] hover:text-ivory";

const paperToolbarButtonClass =
  "h-8 rounded-none border-charcoal/15 bg-white text-[10px] font-bold uppercase tracking-[0.15em] text-charcoal/60 hover:bg-charcoal/[0.03] hover:text-charcoal";

const paperLabelClass =
  "mb-1.5 block text-[10px] font-bold uppercase tracking-[0.3em] text-charcoal/55";

const paperInputClass =
  "h-11 rounded-none border-charcoal/15 bg-white text-charcoal placeholder:text-charcoal/30 focus-visible:border-gold/50 focus-visible:ring-gold/15";

const paperSelectTriggerClass =
  "rounded-none border-charcoal/15 bg-white text-charcoal data-[placeholder]:text-charcoal/35 focus-visible:border-gold/50 focus-visible:ring-gold/15 [&_svg]:text-charcoal/40 [&_[data-slot=select-value]]:text-charcoal";

const paperSelectContentClass = "border-charcoal/10 bg-paper text-charcoal";

const paperSelectItemClass =
  "text-charcoal focus:bg-gold/10 focus:text-charcoal data-[highlighted]:bg-gold/10 data-[highlighted]:text-charcoal";

const OP_LABELS: Record<FilterOperationName, string> = {
  eq: "Equals",
  neq: "Not equal",
  gt: "Greater than",
  gte: "On or after",
  lt: "Less than",
  lte: "On or before",
  contains: "Contains",
  startsWith: "Starts with",
  endsWith: "Ends with",
  in: "Is any of",
};

const FILTER_PARAM = /^filter\[([^[\]]+)\]\[([^[\]]+)\]$/;

function parseActiveFilters(
  searchParams: URLSearchParams,
  filters: zodToFiltersOutput,
) {
  const active: {
    param: string;
    key: string;
    op: string;
    value: string;
    label: string;
  }[] = [];

  for (const [param, value] of searchParams.entries()) {
    if (!value) continue;
    const match = param.match(FILTER_PARAM);
    if (!match) continue;

    const [, key, op] = match;
    const field = filters.find((f) => f.key === key);
    const fieldLabel = field?.label ?? key;
    const opLabel = OP_LABELS[op as FilterOperationName] ?? op;

    let displayValue = value;
    const selectOption = field?.selectOptions?.find((o) => o.value === value);
    if (selectOption) displayValue = selectOption.label;

    active.push({
      param,
      key,
      op,
      value,
      label: `${fieldLabel} · ${opLabel} · ${displayValue}`,
    });
  }

  return active;
}

export function TableFilters({
  filters,
  variant = "default",
}: TableFiltersProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [open, setOpen] = useState(false);
  const isLegacy = variant === "legacy";

  const activeFilters = useMemo(
    () => parseActiveFilters(searchParams, filters),
    [searchParams, filters],
  );

  function removeFilter(param: string) {
    const next = new URLSearchParams(searchParams);
    next.delete(param);
    next.set("cursor", "1");
    setSearchParams(next);
  }

  function clearAllFilters() {
    const next = new URLSearchParams(searchParams);
    for (const key of [...next.keys()]) {
      if (key.startsWith("filter[")) next.delete(key);
    }
    next.set("cursor", "1");
    setSearchParams(next);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {activeFilters.map((filter) => (
        <button
          key={filter.param}
          type="button"
          onClick={() => removeFilter(filter.param)}
          className={cn(
            "inline-flex max-w-[14rem] items-center gap-1.5 truncate border px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.12em] transition-colors",
            isLegacy
              ? "border-white/15 bg-white/[0.04] text-ivory/60 hover:border-white/25 hover:text-ivory"
              : "border-charcoal/15 bg-charcoal/[0.03] text-charcoal/65 hover:border-gold/40 hover:text-charcoal",
          )}
          title="Remove filter"
        >
          <span className="truncate">{filter.label}</span>
          <X className="h-3 w-3 shrink-0 opacity-60" />
        </button>
      ))}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button
            className={cn(
              isLegacy ? legacyToolbarButtonClass : paperToolbarButtonClass,
            )}
            variant="outline"
          >
            <FilterIcon size={12} className="mr-1.5" />
            Filters
            {activeFilters.length > 0 ? (
              <span
                className={cn(
                  "ml-1.5 inline-flex h-4 min-w-4 items-center justify-center px-1 text-[9px] font-bold",
                  isLegacy
                    ? "bg-gold/20 text-gold"
                    : "bg-gold/15 text-[#8a6d2f]",
                )}
              >
                {activeFilters.length}
              </span>
            ) : null}
          </Button>
        </DialogTrigger>
        <DialogContent
          className={cn(
            "gap-0 overflow-hidden rounded-none border-charcoal/15 bg-paper p-0 text-charcoal shadow-[0_24px_80px_rgba(15,17,19,0.18)] sm:max-w-md",
            isLegacy && "border-white/10 bg-charcoal text-ivory",
          )}
        >
          <div className="relative border-b border-charcoal/10 px-6 py-5">
            <div className="pointer-events-none absolute top-2 left-2 h-px w-3 bg-charcoal/25" />
            <div className="pointer-events-none absolute top-2 left-2 h-3 w-px bg-charcoal/25" />
            <div className="pointer-events-none absolute top-2 right-10 h-px w-3 bg-charcoal/25" />
            <div className="pointer-events-none absolute top-2 right-10 h-3 w-px bg-charcoal/25" />

            <DialogHeader className="space-y-1.5 text-left">
              <span
                className={cn(
                  "marquee-label block",
                  isLegacy && "text-gold/70",
                )}
              >
                Refine
              </span>
              <DialogTitle
                className={cn(
                  "font-serif text-2xl font-normal tracking-tight text-charcoal",
                  isLegacy && "text-ivory",
                )}
                style={{ fontFamily: "Didot, Georgia, serif" }}
              >
                Filter members
              </DialogTitle>
              <DialogDescription
                className={cn(
                  "text-sm text-charcoal/55",
                  isLegacy && "text-ivory/45",
                )}
              >
                Narrow the list by name, status, or join date.
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="px-6 py-5">
            <TableFilterBuilder
              filters={filters}
              variant={variant}
              onApplied={() => setOpen(false)}
            />
          </div>

          {activeFilters.length > 0 ? (
            <DialogFooter className="border-t border-charcoal/10 bg-charcoal/[0.02] px-6 py-4 sm:justify-between">
              <Button
                type="button"
                variant="ghost"
                className={cn(
                  "rounded-none text-[10px] uppercase tracking-[0.2em] text-charcoal/50 hover:text-charcoal",
                  isLegacy && "text-ivory/45 hover:text-ivory",
                )}
                onClick={() => {
                  clearAllFilters();
                  setOpen(false);
                }}
              >
                Clear all
              </Button>
            </DialogFooter>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface FilterData {
  key: string;
  uiInput: zodToFiltersOutput[number]["operations"][number]["ui"];
  op: FilterOperationName;
  values: string[];
}

interface TableFilterBuilderProps {
  filters: zodToFiltersOutput;
  variant?: "default" | "legacy";
  onApplied?: () => void;
}

export function TableFilterBuilder({
  filters,
  variant = "default",
  onApplied,
}: TableFilterBuilderProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const isLegacy = variant === "legacy";

  const form = useForm<FilterData>({
    defaultValues: {
      key: filters[0]?.key ?? "",
      op: filters[0]?.operations[0]?.name ?? "eq",
      uiInput: filters[0]?.operations[0]?.ui ?? "text",
      values: [""],
    },
  });

  const selectedKey = form.watch("key");
  const selectedOp = form.watch("op");

  const selectedField = useMemo(
    () => filters.find((f) => f.key === selectedKey),
    [filters, selectedKey],
  );

  const operations = selectedField?.operations ?? [];

  useEffect(() => {
    if (!selectedField) return;

    const ops = selectedField.operations;
    const first = ops[0];
    if (!first) return;

    const currentOpValid = ops.some((o) => o.name === selectedOp);
    const op = currentOpValid ? selectedOp : first.name;
    if (!currentOpValid) {
      form.setValue("op", op);
    }

    form.setValue("uiInput", ops.find((o) => o.name === op)?.ui ?? first.ui);

    const existing = searchParams.get(`filter[${selectedKey}][${op}]`);
    form.setValue("values", [existing ?? ""]);
  }, [selectedField, selectedKey, selectedOp, form, searchParams]);

  const keys = useMemo(
    () =>
      filters.map((field) => ({
        label: field.label ?? field.key,
        value: field.key,
      })),
    [filters],
  );

  function submit(data: FilterData) {
    const next = new URLSearchParams(searchParams);

    for (const key of [...next.keys()]) {
      if (key.startsWith(`filter[${data.key}]`)) {
        next.delete(key);
      }
    }

    const value = data.values[0]?.trim();
    if (value) {
      next.set(`filter[${data.key}][${data.op}]`, value);
    }

    next.set("cursor", "1");
    setSearchParams(next);
    onApplied?.();
  }

  const labelClass = isLegacy
    ? "mb-1.5 block text-[10px] font-bold uppercase tracking-[0.3em] text-ivory/50"
    : paperLabelClass;
  const inputClass = isLegacy
    ? "h-11 rounded-none border-white/[0.12] bg-white/[0.04] text-ivory placeholder:text-ivory/25 focus-visible:border-gold/50 focus-visible:ring-gold/15"
    : paperInputClass;
  const triggerClass = isLegacy
    ? "rounded-none border-white/[0.12] bg-white/[0.04] text-ivory data-[placeholder]:text-ivory/25 focus-visible:border-gold/50 focus-visible:ring-gold/15 [&_svg]:text-ivory/40 [&_[data-slot=select-value]]:text-ivory"
    : paperSelectTriggerClass;
  const contentClass = isLegacy
    ? "border-white/10 bg-charcoal text-ivory"
    : paperSelectContentClass;
  const itemClass = isLegacy
    ? "text-ivory focus:bg-gold/10 focus:text-ivory data-[highlighted]:bg-gold/10 data-[highlighted]:text-ivory"
    : paperSelectItemClass;

  const currentUi =
    operations.find((o) => o.name === selectedOp)?.ui ?? "text";

  return (
    <Form {...form}>
      <form
        onSubmit={(ev) => {
          ev.preventDefault();
          form
            .handleSubmit(submit, console.error)(ev)
            .catch(console.error);
        }}
        className="space-y-5"
      >
        <SelectField
          formName="key"
          label="Field"
          labelClassName={labelClass}
          triggerClassName={triggerClass}
          contentClassName={contentClass}
          itemClassName={itemClass}
          placeholder="Choose field"
          options={keys}
        />

        <SelectField
          formName="op"
          label="Condition"
          labelClassName={labelClass}
          triggerClassName={triggerClass}
          contentClassName={contentClass}
          itemClassName={itemClass}
          placeholder="Choose condition"
          disabled={operations.length === 0}
          options={operations.map((op) => ({
            value: op.name,
            label: OP_LABELS[op.name],
          }))}
        />

        <FilterInputView
          ui={currentUi}
          labelClass={labelClass}
          inputClass={inputClass}
          triggerClass={triggerClass}
          contentClass={contentClass}
          itemClass={itemClass}
          selectOptions={selectedField?.selectOptions}
        />

        <Button
          type="submit"
          className={cn(
            "w-full rounded-none border border-gold/50 bg-transparent py-3 text-[11px] font-bold uppercase tracking-[0.3em] text-charcoal hover:bg-gold/10",
            isLegacy &&
              "border-gold/50 text-ivory hover:bg-gold/10 hover:text-ivory",
          )}
          variant="outline"
        >
          <SearchIcon size={14} className="mr-2" />
          Apply filter
        </Button>
      </form>
    </Form>
  );
}

function FilterInputView({
  ui,
  labelClass,
  inputClass,
  triggerClass,
  contentClass,
  itemClass,
  selectOptions,
}: {
  ui: zodToFiltersOutput[number]["operations"][number]["ui"];
  labelClass: string;
  inputClass: string;
  triggerClass: string;
  contentClass: string;
  itemClass: string;
  selectOptions?: { label: string; value: string }[];
}) {
  if (ui === "select" && selectOptions) {
    return (
      <SelectField
        formName="values.0"
        label="Value"
        labelClassName={labelClass}
        triggerClassName={triggerClass}
        contentClassName={contentClass}
        itemClassName={itemClass}
        placeholder="Choose value"
        options={selectOptions}
      />
    );
  }

  if (ui === "date") {
    return (
      <TextField
        formName="values.0"
        label="Value"
        labelClassName={labelClass}
        inputProps={{
          type: "date",
          className: inputClass,
        }}
      />
    );
  }

  return (
    <TextField
      formName="values.0"
      label="Value"
      labelClassName={labelClass}
      inputProps={{
        placeholder: "Enter value…",
        className: inputClass,
      }}
    />
  );
}
