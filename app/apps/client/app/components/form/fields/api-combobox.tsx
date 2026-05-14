import {
  CheckIcon,
  ChevronDownIcon,
  Loader2Icon,
  SearchIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { useCallback, useMemo, useState } from "react";
import { Button } from "~/components/ui/button";
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
} from "~/components/ui/command";
import { FormMessage } from "~/components/ui/form";
import { Label } from "~/components/ui/label";
import type { Option } from "~/components/ui/multiple-selector";
import MultipleSelector from "~/components/ui/multiple-selector";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import type { GetAllResourceOperation } from "@repo/ui";
import { $api } from "@repo/ui";
import { cn } from "~/lib/utils";
import { DebouncedInput } from "../debounce-input";
import { useFormField } from "../hook";

type BaseComboboxApiFormInputProps = {
  formName: string;
  label?: string;
  selectTitle?: string;
  description?: string;
  buttonProps?: React.ComponentProps<typeof Button>;
  required?: boolean;
  cursor?: number;
  limit?: number;
  enabled?: boolean;
  creatable?: boolean;
  hidden?: boolean;
  onCreateOption?: (value: string) => Promise<void>;
  emptyIndicator?: ReactNode;
  loadingIndicator?: ReactNode;
  listeners?: {
    onChange?: (value: string) => void;
  };
} & GetAllResourceOperation;

type SingleComboboxApiFormInputProps = {
  multiple?: false;
} & BaseComboboxApiFormInputProps;

type MultipleComboboxApiFormInputProps = {
  multiple?: true;
} & BaseComboboxApiFormInputProps;

export function ComboboxApiFormInput({
  formName,
  label,
  description,
  required,
  hidden,
  ...props
}: SingleComboboxApiFormInputProps) {
  const control = useFormField<string>(formName);
  const field = control.field;

  return (
    <div className={cn("flex h-full flex-col gap-2", hidden && "hidden")}>
      <div>
        {label && <p className="capitalize">{label}</p>}
        <ComboxBoxApiList
          {...props}
          onChange={(value: string) => {
            props.listeners?.onChange?.(value);
            field.onChange(value);
          }}
          value={field.value}
        />
        {description && (
          <p className="text-muted-foreground text-sm">{description}</p>
        )}
      </div>
      <FormMessage fieldState={control.fieldState} />
    </div>
  );
}

type BaseSingleComboboxListProps = {
  label?: string;
  buttonProps?: React.ComponentProps<typeof Button>;
  limit?: number;
  cursor?: number;
  enabled?: boolean;
  creatable?: boolean;
  onCreateOption?: (value: string) => Promise<void>;
  emptyIndicator?: ReactNode;
  loadingIndicator?: ReactNode;
  renderTrigger?: (props: {
    value: string | undefined;
    label: string;
    isLoading: boolean;
    selected?: Option;
  }) => ReactNode;
} & GetAllResourceOperation;

type SingleComboboxListProps = {
  multiple?: false;
  value?: string;
  onChange: (value: string) => void;
} & BaseSingleComboboxListProps;

type MultipleComboboxListProps = {
  multiple: true;
  value: string[];
  onChange: (value: string[]) => void;
} & BaseSingleComboboxListProps;

type ComboboxListProps = SingleComboboxListProps | MultipleComboboxListProps;

