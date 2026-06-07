import { html, nothing, TemplateResult } from "lit-html";
import { getActivitiesState, getUsersState } from "shared/store";
import {
  BUTTON_PRIMARY_CLASSES,
  INPUT_CLASSES,
  SELECT_CLASSES,
} from "shared/ui/classes";
import { feedbackMessage } from "shared/ui/feedback";
import type {
  FormControls,
  FormHandlers,
  FormState,
} from "features/tracks/page";

// ── Templates ─────────────────────────────────────────────────────────────────

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
        <div class="flex flex-col gap-2 sm:flex-row">
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
        <div class="flex flex-col gap-2 sm:flex-row">
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
        <div class="flex flex-col gap-2 sm:flex-row">
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
        <button
          type="submit"
          class=${BUTTON_PRIMARY_CLASSES}
          ?disabled=${state.isSubmitting}
        >
          Create track
        </button>
      </div>
      ${feedbackMessage(state.feedback)}
    </form>
  `;
}
