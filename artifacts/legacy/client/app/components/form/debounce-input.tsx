import * as React from "react";
import { Input } from "~/components/ui/input";
import { useDebounce } from "~/hooks/use-debounce";

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  onChange?: (value: string) => void;
}

const DebouncedInput = React.forwardRef<HTMLInputElement, InputProps>(
  (props, ref) => {
    const inputValue = React.useRef("");

    const debouncedCallback = useDebounce(() => {
      props.onChange?.(inputValue.current);
    });

    return (
      <Input
        ref={ref}
        {...props}
        onChange={(ev) => {
          inputValue.current = ev.target.value;
          debouncedCallback();
        }}
      />
    );
  },
);
DebouncedInput.displayName = "DebouncedInput";

export { DebouncedInput };
