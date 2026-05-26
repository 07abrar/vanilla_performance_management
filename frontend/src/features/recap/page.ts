import dayjs from "shared/lib/dayjs";
import Chart from "chart.js/auto";
import { getRecapState, loadRecap, subscribe } from "shared/store";
import { RecapMode } from "shared/api/types";
import { createButton, createCard, el, setChildren } from "shared/ui/dom";
import { INPUT_CLASSES, SELECT_CLASSES } from "shared/ui/classes";

interface RecapInputs {
  mode: RecapMode;
  date: string;
  weekStart: string;
  year: number;
  month: number;
}

export function renderRecapView(container: HTMLElement): () => void {
  const page = el("div", { className: "flex flex-col gap-6" });
  const pageHeader = el("div", { className: "flex flex-col gap-1" }, [
    el("h2", { className: "text-2xl", textContent: "Recap" }),
    el("p", {
      className: "text-muted text-sm",
      textContent: "Shows the conclusion of user activity.",
    }),
  ]);

  const controlCard = createCard();
  const controlGrid = el("div", {
    className: "grid gap-4 grid-cols-[repeat(auto-fit,minmax(220px,1fr))]",
  });

  const today = dayjs();
  const inputs: RecapInputs = {
    mode: "daily",
    date: today.format("YYYY-MM-DD"),
    weekStart: today.startOf("week").format("YYYY-MM-DD"),
    year: today.year(),
    month: today.month() + 1,
  };

  const viewControl = createSelectControl("View", [
    { label: "Daily", value: "daily" },
    { label: "Weekly", value: "weekly" },
    { label: "Monthly", value: "monthly" },
  ]);
  const refreshButton = createButton("Refresh", "primary");
  refreshButton.addEventListener("click", () => triggerLoad());

  viewControl.select.value = inputs.mode;

  const modeInputsContainer = el("div", {
    className:
      "col-span-full grid gap-4 grid-cols-[repeat(auto-fit,minmax(220px,1fr))]",
  });

  viewControl.select.addEventListener("change", () => {
    inputs.mode = viewControl.select.value as RecapMode;
    renderModeInputs();
    triggerLoad();
  });

  const actions = el(
    "div",
    { className: "col-span-full flex justify-end mt-1" },
    [refreshButton],
  );

  controlGrid.append(viewControl.wrapper, modeInputsContainer, actions);
  controlCard.append(controlGrid);

  const recapCard = el("section", {
    className:
      "bg-surface border border-ring rounded-2xl p-6 " +
      "shadow-card flex flex-col gap-4",
  });

  const summaryContainer = el("p", {
    className: "flex flex-wrap gap-2 items-center text-sm",
  });
  recapCard.append(summaryContainer);

  const bodyContainer = el("div", {
    className: "grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-6",
  });

  const canvas = document.createElement("canvas");
  const chartCard = createCard();
  const chartWrapper = el("div", { className: "relative w-full h-chart" });
  chartWrapper.appendChild(canvas);
  chartCard.appendChild(chartWrapper);

  const tableContainer = el("div", { className: "overflow-x-auto" });
  const tableCard = createCard();
  tableCard.appendChild(tableContainer);

  bodyContainer.append(chartCard, tableCard);
  recapCard.append(bodyContainer);

  page.append(pageHeader, controlCard, recapCard);
  container.replaceChildren(page);

  let chart: Chart | null = null;

  function renderModeInputs(): void {
    const fields: HTMLElement[] = [];

    if (inputs.mode === "daily") {
      const dateInput = document.createElement("input");
      dateInput.type = "date";
      dateInput.className = INPUT_CLASSES;
      dateInput.value = inputs.date;
      dateInput.addEventListener("input", () => {
        inputs.date = dateInput.value;
      });
      fields.push(createControl("Date", dateInput));
    }

    if (inputs.mode === "weekly") {
      const weekInput = document.createElement("input");
      weekInput.type = "date";
      weekInput.className = INPUT_CLASSES;
      weekInput.value = inputs.weekStart;
      weekInput.addEventListener("input", () => {
        inputs.weekStart = weekInput.value;
      });
      fields.push(createControl("Week start", weekInput));
    }

    if (inputs.mode === "monthly") {
      const yearInput = document.createElement("input");
      yearInput.type = "number";
      yearInput.className = INPUT_CLASSES;
      yearInput.min = "2000";
      yearInput.max = "2100";
      yearInput.value = String(inputs.year);
      yearInput.addEventListener("input", () => {
        inputs.year = Number(yearInput.value);
      });

      const monthInput = document.createElement("input");
      monthInput.type = "number";
      monthInput.className = INPUT_CLASSES;
      monthInput.min = "1";
      monthInput.max = "12";
      monthInput.value = String(inputs.month);
      monthInput.addEventListener("input", () => {
        inputs.month = Number(monthInput.value);
      });

      fields.push(createControl("Year", yearInput));
      fields.push(createControl("Month", monthInput));
    }

    setChildren(modeInputsContainer, fields);
  }

  function triggerLoad(): void {
    const params: Record<string, string> = {
      tz_offset: String(new Date().getTimezoneOffset()),
    };
    if (inputs.mode === "daily") params.date = inputs.date;
    else if (inputs.mode === "weekly") params.week_start = inputs.weekStart;
    else {
      params.year = String(inputs.year);
      params.month = String(inputs.month);
    }
    void loadRecap(inputs.mode, params);
  }

  function renderRecap(): void {
    const recapState = getRecapState();

    refreshButton.disabled = recapState.isLoading;
    refreshButton.textContent = recapState.isLoading
      ? "Refreshing…"
      : "Refresh";

    if (recapState.isLoading) {
      setChildren(summaryContainer, [el("span", { className: "skeleton" })]);
      setChildren(tableContainer, [el("div", { className: "skeleton" })]);
      destroyChart();
      return;
    }

    if (recapState.error) {
      setChildren(summaryContainer, [
        el("span", {
          className: "text-sm text-danger-fg",
          textContent: recapState.error,
        }),
      ]);
      setChildren(tableContainer, []);
      destroyChart();
      return;
    }

    if (!recapState.data) {
      setChildren(summaryContainer, [
        el("span", {
          className: "text-sm text-muted-strong",
          textContent: "No recap data yet.",
        }),
      ]);
      setChildren(tableContainer, []);
      destroyChart();
      return;
    }

    const summary = recapState.data;
    const startOfPeriod = dayjs(summary.start).startOf("day");

    const formatMinutes = (minutes: number): string => {
      const hours = Math.floor(minutes / 60);
      const remaining = minutes % 60;
      const parts: string[] = [];
      if (hours > 0) parts.push(`${hours}h`);
      parts.push(`${remaining}m`);
      return parts.join(" ");
    };

    const pieces = [
      `Period: ${summary.label}`,
      `${startOfPeriod.format("YYYY-MM-DD HH:mm")} → ${dayjs(summary.end).format("YYYY-MM-DD HH:mm")}`,
      `Total minutes: ${summary.total_minutes}`,
    ];

    const summaryElements = pieces.flatMap((text, index) => {
      const elements: HTMLElement[] = [];
      elements.push(el("span", { textContent: text }));
      if (index < pieces.length - 1) {
        elements.push(
          el("span", {
            className: "w-1 h-1 rounded-full bg-muted",
            attrs: { "aria-hidden": "true" },
          }),
        );
      }
      return elements;
    });

    setChildren(summaryContainer, summaryElements);

    if (!summary.entries.length) {
      setChildren(tableContainer, [
        el("p", {
          className:
            "p-6 text-center text-muted border border-dashed border-ring rounded-xl bg-white/60",
          textContent: "No data for the selected period.",
        }),
      ]);
      destroyChart();
      return;
    }

    const table = document.createElement("table");
    table.className = "w-full border-collapse text-sm bg-surface";

    const thead = document.createElement("thead");
    const headerRow = document.createElement("tr");
    ["Activity", "Minutes", "%"].forEach((label, index) => {
      const th = document.createElement("th");
      th.textContent = label;
      th.className =
        "font-semibold text-muted-strong px-3 py-3 border-b border-ring bg-slate-50" +
        (index === 0 ? " text-left" : " text-right");
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement("tbody");
    summary.entries.forEach((entry) => {
      const row = document.createElement("tr");
      row.className = "hover:bg-slate-50";

      const nameCell = document.createElement("td");
      nameCell.textContent =
        entry.activity_name ?? `Activity #${entry.activity_id}`;
      nameCell.className = "px-3 py-3 border-b border-ring";

      const minutesCell = document.createElement("td");
      minutesCell.textContent = formatMinutes(entry.minutes);
      minutesCell.className = "px-3 py-3 border-b border-ring text-right";

      const percentCell = document.createElement("td");
      percentCell.textContent = `${entry.percentage.toFixed(1)}%`;
      percentCell.className = "px-3 py-3 border-b border-ring text-right";

      row.append(nameCell, minutesCell, percentCell);
      tbody.appendChild(row);
    });
    table.appendChild(tbody);
    setChildren(tableContainer, [table]);

    renderChart(summary.entries);
  }

  function renderChart(
    entries: {
      activity_name: string | null;
      activity_id: number;
      minutes: number;
    }[],
  ): void {
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

  function generatePalette(count: number): string[] {
    return Array.from({ length: count }, (_, i) => {
      const hue = Math.round((360 / Math.max(1, count)) * i);
      return `hsl(${hue}, 70%, 60%)`;
    });
  }

  renderModeInputs();
  triggerLoad();
  renderRecap();

  const unsubscribe = subscribe(["recap"], renderRecap);

  return () => {
    unsubscribe();
    destroyChart();
  };
}

function createSelectControl(
  label: string,
  options: { label: string; value: string }[],
): { wrapper: HTMLElement; select: HTMLSelectElement } {
  const select = document.createElement("select");
  select.className = SELECT_CLASSES;
  options.forEach((option) => {
    const opt = document.createElement("option");
    opt.value = option.value;
    opt.textContent = option.label;
    select.appendChild(opt);
  });
  return { wrapper: createControl(label, select), select };
}

function createControl(label: string, input: HTMLElement): HTMLElement {
  const wrapper = el("label", { className: "flex flex-col gap-1.5" });
  const labelText = el("span", {
    className: "text-sm font-semibold text-muted-strong",
    textContent: label,
  });
  wrapper.append(labelText, input);
  return wrapper;
}
