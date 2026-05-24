import dayjs from "dayjs";

const MINUTE_STEP = 15;
const HOUR_OPTIONS = Array.from({ length: 24 }, (_, index) =>
  String(index).padStart(2, "0"),
);
const MINUTE_OPTIONS = Array.from({ length: 60 / MINUTE_STEP }, (_, index) =>
  String(index * MINUTE_STEP).padStart(2, "0"),
);

const PICKER_SELECT =
  "flex-1 px-3 py-2.5 border border-ring rounded-[10px] bg-surface text-sm text-fg " +
  "transition-colors duration-150 " +
  "focus:outline-none focus:border-primary focus:shadow-[0_0_0_3px_rgba(37,99,235,0.18)] " +
  "disabled:bg-slate-100 disabled:text-muted disabled:cursor-not-allowed " +
  "min-h-[40px]";

export interface TimePickerControl {
  element: HTMLDivElement;
  getValue(): string;
  setValue(value: string): void;
}

export function createTimePicker(defaultValue: string): TimePickerControl {
  const container = document.createElement("div");
  container.className = "flex items-center gap-1.5";

  const hourSelect = document.createElement("select");
  hourSelect.className = "PICKER_SELECT";
  HOUR_OPTIONS.forEach((hour) => {
    const option = document.createElement("option");
    option.value = hour;
    option.textContent = hour;
    hourSelect.append(option);
  });

  const minuteSelect = document.createElement("select");
  minuteSelect.className = "PICKER_SELECT";
  MINUTE_OPTIONS.forEach((minute) => {
    const option = document.createElement("option");
    option.value = minute;
    option.textContent = minute;
    minuteSelect.append(option);
  });

  const separator = document.createElement("span");
  separator.className = "font-semibold text-muted-strong";
  separator.textContent = ":";

  container.append(hourSelect, separator, minuteSelect);

  const setValue = (value: string) => {
    const [hour, minute] = value.split(":");
    hourSelect.value = HOUR_OPTIONS.includes(hour) ? hour : HOUR_OPTIONS[0];
    minuteSelect.value = MINUTE_OPTIONS.includes(minute)
      ? minute
      : MINUTE_OPTIONS[0];
  };

  setValue(defaultValue);

  return {
    element: container,
    getValue: () => `${hourSelect.value}:${minuteSelect.value}`,
    setValue,
  };
}

export function roundToNextQuarterHour(date: dayjs.Dayjs): dayjs.Dayjs {
  const remainder = date.minute() % MINUTE_STEP;
  if (remainder === 0 && date.second() === 0) {
    return date.startOf("minute");
  }
  return date.add(MINUTE_STEP - remainder, "minute").startOf("minute");
}

export function addMinutes(time: string, minutes: number): string {
  const [hours, mins] = time.split(":").map((v) => parseInt(v, 10));
  const base = dayjs().hour(hours).minute(mins).second(0);
  const next = base.add(minutes, "minute");
  return `${String(next.hour()).padStart(2, "0")}:${String(next.minute()).padStart(2, "0")}`;
}

export function toMinutes(time: string): number {
  const [hours, mins] = time.split(":").map((v) => parseInt(v, 10));
  return hours * 60 + mins;
}
