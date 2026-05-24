import dayjs from "dayjs";
import {
  createTrack,
  deleteTrack,
  getActivitiesState,
  getActivityName,
  getTracksState,
  getUserName,
  getUsersState,
  loadActivities,
  loadTracks,
  loadUsers,
  subscribe,
} from "../store";
import { Activity, Track, User } from "../type";
import {
  createButton,
  createCard,
  el,
  formatMinutes,
  setChildren,
} from "../ui/dom";
import { createTimePicker, roundToNextQuarterHour } from "../ui/timePicker";

const INPUT_CLASSES =
  "w-full px-3 py-2.5 border border-ring rounded-[10px] bg-surface text-sm text-fg " +
  "transition-colors duration-150 " +
  "focus:outline-none focus:border-primary focus:shadow-[0_0_0_3px_rgba(37,99,235,0.18)] " +
  "disabled:bg-slate-100 disabled:text-muted disabled:cursor-not-allowed";

const SELECT_CLASSES = INPUT_CLASSES + " min-h-[40px]";

interface FormState {
  startDate: string;
  start: string;
  endDate: string;
  end: string;
  userId: string;
  activityId: string;
  comment: string;
  errors: Partial<
    Record<
      "startDate" | "endDate" | "start" | "end" | "user" | "activity",
      string
    >
  >;
}

