import { FilterIcon, SearchIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useSearchParams } from "react-router";
import { TextField } from "~/components/form/fields/text";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Form } from "~/components/ui/form";
import type { zodToFiltersOutput } from "~/utils/nuqs/zod-to-filters";
import { SelectField } from "../../form/fields/select";

export type TableSearchParams = {
  cursor: number;
  limit: number;
} & Record<string, unknown>;

export type TableHeaderFilterOptions =
  | {
      variant: "list";
      filterKey?: string;
      lov: [string, string][];
    }
  | {
      variant?: "text";
      filterKey?: string;
    }
  | {
      variant: "number";
      filterKey?: string;
    };

interface TableFiltersProps {
  filters: zodToFiltersOutput;
  variant?: "default" | "legacy";
}

const legacyToolbarButtonClass =
  "rounded-none border-white/10 bg-transparent text-[10px] uppercase tracking-[0.15em] text-ivory/50 hover:bg-white/[0.05] hover:text-ivory";

export function TableFilters({
  filters,
  variant = "default",
}: TableFiltersProps) {
  // const existingParams = useSearchParams();
  // const keys = Object.entries(filters)
  //   .filter(([, value]) => value)
  //   .map(([key]) => key);
  // const parsedkeys = useMemo(() => parseKeys(keys), [keys]);
  return (
    <div className="flex items-center gap-2">
      {/*parsedkeys
        .filter(({ key }) => !has(key, ["cursor", "limit"]))
        .map(({ key, op, original }) => (
          <Badge
            key={`tfilter-${key}`}
            title={key}
            className="h-9 rounded-sm bg-gray-100 text-black hover:bg-gray-100"
          >
            <button type="button">
              <span className="font-normal">{key}</span>{" "}
              <span className="font-normal">
                [{op}
                ]:
              </span>{" "}
              {<DislayValue value={filters[original]} /> }
            </button>
            <button
              type="button"
              onClick={() => {
                onFiltersChange({ [original]: null }).catch(console.error);
              }}
              className="ms-1"
            >
              <XCircleIcon size={14} />
            </button>
          </Badge>
        ))*/}

      <Dialog>
        <DialogTrigger asChild>
          <Button
            className={variant === "legacy" ? legacyToolbarButtonClass : "h-8"}
            variant="outline"
          >
            <FilterIcon size={10} /> Filters
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Filters</DialogTitle>
            <DialogDescription></DialogDescription>
          </DialogHeader>
          <TableFilterBuilder filters={filters} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface FilterData {
  key: string;
  uiInput: zodToFiltersOutput[number]["operations"][number]["ui"];
  op: zodToFiltersOutput[number]["operations"][number]["name"];
  values: string[];
}

interface TableFilterBuilderProps {
  filters: zodToFiltersOutput;
}

export function TableFilterBuilder({ filters }: TableFilterBuilderProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const form = useForm<FilterData>({
    defaultValues: {
      key: "",
      op: "eq",
      uiInput: "text",
      values: [],
    },
  });

  const [operations, setOperations] = useState<
    zodToFiltersOutput[number]["operations"]
  >([]);

  useEffect(() => {
    const keyUnsubscribe = form.subscribe({
      name: "key",
      formState: {
        values: true,
      },
      callback: ({ values }) => {
        const ops =
          filters.find((it) => it.key === values.key)?.operations ?? [];
        setOperations(ops);
        const first = ops[0];
        if (first) {
          form.setValue("op", first.name);
        }
      },
    });

    const opUnsubscribe = form.subscribe({
      name: "op",
      formState: {
        values: true,
      },
      callback: ({ values }) => {
        const res = searchParams.getAll(`filter[${values.key}][${values.op}]`);
        if (res.length === 0) {
          form.setValue("values", [""]);
        }
        for (const [index, value] of res.entries()) {
          form.setValue(`values.${index}`, value);
        }
      },
    });

    return () => {
      keyUnsubscribe();
      opUnsubscribe();
    };
  }, [form.subscribe, filters, form.setValue, searchParams]);

  const keys = useMemo(() => {
    return filters.map((it) => {
      return {
        label: String(it.key),
        value: it.key,
      };
    });
  }, [filters]);

  function submit(data: FilterData) {
    const newSearchParams = new URLSearchParams(searchParams);
    for (const value of data.values) {
      newSearchParams.set(`filter[${data.key}][${data.op}]`, value);
    }
    setSearchParams(newSearchParams);
  }

  const optMap = {
    eq: "Equal",
    neq: "Not Equal",
    gt: "Greater Than",
    gte: "Greater Than or Equal",
    lt: "Less Than",
    lte: "Less Than or Equal",
  };

  return (
    <div className="space-y-2">
      <Form {...form}>
        <form
          onSubmit={(ev) => {
            ev.preventDefault();
            form
              .handleSubmit(submit, (er) => {
                console.error(er);
              })(ev)
              .catch(console.error);
          }}
          className="space-y-2"
        >
          <SelectField
            formName="key"
            label="Column"
            placeholder="Select Label"
            options={keys}
          />

          <SelectField
            formName="op"
            label="Operation"
            placeholder="Select Operation"
            disabled={operations.length === 0}
            options={operations.map((it) => ({
              value: it.name,
              label: optMap[it.name],
            }))}
          />

          <FilterInputView />

          <Button type="submit" className="">
            <SearchIcon size={15} className="me-2" />
            Apply
          </Button>
        </form>
      </Form>
    </div>
  );
}

function FilterInputView() {
  return <TextField formName="values.0" label="Search" />;
}
