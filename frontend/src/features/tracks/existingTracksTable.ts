import { html, nothing } from "lit-html";
import { Track } from "shared/api/types";
import dayjs from "shared/lib/dayjs";
import { formatMinutes } from "shared/lib/format";
import { getActivityName, getTracksState, getUserName } from "shared/store";
import { BUTTON_DANGER_CLASSES } from "shared/ui/classes";
import type {
  FormControls,
  FormHandlers,
  FormState,
} from "features/tracks/page";

// ── Style constants ───────────────────────────────────────────────────────────

const CELL = "px-3 py-3 border-b border-ring align-top";

// ── Templates ─────────────────────────────────────────────────────────────────

function tracksTable(state: FormState, handlers: FormHandlers) {
  const tracksState = getTracksState();

  if (tracksState.isLoading) {
    return html`<div class="skeleton"></div>`;
  }
  // Only replace the whole table when there's nothing to show (e.g. a load failure)
  if (tracksState.error && !tracksState.data.length) {
    return html`<p class="text-sm text-danger-fg">${tracksState.error}</p>`;
  }
  if (!tracksState.data.length) {
    return html`
      <p
        class="p-6 text-center text-muted border border-dashed border-ring rounded-xl bg-white/60"
      >
        No tracks yet.
      </p>
    `;
  }

  return html`
    <!-- Mobile cards (sm and up: hidden) -->
    <div class="flex flex-col gap-3 sm:hidden">
      ${tracksState.error
        ? html`<p class="text-sm text-danger-fg">${tracksState.error}</p>`
        : nothing}
      ${tracksState.data.map((track: Track) => {
        const start = dayjs(track.start_time);
        const end = dayjs(track.end_time);
        const duration = end.diff(start, "minute");
        const endText = end.isSame(start, "day")
          ? end.format("HH:mm")
          : `${end.format("YYYY-MM-DD")} ${end.format("HH:mm")}`;

        return html`
          <div
            class="border border-ring rounded-xl bg-surface p-4 flex flex-col gap-2"
          >
            <div class="flex items-start justify-between gap-2">
              <div>
                <div class="font-semibold text-sm">
                  ${start.format("YYYY-MM-DD")}
                </div>
                <div class="text-xs text-muted mt-0.5">
                  ${start.format("HH:mm")} → ${endText}
                </div>
              </div>
              <span
                class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary-dark text-xs font-semibold shrink-0"
              >
                ${formatMinutes(duration)}
              </span>
            </div>
            <div class="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              <div>
                <span class="text-muted text-xs">User</span>
                <div class="font-medium">${getUserName(track.user_id)}</div>
              </div>
              <div>
                <span class="text-muted text-xs">Activity</span>
                <div class="font-medium">
                  ${getActivityName(track.activity_id)}
                </div>
              </div>
            </div>
            ${track.comment
              ? html`<p
                  class="text-sm text-muted-strong border-t border-ring pt-2 mt-1"
                >
                  ${track.comment}
                </p>`
              : nothing}
            <div class="flex justify-end mt-1">
              <button
                class=${BUTTON_DANGER_CLASSES}
                ?disabled=${state.deletingIds.has(track.id)}
                @click=${() => handlers.onDeleteTrack(track.id)}
              >
                Delete
              </button>
            </div>
          </div>
        `;
      })}
    </div>

    <!-- Desktop table (hidden on mobile) -->
    <div class="hidden sm:block overflow-x-auto">
      ${tracksState.error
        ? html`<p class="text-sm text-danger-fg mb-2">${tracksState.error}</p>`
        : nothing}
      <table class="w-full border-collapse text-sm bg-surface">
        <thead>
          <tr>
            ${[
              "Date",
              "Start",
              "End",
              "Duration",
              "User",
              "Activity",
              "Comment",
              "",
            ].map(
              (heading) => html`
                <th
                  class=${"text-left font-semibold text-muted-strong px-3 py-3 border-b border-ring bg-slate-50" +
                  (heading === "" ? " text-right" : "")}
                >
                  ${heading}
                </th>
              `,
            )}
          </tr>
        </thead>
        <tbody>
          ${tracksState.data.map((track: Track) => {
            const start = dayjs(track.start_time);
            const end = dayjs(track.end_time);
            const duration = end.diff(start, "minute");
            const endText = end.isSame(start, "day")
              ? end.format("HH:mm")
              : `${end.format("YYYY-MM-DD")} ${end.format("HH:mm")}`;

            return html`
              <tr class="hover:bg-slate-50">
                <td class="${CELL} font-semibold">
                  ${start.format("YYYY-MM-DD")}
                </td>
                <td class="${CELL} font-semibold">${start.format("HH:mm")}</td>
                <td class=${CELL}>${endText}</td>
                <td class=${CELL}>
                  <span
                    class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary-dark text-xs font-semibold"
                  >
                    ${formatMinutes(duration)}
                  </span>
                </td>
                <td class=${CELL}>${getUserName(track.user_id)}</td>
                <td class=${CELL}>${getActivityName(track.activity_id)}</td>
                <td class="${CELL} text-muted-strong">
                  ${track.comment ?? "—"}
                </td>
                <td class="${CELL} text-right">
                  <button
                    class=${BUTTON_DANGER_CLASSES}
                    ?disabled=${state.deletingIds.has(track.id)}
                    @click=${() => handlers.onDeleteTrack(track.id)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            `;
          })}
        </tbody>
      </table>
    </div>
  `;
}

export function existingTracksSection(
  state: FormState,
  handlers: FormHandlers,
  controls: FormControls,
) {
  return html`
    <div class="flex flex-col gap-1.5">
      <h3 class="text-lg font-semibold">Existing tracks</h3>
      <p class="text-muted text-sm">List of activities that have been done.</p>
    </div>
    <div class="max-w-filter">
      <label class="flex flex-col gap-1.5">
        <span class="text-sm font-semibold text-muted-strong">Date</span>
        ${controls.listDate}
      </label>
    </div>
    ${tracksTable(state, handlers)}
  `;
}
