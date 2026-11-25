import { createFormHook, createFormHookContexts } from "@tanstack/react-form";
import type { ChangeEvent } from "react";
import type { UseControllerReturn } from "react-hook-form";
import { useController } from "react-hook-form";


type Override<K> = Omit<UseControllerReturn, "field"> & {
  field: Omit<UseControllerReturn["field"], "value" | "onChange"> & {
    value: K;
    onChange: (value: K | ChangeEvent<HTMLInputElement>) => void;
  };
};

export function useFormField<T>(name: string) {
  const controller = useController({
    name,
  });
  return controller as Override<T>;
}