export function renderTracksView(container: HTMLElement): () => void {
  const page = el("div", { className: "flex flex-col gap-6" });
  const pageHeader = el("div", { className: "flex flex-col gap-1" }, [
    el("h2", { className: "text-2xl", textContent: "Tracks" }),
    el("p", {
      className: "text-muted text-[15px]",
      textContent: "Input what have been done today.",
    }),
  ]);

  const card = createCard();
  const createHeader = el("div", { className: "flex flex-col gap-1.5" }, [
    el("h3", {
      className: "text-lg font-semibold",
      textContent: "Create a track",
    }),
    el("p", {
      className: "text-muted text-sm",
      textContent: "Input activities.",
    }),
  ]);

  const form = document.createElement("form");
  form.className = "track-form";

  const formGrid = el("div", { className: "grid gap-4" });

  const today = dayjs();
  const startDefault = roundToNextQuarterHour(dayjs());
  const endDefault = startDefault.add(1, "hour");

  const startDateInput = document.createElement("input");
  startDateInput.type = "date";
  startDateInput.className = INPUT_CLASSES;
  startDateInput.value = today.format("YYYY-MM-DD");

  const endDateInput = document.createElement("input");
  endDateInput.type = "date";
  endDateInput.className = INPUT_CLASSES;
  endDateInput.value = startDateInput.value;

  const startTimePicker = createTimePicker(startDefault.format("HH:mm"));
  const endTimePicker = createTimePicker(endDefault.format("HH:mm"));

  const userSelect = document.createElement("select");
  userSelect.className = SELECT_CLASSES;

  const activitySelect = document.createElement("select");
  activitySelect.className = SELECT_CLASSES;

  const commentInput = document.createElement("textarea");
  commentInput.placeholder = "Optional comment";
  commentInput.rows = 2;
  commentInput.className = INPUT_CLASSES;

  const errorStartDate = el("div", {
    className: "text-danger-fg text-[13px] mt-1.5",
  });
  const errorEndDate = el("div", {
    className: "text-danger-fg text-[13px] mt-1.5",
  });
  const errorStart = el("div", {
    className: "text-danger-fg text-[13px] mt-1.5",
  });
  const errorEnd = el("div", {
    className: "text-danger-fg text-[13px] mt-1.5",
  });
  const errorUser = el("div", {
    className: "text-danger-fg text-[13px] mt-1.5",
  });
  const errorActivity = el("div", {
    className: "text-danger-fg text-[13px] mt-1.5",
  });

  const firstRow = el("div", {
    className: "grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4",
  });
  firstRow.append(
    createControl("Start date", startDateInput, errorStartDate),
    createControl("Start time", startTimePicker.element, errorStart),
    createControl("User", userSelect, errorUser),
  );

  const secondRow = el("div", {
    className: "grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4",
  });
  secondRow.append(
    createControl("End date", endDateInput, errorEndDate),
    createControl("End time", endTimePicker.element, errorEnd),
    createControl("Activity", activitySelect, errorActivity),
  );

  const thirdRow = el("div");
  thirdRow.append(createControl("Comment", commentInput, null, true));

  formGrid.append(firstRow, secondRow, thirdRow);

  const actions = el("div", { className: "flex justify-end" });
  const submitButton = createButton("Create track", "primary", {
    type: "submit",
  });
  actions.append(submitButton);

  const feedback = el("p", { className: "status-message" });
  const messages = el("div", { className: "min-h-[20px]" }, [feedback]);

  form.append(formGrid, actions, messages);

  const divider = el("div", { className: "h-px bg-ring -mt-1 -mx-6" });

  const listHeader = el("div", { className: "flex flex-col gap-1.5" }, [
    el("h3", {
      className: "text-lg font-semibold",
      textContent: "Existing tracks",
    }),
    el("p", {
      className: "text-muted text-sm",
      textContent: "List of activities that have been done.",
    }),
  ]);

  const listDateInput = document.createElement("input");
  listDateInput.type = "date";
  listDateInput.value = today.format("YYYY-MM-DD");
  listDateInput.className = INPUT_CLASSES;
  const listFilters = el("div", { className: "max-w-[220px]" }, [
    createControl("Date", listDateInput),
  ]);

  const tableWrapper = el("div", { className: "overflow-x-auto" });

  card.append(
    createHeader,
    form,
    divider,
    listHeader,
    listFilters,
    tableWrapper,
  );

  page.append(pageHeader, card);
  container.replaceChildren(page);

  const formState: FormState = {
    startDate: startDateInput.value,
    start: startTimePicker.getValue(),
    endDate: endDateInput.value,
    end: endTimePicker.getValue(),
    userId: "",
    activityId: "",
    comment: "",
    errors: {},
  };

  const resetErrors = () => {
    [
      errorStartDate,
      errorEndDate,
      errorStart,
      errorEnd,
      errorUser,
      errorActivity,
    ].forEach((e) => {
      e.textContent = "";
    });
  };

  const validate = (): boolean => {
    resetErrors();
    const errors: FormState["errors"] = {};
    if (!formState.startDate) errors.startDate = "Start date is required.";
    if (!formState.endDate) errors.endDate = "End date is required.";
    if (!formState.userId) errors.user = "Select a user.";
    if (!formState.activityId) errors.activity = "Select an activity.";
    if (
      formState.start &&
      formState.end &&
      formState.startDate &&
      formState.endDate
    ) {
      const startDateTime = dayjs(`${formState.startDate}T${formState.start}`);
      const endDateTime = dayjs(`${formState.endDate}T${formState.end}`);
      if (!endDateTime.isAfter(startDateTime)) {
        errors.end = "End date/time must be after start.";
        errors.endDate = "End date/time must be after start.";
      }
    }
    if (Object.keys(errors).length > 0) {
      if (errors.startDate) errorStartDate.textContent = errors.startDate;
      if (errors.endDate) errorEndDate.textContent = errors.endDate;
      if (errors.user) errorUser.textContent = errors.user;
      if (errors.activity) errorActivity.textContent = errors.activity;
      if (errors.end) errorEnd.textContent = errors.end;
      return false;
    }
    return true;
  };

  const updateSelectOptions = () => {
    populateSelect(userSelect, getUsersState().data, "user");
    populateSelect(activitySelect, getActivitiesState().data, "activity");
  };

  const handleFormChange = () => {
    formState.startDate = startDateInput.value;
    formState.start = startTimePicker.getValue();
    formState.endDate = endDateInput.value;
    formState.end = endTimePicker.getValue();
    formState.userId = userSelect.value;
    formState.activityId = activitySelect.value;
    formState.comment = commentInput.value;
  };

  const handleSubmit = async (event: Event) => {
    event.preventDefault();
    handleFormChange();
    if (!validate()) return;

    submitButton.disabled = true;
    feedback.textContent = "";
    feedback.className = "status-message";

    const startDateTime = dayjs(`${formState.startDate}T${formState.start}`);
    const endDateTime = dayjs(`${formState.endDate}T${formState.end}`);

    try {
      await createTrack({
        user: Number(formState.userId),
        activity: Number(formState.activityId),
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
        comment: formState.comment.trim()
          ? formState.comment.trim()
          : undefined,
      });
      await loadTracks({ date: listDateInput.value, page: 1, force: true });
      commentInput.value = "";
      formState.comment = "";
      const nextStart = endDateTime;
      const nextEnd = nextStart.add(1, "hour");
      startDateInput.value = nextStart.format("YYYY-MM-DD");
      endDateInput.value = nextEnd.format("YYYY-MM-DD");
      startTimePicker.setValue(nextStart.format("HH:mm"));
      endTimePicker.setValue(nextEnd.format("HH:mm"));
      handleFormChange();
      showSuccess(feedback, "Track created!");
    } catch (error) {
      showError(feedback, (error as Error).message);
    } finally {
      submitButton.disabled = false;
    }
  };

  form.addEventListener("submit", handleSubmit);
  form.addEventListener("change", handleFormChange);
  form.addEventListener("input", handleFormChange);

  const handleListDateChange = () => {
    void loadTracks({ date: listDateInput.value, page: 1, force: true });
  };
  listDateInput.addEventListener("change", handleListDateChange);

  const renderTable = () => {
    const tracksState = getTracksState();

    if (tracksState.isLoading) {
      setChildren(tableWrapper, [el("div", { className: "skeleton" })]);
      return;
    }

    if (tracksState.error) {
      setChildren(tableWrapper, [
        el("p", {
          className: "status-message status-error",
          textContent: tracksState.error,
        }),
      ]);
      return;
    }

    if (!tracksState.data.length) {
      setChildren(tableWrapper, [
        el("p", { className: "empty-state", textContent: "No tracks yet." }),
      ]);
      return;
    }

    const table = document.createElement("table");
    table.className = "w-full border-collapse text-sm bg-surface";

    const thead = document.createElement("thead");
    const headerRow = document.createElement("tr");
    [
      "Date",
      "Start",
      "End",
      "Duration",
      "User",
      "Activity",
      "Comment",
      "",
    ].forEach((heading) => {
      const th = document.createElement("th");
      th.textContent = heading;
      th.className =
        "text-left font-semibold text-muted-strong px-3 py-3 border-b border-ring bg-slate-50";
      if (heading === "") th.className += " text-right";
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement("tbody");

    tracksState.data.forEach((track: Track) => {
      const row = document.createElement("tr");
      row.className = "hover:bg-slate-50";
      const start = dayjs(track.start_time);
      const end = dayjs(track.end_time);
      const duration = end.diff(start, "minute");

      appendCell(row, start.format("YYYY-MM-DD"), "font-semibold");
      appendCell(row, start.format("HH:mm"), "font-semibold");
      const endText = end.isSame(start, "day")
        ? end.format("HH:mm")
        : `${end.format("YYYY-MM-DD")} ${end.format("HH:mm")}`;
      appendCell(row, endText);

      const durationCell = document.createElement("td");
      durationCell.className = "px-3 py-3 border-b border-ring align-top";
      const badge = el("span", {
        className:
          "inline-flex items-center gap-1 px-2 py-0.5 rounded-full " +
          "bg-primary/10 text-primary-dark text-xs font-semibold",
        textContent: formatMinutes(duration),
      });
      durationCell.appendChild(badge);
      row.appendChild(durationCell);

      appendCell(row, getUserName(track.user_id));
      appendCell(row, getActivityName(track.activity_id));
      appendCell(row, track.comment ?? "—", "text-muted-strong");

      const actionCell = document.createElement("td");
      actionCell.className = "px-3 py-3 border-b border-ring text-right";
      const deleteBtn = createButton("Delete", "danger");
      deleteBtn.addEventListener("click", async () => {
        deleteBtn.disabled = true;
        try {
          await deleteTrack(track.id);
        } catch (error) {
          showError(feedback, (error as Error).message);
        } finally {
          deleteBtn.disabled = false;
        }
      });
      actionCell.appendChild(deleteBtn);
      row.appendChild(actionCell);
      tbody.appendChild(row);
    });

    table.appendChild(tbody);
    setChildren(tableWrapper, [table]);
  };

  updateSelectOptions();
  void loadUsers();
  void loadActivities();
  void loadTracks({ date: listDateInput.value, page: 1, force: true });
  renderTable();

  const unsubscribe = subscribe(["tracks", "users", "activities"], () => {
    updateSelectOptions();
    renderTable();
  });

  return () => {
    unsubscribe();
    form.removeEventListener("submit", handleSubmit);
    form.removeEventListener("change", handleFormChange);
    form.removeEventListener("input", handleFormChange);
    listDateInput.removeEventListener("change", handleListDateChange);
  };
}

function appendCell(
  row: HTMLTableRowElement,
  value: string,
  extraClass = "",
): void {
  const cell = document.createElement("td");
  cell.textContent = value;
  cell.className =
    "px-3 py-3 border-b border-ring align-top" +
    (extraClass ? ` ${extraClass}` : "");
  row.appendChild(cell);
}

function populateSelect(
  select: HTMLSelectElement,
  items: (User | Activity)[],
  type: "user" | "activity",
): void {
  const current = select.value;
  select.innerHTML = "";
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent =
    type === "user" ? "Select a user" : "Select an activity";
  select.appendChild(placeholder);
  items
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))
    .forEach((item) => {
      const option = document.createElement("option");
      option.value = String(item.id);
      option.textContent = item.name;
      select.appendChild(option);
    });
  if (Array.from(select.options).some((o) => o.value === current)) {
    select.value = current;
  }
}

function createControl(
  label: string,
  input: HTMLElement,
  helper?: HTMLElement | null,
  optional = false,
): HTMLElement {
  const wrapper = el("label", { className: "flex flex-col gap-1.5" });
  const labelText = el("span", {
    className: "text-sm font-semibold text-muted-strong",
    textContent: label,
  });
  if (optional) {
    labelText.append(
      el("span", {
        className: "font-normal text-muted",
        textContent: " (optional)",
      }),
    );
  }
  wrapper.append(labelText, input);
  if (helper) wrapper.append(helper);
  return wrapper;
}

function showSuccess(target: HTMLElement, message: string): void {
  target.textContent = message;
  target.className = "text-sm text-teal-700";
}

function showError(target: HTMLElement, message: string): void {
  target.textContent = message;
  target.className = "text-sm text-danger-fg";
}