export function ComboxBoxApiList({
  endpoint,
  extractList,
  label = "No Item Selected...",
  buttonProps,
  cursor = 1,
  limit = 10,
  queries = {},
  enabled = true,
  creatable = false,
  onCreateOption,
  emptyIndicator,
  loadingIndicator,
  renderTrigger,
  ...rest
}: ComboboxListProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [selected, setSelected] = useState<Option>();

  // const query = useQuery({
  //   queryKey: [endpoint, search],
  //   queryFn: async () => {
  //     const url = new URL(endpoint, env.NEXT_PUBLIC_URL);
  //     const params = new URLSearchParams({
  //       cursor: cursor.toString(),
  //       limit: limit.toString(),
  //     });

  //     if (search.trim().length > 0) {
  //       params.set("q", search);
  //     }

  //     for (const [key, value] of Object.entries(queries)) {
  //       if (Array.isArray(value)) {
  //         value.forEach((v) => params.append(key, v));
  //       } else if (value) {
  //         params.set(key, value);
  //       }
  //     }

  //     url.search = params.toString();

  //     const res = await fetch(url, {
  //       credentials: "include",
  //     });
  //     if (!res.ok) throw new Error("Network response was not ok");
  //     const data = (await res.json()) as T;
  //     return data;
  //   },
  //   ...QUERY_OPTIONS,
  //   enabled,
  // });

  const query = $api.useQuery(
    "get",
    endpoint,
    {
      params: {
        query: {
          limit,
          cursor,
          ...(search.trim().length > 0 && {
            q: search,
          }),
          ...queries,
        },
      },
    },
    {
      enabled: enabled && open, // Only enable when popover is open
    },
  );

  // useEffect(() => {
  //   if (enabled) {
  //     query.refetch().catch(console.error);
  //   }
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, [enabled, queries]);

  // // Query for selected items (both single and multiple)
  // const selectedItemsQuery = useQuery({
  //   queryKey: [endpoint, "selected", rest.multiple ? rest.value : [rest.value]],
  //   queryFn: async () => {
  //     const url = new URL(endpoint, env.NEXT_PUBLIC_URL);

  //     // Set base parameters
  //     const params = new URLSearchParams({
  //       limit: "100", // cuz multiple select should be handle only few values
  //     });

  //     // Get IDs to filter
  //     const ids = rest.multiple ? rest.value : rest.value ? [rest.value] : [];

  //     // Combine queries
  //     const allQueries = {
  //       ...queries,
  //       ...(ids.length > 0 && {
  //         "filter[id][in]": ids,
  //       }),
  //     };

  //     // Add all query parameters
  //     for (const [key, value] of Object.entries(allQueries)) {
  //       if (Array.isArray(value)) {
  //         // Handle array values
  //         value.forEach((v) => params.append(key, v));
  //       } else if (value) {
  //         params.set(key, value);
  //       }
  //     }

  //     url.search = params.toString();

  //     const res = await fetch(url, {
  //       credentials: "include",
  //     });
  //     if (!res.ok) throw new Error("Network response was not ok");
  //     const data = (await res.json()) as T;
  //     return data;
  //   },
  //   enabled: rest.multiple ? rest.value.length > 0 : Boolean(rest.value),
  //   ...QUERY_OPTIONS,
  // });

  const selectedItemsQuery = $api.useQuery(
    "get",
    endpoint,
    {
      params: {
        // query: {
        //   limit: 100,
        //   "filter[id][in]": rest.value,
        //   ...queries,
        // },
      },
    },
    {
      enabled: rest.multiple ? rest.value.length > 0 : Boolean(rest.value),
    },
  );

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen && enabled) {
      query.refetch().catch(console.error);
    }
  };

  const candidates = useMemo(() => {
    return query.isSuccess ? extractList(query.data as never) : [];
  }, [query.data, extractList, query.isSuccess]);

  // Transform selected items into options
  const selectedOptions = useMemo(() => {
    return selectedItemsQuery.isSuccess
      ? extractList(selectedItemsQuery.data as never)
      : [];
  }, [selectedItemsQuery.data, selectedItemsQuery.isSuccess, extractList]);

  if (!emptyIndicator) {
    emptyIndicator = (
      <div className="p-4 text-center text-muted-foreground text-sm">
        {query.isError ? "Error loading options" : "No results found."}
      </div>
    );
  }

  if (!loadingIndicator) {
    loadingIndicator = (
      <div className="flex items-center justify-center p-4">
        <Loader2Icon className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  const EmptyItem = useCallback(() => {
    if (!emptyIndicator) return undefined;

    if (!creatable && Object.keys(candidates).length === 0) {
      return (
        <CommandItem value="-" disabled>
          {emptyIndicator}
        </CommandItem>
      );
    }
  }, [candidates, creatable, emptyIndicator]);

  if (rest.multiple) {
    const handleSearch = async (searchTerm: string) => {
      setSearch(searchTerm);
      const result = await query.refetch();
      if (result.isSuccess) return extractList(result.data as never);

      return candidates;
    };
    return (
      <MultipleSelector
        disabled={!enabled}
        defaultOptions={candidates}
        value={
          selectedItemsQuery.isSuccess
            ? selectedOptions
            : rest.value.map((val) => ({
              value: val,
              label: "loading...",
            }))
        }
        onChange={(options) => {
          rest.onChange(options.map((o) => o.value));
          setSearch("");
        }}
        delay={300}
        onSearch={handleSearch}
        creatable={creatable}
        onSearchSync={(value) => {
          if (!value.trim()) setSearch("");
          return candidates;
        }}
        triggerSearchOnFocus
        loadingIndicator={loadingIndicator}
        emptyIndicator={emptyIndicator}
      />
    );
  }

  const handleCreateOption = async (searchValue: string) => {
    if (!onCreateOption) return;
    try {
      setIsCreating(true);
      await onCreateOption(searchValue);
      // Invalidate the queries to refetch the updated data
      await query.refetch();
      await selectedItemsQuery.refetch();
      // Update the selection with the newly created item
      setOpen(false);

      setSelected({ label: searchValue, value: searchValue });
      rest.onChange?.(searchValue);
    } catch (error) {
      console.error("Failed to create option:", error);
    } finally {
      setIsCreating(false);
    }
  };

  const CreatableItem = () => {
    if (!creatable) return undefined;

    const Item = (
      <CommandItem
        value={search}
        className="cursor-pointer"
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onSelect={async (value: string) => {
          await handleCreateOption(value);
        }}
      >
        {`Create "${search}"`}
      </CommandItem>
    );

    // For normal creatable
    if (search.length > 0 && !candidates.length) {
      return Item;
    }

    return undefined;
  };

  return (
    <Command className="h-10 bg-transparent" shouldFilter={false}>
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          {renderTrigger ? (
            <Button
              disabled={!enabled}
              variant="outline"
              aria-expanded={open}
              className="h-auto w-full border-0 bg-transparent p-0 hover:bg-transparent"
            >
              {renderTrigger({
                value: rest.value!,
                label,
                isLoading: selectedItemsQuery.isLoading,
                selected: selectedOptions[0],
              })}
            </Button>
          ) : (
            <Button
              disabled={!enabled}
              variant="outline"
              aria-expanded={open}
              {...buttonProps}
              className={cn(
                "w-full justify-between border bg-white text-foreground capitalize hover:bg-input",
                buttonProps?.className,
              )}
            >
              {rest.value &&
                selectedItemsQuery.isSuccess &&
                selectedOptions[0] ? (
                selectedOptions[0].label
              ) : rest.value ? (
                selected && creatable ? (
                  selected.label
                ) : (
                  <span className="text-muted-foreground">
                    {loadingIndicator}
                  </span>
                )
              ) : (
                <span className="text-muted-foreground">{label}</span>
              )}
              <ChevronDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          )}
        </PopoverTrigger>
        <PopoverContent className="!w-fit !border-0 p-0" align="start">
          <div className="mx-3 flex items-center border-b">
            <SearchIcon size={17} className="me-2 text-muted-foreground" />
            <DebouncedInput
              className="border-0 bg-transparent p-2 focus-visible:bg-transparent"
              onChange={(val) => setSearch(val)}
              placeholder="Search ..."
            />
            {(query.isLoading || isCreating) && (
              <Loader2Icon className="animate-spin" size="15" />
            )}
          </div>
          <CommandList>
            {CreatableItem()}
            {query.isLoading ? (
              loadingIndicator
            ) : (
              <>
                {EmptyItem()}
                <CommandGroup>
                  {candidates.map((candidate) => (
                    <CommandItem
                      disabled={!enabled}
                      key={candidate.value}
                      value={candidate.value}
                      onSelect={(currentValue) => {
                        setOpen(false);
                        rest.onChange?.(
                          currentValue === rest.value ? "" : currentValue,
                        );
                        setSearch("");
                      }}
                    >
                      <CheckIcon
                        className={cn(
                          "mr-2 h-4 w-4",
                          rest.value === candidate.value
                            ? "opacity-100"
                            : "opacity-0",
                        )}
                      />
                      {candidate.label}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </PopoverContent>
      </Popover>
    </Command>
  );
}
