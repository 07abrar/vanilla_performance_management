import { html, nothing, TemplateResult } from "lit-html";
import { getActivitiesState, getUsersState } from "shared/store";
import { INPUT_CLASSES, SELECT_CLASSES } from "shared/ui/classes";
import type {
  FormControls,
  FormHandlers,
  FormState,
} from "features/tracks/page";

// ── Style constants ───────────────────────────────────────────────────────────

const BTN_BASE =
  "rounded-full px-4 py-2.5 text-sm font-semibold border border-transparent " +
  "transition-colors duration-150 disabled:opacity-60 disabled:cursor-not-allowed";

const BTN_PRIMARY =
  BTN_BASE +
  " bg-primary text-white border-primary hover:bg-primary-dark" +
  " disabled:bg-primary-disabled disabled:border-primary-disabled disabled:text-white";

// ── Templates ─────────────────────────────────────────────────────────────────

function feedbackMessage(feedback: FormState["feedback"]) {
  const cls = feedback.isError
    ? "text-sm text-danger-fg"
    : "text-sm text-teal-700";
  return html`
    <p class=${feedback.message ? cls : "text-sm text-muted-strong"}>
      ${feedback.message ?? ""}
    </p>
  `;
}

function fieldWrapper(
  label: string,
  input: HTMLElement | TemplateResult,
  error?: string,
  optional = false,
) {
  return html`
    <label class="flex flex-col gap-1.5">
      <span class="text-sm font-semibold text-muted-strong">
        ${label}${optional
          ? html`<span class="font-normal text-muted"> (optional)</span>`
          : nothing}
      </span>
      ${input}
      ${error
        ? html`<div class="text-danger-fg text-xs mt-1.5">${error}</div>`
        : nothing}
    </label>
  `;
}

export function createTrackSection(
  state: FormState,
  handlers: FormHandlers,
  controls: FormControls,
) {
  const usersData = getUsersState()
    .data.slice()
    .sort((a, b) => a.name.localeCompare(b.name));
  const activitiesData = getActivitiesState()
    .data.slice()
    .sort((a, b) => a.name.localeCompare(b.name));

  return html`
    <div class="flex flex-col gap-1.5">
      <h3 class="text-lg font-semibold">Create a track</h3>
      <p class="text-muted text-sm">Input activities.</p>
    </div>
    <form class="track-form" autocomplete="off" @submit=${handlers.onSubmit}>
      <div class="flex flex-col gap-4">
        <div class="flex gap-2">
          ${fieldWrapper(
            "Start date",
            controls.startDate,
            state.errors.startDate,
          )}
          ${fieldWrapper(
            "Start time",
            controls.startTimePicker,
            state.errors.start,
          )}
          ${fieldWrapper(
            "User",
            html`<select
              class=${SELECT_CLASSES}
              @change=${(e: Event) =>
                handlers.onUserChange((e.target as HTMLSelectElement).value)}
            >
              <option value="" ?selected=${!state.userId}>Select a user</option>
              ${usersData.map(
                (u) => html`
                  <option
                    value=${String(u.id)}
                    ?selected=${state.userId === String(u.id)}
                  >
                    ${u.name}
                  </option>
                `,
              )}
            </select>`,
            state.errors.user,
          )}
        </div>
        <div class="flex gap-2">
          ${fieldWrapper("End date", controls.endDate, state.errors.endDate)}
          ${fieldWrapper("End time", controls.endTimePicker, state.errors.end)}
          ${fieldWrapper(
            "Activity",
            html`<select
              class=${SELECT_CLASSES}
              @change=${(e: Event) =>
                handlers.onActivityChange(
                  (e.target as HTMLSelectElement).value,
                )}
            >
              <option value="" ?selected=${!state.activityId}>
                Select an activity
              </option>
              ${activitiesData.map(
                (a) => html`
                  <option
                    value=${String(a.id)}
                    ?selected=${state.activityId === String(a.id)}
                  >
                    ${a.name}
                  </option>
                `,
              )}
            </select>`,
            state.errors.activity,
          )}
        </div>
        <div class="flex gap-2">
          ${fieldWrapper(
            "Comment",
            html`<textarea
              placeholder="Optional comment"
              .rows=${2}
              class=${INPUT_CLASSES}
              .value=${state.comment}
              @input=${(e: Event) =>
                handlers.onCommentChange(
                  (e.target as HTMLTextAreaElement).value,
                )}
            ></textarea>`,
            undefined,
            true,
          )}
        </div>
      </div>
      <div class="flex justify-end">
        <button type="submit" class=${BTN_PRIMARY} ?disabled=${state.isSubmitting}>
          Create track
        </button>
      </div>
      ${feedbackMessage(state.feedback)}
    </form>
  `;
}
