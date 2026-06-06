import { html, render } from "lit-html";
import dayjs from "shared/lib/dayjs";
import {
  createTrack,
  deleteTrack,
  loadActivities,
  loadTracks,
  loadUsers,
  subscribe,
} from "shared/store";
import { createDateInput } from "shared/ui/dateInput";
import { createTimePicker, roundToNextQuarterHour } from "shared/ui/timePicker";
import { createTrackSection } from "features/tracks/createTrackForm";
import { existingTracksSection } from "features/tracks/existingTracksTable";

// ── Style constants ───────────────────────────────────────────────────────────

const CARD =
  "bg-surface border border-ring rounded-2xl p-6 shadow-card flex flex-col gap-5";

// ── Local state ───────────────────────────────────────────────────────────────

export interface FormState {
  userId: string;
  activityId: string;
  comment: string;
  errors: Partial<
    Record<
      "startDate" | "endDate" | "start" | "end" | "user" | "activity",
      string
    >
  >;
  isSubmitting: boolean;
  feedback: { message: string | null; isError: boolean };
  deletingIds: Set<number>;
}

function createFormState(): FormState {
  return {
    userId: "",
    activityId: "",
    comment: "",
    errors: {},
    isSubmitting: false,
    feedback: { message: null, isError: false },
    deletingIds: new Set(),
  };
}

// ── Handler shape ─────────────────────────────────────────────────────────────

export interface FormHandlers {
  onUserChange: (value: string) => void;
  onActivityChange: (value: string) => void;
  onCommentChange: (value: string) => void;
  onSubmit: (e: Event) => void;
  onDeleteTrack: (id: number) => void;
}

// ── Stable controls (created once, reused across renders) ───────────────────────

export type FormControls = {
  startDate: HTMLInputElement;
  endDate: HTMLInputElement;
  listDate: HTMLInputElement;
  startTimePicker: HTMLElement;
  endTimePicker: HTMLElement;
};

// ── Templates ─────────────────────────────────────────────────────────────────

function tracksPage(
  state: FormState,
  handlers: FormHandlers,
  controls: FormControls,
) {
  return html`
    <div class="flex flex-col gap-6">
      <div class="flex flex-col gap-1">
        <h2 class="text-2xl">Tracks</h2>
        <p class="text-muted text-sm">Input what have been done today.</p>
      </div>
      <section class=${CARD}>
        ${createTrackSection(state, handlers, controls)}

        <div class="h-px bg-ring -mt-1 -mx-6"></div>

        ${existingTracksSection(state, handlers, controls)}
      </section>
    </div>
  `;
}

// ── Main export ───────────────────────────────────────────────────────────────

export function renderTracksView(container: HTMLElement): () => void {
  const root = document.createElement("div");
  container.replaceChildren(root);

  const today = dayjs().format("YYYY-MM-DD");
  const startDateInput = createDateInput(today);
  const endDateInput = createDateInput(today);
  const listDateInput = createDateInput(today);

  const startTimeDefault = roundToNextQuarterHour(dayjs());
  const endTimeDefault = startTimeDefault.add(1, "hour");
  const startTimePicker = createTimePicker(startTimeDefault.format("HH:mm"));
  const endTimePicker = createTimePicker(endTimeDefault.format("HH:mm"));

  const controls: FormControls = {
    startDate: startDateInput.element,
    endDate: endDateInput.element,
    listDate: listDateInput.element,
    startTimePicker: startTimePicker.element,
    endTimePicker: endTimePicker.element,
  };

  // Changing the list date filter immediately reloads the table.
  listDateInput.element.addEventListener("change", () => {
    void loadTracks({ date: listDateInput.getValue(), force: true });
  });

  const state = createFormState();

  function update(): void {
    render(tracksPage(state, trackFormHandlers, controls), root);
  }

  const validate = (): boolean => {
    state.errors = {};
    const startDateVal = startDateInput.getValue();
    const endDateVal = endDateInput.getValue();
    if (!startDateVal) state.errors.startDate = "Start date is required.";
    if (!endDateVal) state.errors.endDate = "End date is required.";
    if (!state.userId) state.errors.user = "Select a user.";
    if (!state.activityId) state.errors.activity = "Select an activity.";
    if (startDateVal && endDateVal) {
      const startDateTime = dayjs(
        `${startDateVal}T${startTimePicker.getValue()}`,
      );
      const endDateTime = dayjs(`${endDateVal}T${endTimePicker.getValue()}`);
      if (!endDateTime.isAfter(startDateTime)) {
        state.errors.end = "End date/time must be after start.";
        state.errors.endDate = "End date/time must be after start.";
      }
    }
    return Object.keys(state.errors).length === 0;
  };

  // Form event handlers for the Tracks card — mutate state and call update()
  const trackFormHandlers: FormHandlers = {
    onUserChange(value) {
      state.userId = value;
      update();
    },

    onActivityChange(value) {
      state.activityId = value;
      update();
    },

    onCommentChange(value) {
      state.comment = value;
      update();
    },

    async onSubmit(e) {
      e.preventDefault();
      if (state.isSubmitting) return;
      if (!validate()) {
        update();
        return;
      }

      const startDateTime = dayjs(
        `${startDateInput.getValue()}T${startTimePicker.getValue()}`,
      );
      const endDateTime = dayjs(
        `${endDateInput.getValue()}T${endTimePicker.getValue()}`,
      );

      state.isSubmitting = true;
      state.feedback = { message: null, isError: false };
      update();

      try {
        await createTrack({
          user: Number(state.userId),
          activity: Number(state.activityId),
          start_time: startDateTime.toISOString(),
          end_time: endDateTime.toISOString(),
          comment: state.comment.trim() ? state.comment.trim() : undefined,
        });
        await loadTracks({
          date: listDateInput.getValue(),
          force: true,
        });
        state.comment = "";
        const nextStart = endDateTime;
        const nextEnd = nextStart.add(1, "hour");
        startDateInput.setValue(nextStart.format("YYYY-MM-DD"));
        endDateInput.setValue(nextEnd.format("YYYY-MM-DD"));
        startTimePicker.setValue(nextStart.format("HH:mm"));
        endTimePicker.setValue(nextEnd.format("HH:mm"));
        state.feedback = { message: "Track created!", isError: false };
      } catch (error) {
        state.feedback = {
          message: (error as Error).message,
          isError: true,
        };
      } finally {
        state.isSubmitting = false;
        update();
      }
    },

    async onDeleteTrack(id) {
      if (state.deletingIds.has(id)) return;

      state.deletingIds.add(id);
      // Clear any stale "Track created!" feedback
      state.feedback = { message: null, isError: false };
      update();

      try {
        await deleteTrack(id);
      } finally {
        state.deletingIds.delete(id);
        update();
      }
    },
  };

  // Initial render — trackFormHandlers is fully initialised by this point.
  update();

  // Re-render whenever the store notifies us (e.g. after loadTracks resolves).
  const unsubscribe = subscribe(["tracks", "users", "activities"], update);

  void loadUsers();
  void loadActivities();
  void loadTracks({ date: listDateInput.getValue(), force: true });

  return () => unsubscribe();
}
