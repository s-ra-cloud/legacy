import type { ComponentProps } from "react";
import React from "react";
import { useDebounce } from "../hooks/use-debounce.js";
import { useComboBoxApiContext } from "./index.jsx";

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  component?: React.ElementType<ComponentProps<"input">>;
}

const ComboBoxSearchBox = React.forwardRef<HTMLInputElement, InputProps>(
  ({ component, ...props }, ref) => {
    const inputValue = React.useRef("");
    const context = useComboBoxApiContext();

    const debouncedCallback = useDebounce(() => {
      context.setSearch(inputValue.current);
    });

    const Comp = component || "input";

    return (
      <Comp
        ref={ref}
        {...props}
        onChange={(ev) => {
          if ("value" in ev.target) {
            inputValue.current = ev.target.value;
            debouncedCallback();
          }
        }}
      />
    );
  },
);
ComboBoxSearchBox.displayName = "ComboBoxSearchBox";

export { ComboBoxSearchBox };

interface ComboBoxSearchBoxClearProps {
  children: React.ReactNode;
}

export function ComboBoxSearchBoxClear({
  children,
}: ComboBoxSearchBoxClearProps) {
  const context = useComboBoxApiContext();

  return (
    <button
      type="button"
      onClick={() => {
        context.setSearch("");
      }}
    >
      {children}
    </button>
  );
}
