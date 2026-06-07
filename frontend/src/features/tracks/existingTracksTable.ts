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
    <div class="overflow-x-auto">
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
