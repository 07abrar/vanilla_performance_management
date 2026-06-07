export const INPUT_CLASSES =
  "w-full px-3 py-2.5 border border-ring rounded-xl bg-surface text-sm text-fg " +
  "transition-colors duration-150 " +
  "focus:outline-none focus:border-primary focus:shadow-focus " +
  "disabled:bg-slate-100 disabled:text-muted disabled:cursor-not-allowed";

export const SELECT_CLASSES = INPUT_CLASSES + " min-h-10";

export const PICKER_SELECT_CLASSES =
  "flex-1 min-w-picker px-3 py-2.5 border border-ring rounded-xl bg-surface text-sm text-fg " +
  "transition-colors duration-150 " +
  "focus:outline-none focus:border-primary focus:shadow-focus " +
  "disabled:bg-slate-100 disabled:text-muted disabled:cursor-not-allowed " +
  "min-h-10";

export const CARD_CLASSES =
  "bg-surface border border-ring rounded-2xl p-6 shadow-card flex flex-col gap-5";

const BUTTON_BASE =
  "rounded-full px-4 py-2.5 text-sm font-semibold border border-transparent " +
  "transition-colors duration-150 disabled:opacity-60 disabled:cursor-not-allowed";

export const BUTTON_PRIMARY_CLASSES =
  BUTTON_BASE +
  " bg-primary text-white border-primary hover:bg-primary-dark" +
  " disabled:bg-primary-disabled disabled:border-primary-disabled disabled:text-white";

export const BUTTON_DANGER_CLASSES =
  BUTTON_BASE +
  " bg-danger-bg text-danger-fg border-danger-border hover:bg-red-200";
