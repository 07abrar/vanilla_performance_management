import { INPUT_CLASSES } from "./classes";

export interface DateInputControl {
  element: HTMLInputElement;
  getValue(): string;
  setValue(value: string): void;
}

export function createDateInput(defaultValue: string): DateInputControl {
  const input = document.createElement("input");
  input.type = "date";
  input.className = INPUT_CLASSES;
  input.value = defaultValue;
  return {
    element: input,
    getValue: () => input.value,
    setValue: (value: string) => {
      input.value = value;
    },
  };
}
