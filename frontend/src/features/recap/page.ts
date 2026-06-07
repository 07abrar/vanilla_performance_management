import Chart from "chart.js/auto";
import { html, render } from "lit-html";
import { RecapEntry, RecapMode, RecapOut } from "shared/api/types";
import dayjs from "shared/lib/dayjs";
import { getRecapState, loadRecap, subscribe } from "shared/store";
import {
  BUTTON_PRIMARY_CLASSES,
  CARD_CLASSES,
  INPUT_CLASSES,
  SELECT_CLASSES,
} from "shared/ui/classes";
import { createDateInput } from "shared/ui/dateInput";

// ── Local state ───────────────────────────────────────────────────────────────

interface FilterState {
  mode: RecapMode;
  year: number;
  month: number;
}

function createFilterState(): FilterState {
  const today = dayjs();
  return {
    mode: "daily",
    year: today.year(),
    month: today.month() + 1,
  };
}

// ── Handler shape ─────────────────────────────────────────────────────────────

interface FilterHandlers {
  onModeChange: (value: RecapMode) => void;
  onYearChange: (value: number) => void;
  onMonthChange: (value: number) => void;
  onRefresh: () => void;
}

// ── Templates ─────────────────────────────────────────────────────────────────

// Returns "2h 30m" format — intentionally different from shared/lib/format's "45 min"
function formatMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rem = minutes % 60;
  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours}h`);
  parts.push(`${rem}m`);
  return parts.join(" ");
}

function modeInputs(
  state: FilterState,
  handlers: FilterHandlers,
  dailyDateEl: HTMLInputElement,
  weekStartEl: HTMLInputElement,
) {
  if (state.mode === "daily") {
    return html`
      <label class="flex flex-col gap-1.5">
        <span class="text-sm font-semibold text-muted-strong">Date</span>
        ${dailyDateEl}
      </label>
    `;
  }
  if (state.mode === "weekly") {
    return html`
      <label class="flex flex-col gap-1.5">
        <span class="text-sm font-semibold text-muted-strong">Week start</span>
        ${weekStartEl}
      </label>
    `;
  }
  return html`
    <label class="flex flex-col gap-1.5">
      <span class="text-sm font-semibold text-muted-strong">Year</span>
      <input
        type="number"
        class=${INPUT_CLASSES}
        min="2000"
        max="2100"
        .value=${String(state.year)}
        @input=${(e: Event) =>
          handlers.onYearChange(Number((e.target as HTMLInputElement).value))}
      />
    </label>
    <label class="flex flex-col gap-1.5">
      <span class="text-sm font-semibold text-muted-strong">Month</span>
      <input
        type="number"
        class=${INPUT_CLASSES}
        min="1"
        max="12"
        .value=${String(state.month)}
        @input=${(e: Event) =>
          handlers.onMonthChange(Number((e.target as HTMLInputElement).value))}
      />
    </label>
  `;
}

function controlSection(
  state: FilterState,
  handlers: FilterHandlers,
  dailyDateEl: HTMLInputElement,
  weekStartEl: HTMLInputElement,
) {
  const isLoading = getRecapState().isLoading;
  return html`
    <section class=${CARD_CLASSES}>
      <div class="grid gap-4 grid-cols-[repeat(auto-fit,minmax(220px,1fr))]">
        <label class="flex flex-col gap-1.5">
          <span class="text-sm font-semibold text-muted-strong">View</span>
          <select
            class=${SELECT_CLASSES}
            @change=${(e: Event) =>
              handlers.onModeChange(
                (e.target as HTMLSelectElement).value as RecapMode,
              )}
          >
            <option value="daily" ?selected=${state.mode === "daily"}>
              Daily
            </option>
            <option value="weekly" ?selected=${state.mode === "weekly"}>
              Weekly
            </option>
            <option value="monthly" ?selected=${state.mode === "monthly"}>
              Monthly
            </option>
          </select>
        </label>
        <div
          class="col-span-full grid gap-4 grid-cols-[repeat(auto-fit,minmax(220px,1fr))]"
        >
          ${modeInputs(state, handlers, dailyDateEl, weekStartEl)}
        </div>
        <div class="col-span-full flex justify-end mt-1">
          <button
            class=${BUTTON_PRIMARY_CLASSES}
            ?disabled=${isLoading}
            @click=${handlers.onRefresh}
          >
            ${isLoading ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </div>
    </section>
  `;
}

function summaryLine(data: RecapOut) {
  const startOfPeriod = dayjs(data.start).startOf("day");
  return html`
    <p class="flex flex-wrap gap-2 items-center text-sm">
      <span>Period: ${data.label}</span>
      <span class="w-1 h-1 rounded-full bg-muted" aria-hidden="true"></span>
      <span
        >${startOfPeriod.format("YYYY-MM-DD HH:mm")} →
        ${dayjs(data.end).format("YYYY-MM-DD HH:mm")}</span
      >
      <span class="w-1 h-1 rounded-full bg-muted" aria-hidden="true"></span>
      <span>Total minutes: ${data.total_minutes}</span>
    </p>
  `;
}

function entriesTable(entries: RecapEntry[]) {
  return html`
    <div class="overflow-x-auto">
      <table class="w-full border-collapse text-sm bg-surface">
        <thead>
          <tr>
            ${["Activity", "Minutes", "%"].map(
              (label, i) => html`
                <th
                  class=${"font-semibold text-muted-strong px-3 py-3 border-b border-ring bg-slate-50" +
                  (i === 0 ? " text-left" : " text-right")}
                >
                  ${label}
                </th>
              `,
            )}
          </tr>
        </thead>
        <tbody>
          ${entries.map(
            (entry) => html`
              <tr class="hover:bg-slate-50">
                <td class="px-3 py-3 border-b border-ring">
                  ${entry.activity_name ?? `Activity #${entry.activity_id}`}
                </td>
                <td class="px-3 py-3 border-b border-ring text-right">
                  ${formatMinutes(entry.minutes)}
                </td>
                <td class="px-3 py-3 border-b border-ring text-right">
                  ${entry.percentage.toFixed(1)}%
                </td>
              </tr>
            `,
          )}
        </tbody>
      </table>
    </div>
  `;
}

function recapBody(canvasEl: HTMLCanvasElement) {
  const recapState = getRecapState();

  if (recapState.isLoading) {
    return html`<div class="skeleton"></div>`;
  }
  if (recapState.error) {
    return html`<p class="text-sm text-danger-fg">${recapState.error}</p>`;
  }
  if (!recapState.data) {
    return html`<p class="text-sm text-muted-strong">No recap data yet.</p>`;
  }

  const data = recapState.data;

  if (!data.entries.length) {
    return html`
      ${summaryLine(data)}
      <p
        class="p-6 text-center text-muted border border-dashed border-ring rounded-xl bg-white/60"
      >
        No data for the selected period.
      </p>
    `;
  }

  return html`
    ${summaryLine(data)}
    <div class="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-6">
      <div class=${CARD_CLASSES}>
        <div class="relative w-full h-chart">${canvasEl}</div>
      </div>
      <div class=${CARD_CLASSES}>${entriesTable(data.entries)}</div>
    </div>
  `;
}

function recapPage(
  state: FilterState,
  handlers: FilterHandlers,
  canvasEl: HTMLCanvasElement,
  dailyDateEl: HTMLInputElement,
  weekStartEl: HTMLInputElement,
) {
  return html`
    <div class="flex flex-col gap-6">
      <div class="flex flex-col gap-1">
        <h2 class="text-2xl">Recap</h2>
        <p class="text-muted text-sm">Shows the conclusion of user activity.</p>
      </div>
      ${controlSection(state, handlers, dailyDateEl, weekStartEl)}
      <section class=${CARD_CLASSES}>${recapBody(canvasEl)}</section>
    </div>
  `;
}

// ── Main export ───────────────────────────────────────────────────────────────

export function renderRecapView(container: HTMLElement): () => void {
  const root = document.createElement("div");
  container.replaceChildren(root);

  const today = dayjs();
  const dailyDateInput = createDateInput(today.format("YYYY-MM-DD"));
  const weekStartDateInput = createDateInput(
    today.startOf("week").format("YYYY-MM-DD"),
  );

  const canvas = document.createElement("canvas");
  let chart: Chart | null = null;

  const state = createFilterState();

  function triggerLoad(): void {
    const params: Record<string, string> = {
      tz_offset: String(new Date().getTimezoneOffset()),
    };
    if (state.mode === "daily") params.date = dailyDateInput.getValue();
    else if (state.mode === "weekly")
      params.week_start = weekStartDateInput.getValue();
    else {
      params.year = String(state.year);
      params.month = String(state.month);
    }
    void loadRecap(state.mode, params);
  }

  // Changing the daily / weekly date immediately reloads the recap
  dailyDateInput.element.addEventListener("change", () => triggerLoad());
  weekStartDateInput.element.addEventListener("change", () => triggerLoad());

  function renderChart(entries: RecapEntry[]): void {
    destroyChart();
    if (!entries.length) return;
    chart = new Chart(canvas, {
      type: "pie",
      data: {
        labels: entries.map(
          (e) => e.activity_name ?? `Activity #${e.activity_id}`,
        ),
        datasets: [
          {
            data: entries.map((e) => e.minutes),
            backgroundColor: generatePalette(entries.length),
          },
        ],
      },
      options: { plugins: { legend: { position: "bottom" } } },
    });
  }

  function destroyChart(): void {
    if (chart) {
      chart.destroy();
      chart = null;
    }
  }

  function update(): void {
    render(
      recapPage(
        state,
        recapHandlers,
        canvas,
        dailyDateInput.element,
        weekStartDateInput.element,
      ),
      root,
    );
    const recapState = getRecapState();
    if (recapState.data?.entries.length) {
      renderChart(recapState.data.entries);
    } else {
      destroyChart();
    }
  }

  // Form event handlers for the Recap card — mutate state and call update()
  const recapHandlers: FilterHandlers = {
    onModeChange(value) {
      state.mode = value;
      update();
      triggerLoad();
    },

    onYearChange(value) {
      state.year = value;
      update();
    },

    onMonthChange(value) {
      state.month = value;
      update();
    },

    onRefresh() {
      triggerLoad();
    },
  };

  update();
  triggerLoad();

  // Re-render whenever the store notifies us (e.g. after loadRecap resolves).
  const unsubscribe = subscribe(["recap"], update);

  // Cleanup: lit-html owns the event listeners; destroy the chart to release
  // its canvas reference, then unsubscribe from the store.
  return () => {
    unsubscribe();
    destroyChart();
  };
}

function generatePalette(count: number): string[] {
  return Array.from({ length: count }, (_, i) => {
    const hue = Math.round((360 / Math.max(1, count)) * i);
    return `hsl(${hue}, 70%, 60%)`;
  });
}
