import type { UseQueryResult } from "@tanstack/react-query";
import type { paths } from "../lib/api/api-types.js";
import { useComboBoxApiContext } from "./index.jsx";
import type { EndpointResponse } from "./types.js";

type ChildrenProps<T extends keyof paths> = {
  mainQuery: UseQueryResult<EndpointResponse<T>>;
  selectedQuery: UseQueryResult<EndpointResponse<T>>;
  selected: string[];
  setSelected: (v: string[]) => void;
};

interface HeadlessComboboxListProps<T extends keyof paths> {
  endpoint: T;
  children: (props: ChildrenProps<T>) => React.ReactNode;
}

export function ComboboxApiQuery<T extends keyof paths>({
  endpoint: _endpoint,
  children,
}: HeadlessComboboxListProps<T>) {
  const context = useComboBoxApiContext();

  return (
    <>
      {children({
        mainQuery: context.mainQuery as never,
        selectedQuery: context.selectedQuery as never,
        selected: context.selected,
        setSelected: context.setSelected,
      })}
    </>
  );
}
