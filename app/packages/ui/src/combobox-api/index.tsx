import type { UseQueryResult } from "@tanstack/react-query";
import { createContext, useContext, useEffect, useState } from "react";
import type { paths } from "../lib/api/api-types.js";
import { $api } from "../lib/api/client.js";
import type { HeadlessComboboxListProps } from "./types.js";

export * from "./list.jsx";
export * from "./search-box.jsx";

export function ComboxBoxApiProvider({
  value = [],
  ...props
}: HeadlessComboboxListProps) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string[]>(() => {
    if (value === "") return [];
    return Array.isArray(value) ? (value ?? []) : [value];
  });

  const mainQuery = $api.useQuery("get", props.endpoint, {
    params: {
      query: {
        ...props.queries,
        q: search.length > 1 ? search : undefined,
      },
    },
  });

  const selectedQuery = $api.useQuery(
    "get",
    props.endpoint,
    {
      params: {
        query: {
          "filter[id][in]": selected,
        },
      },
    },
    {
      enabled: selected.length > 0,
    },
  );

  function _setSelected(selected: string[]) {
    setSelected(selected);
    if (props.maxSelectedItem === 1) {
      // @ts-expect-error If maxSelectedItem is 1, we only allow one selected item
      props.onChange?.(selected[0] ?? "");
    } else {
      // @ts-expect-error if maxSelectedItem is greater than 1, we allow multiple selected items
      props.onChange?.(selected ?? []);
    }
  }

  return (
    <ComboBoxApiContext.Provider
      value={{
        search,
        setSearch,

        // @ts-expect-error olah ma3erft
        mainQuery,

        // @ts-expect-error olah ma3erft
        selectedQuery,

        selected,
        setSelected: _setSelected,
      }}
    >
      {props.children}
    </ComboBoxApiContext.Provider>
  );
}

interface ComboBoxApiContextProps {
  search: string;
  setSearch: (search: string) => void;
  mainQuery: UseQueryResult;
  selectedQuery: UseQueryResult;
  selected: string[];
  setSelected: (selected: string[]) => void;
}

const ComboBoxApiContext = createContext<ComboBoxApiContextProps | null>(null);

export function useComboBoxApiContext() {
  const context = useContext(ComboBoxApiContext);
  if (!context) {
    throw new Error(
      "useComboBoxApiContext must be used within a ComboBoxApiProvider",
    );
  }
  return context;
}
