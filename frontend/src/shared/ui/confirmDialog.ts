import { html, render } from "lit-html";
import { BUTTON_DANGER_CLASSES, BUTTON_PRIMARY_CLASSES } from "shared/ui/classes";

const CANCEL_CLASSES =
  "rounded-full px-4 py-2.5 text-sm font-semibold border border-ring " +
  "bg-surface text-fg hover:bg-slate-100 transition-colors duration-150";

/**
 * Shows a confirmation dialog before a destructive action.
 * Returns true if the user confirmed, false if they cancelled.
 *
 * On mobile it renders as a bottom sheet; on sm+ it renders as a centered modal.
 */
export function confirmDelete(label: string): Promise<boolean> {
  return new Promise((resolve) => {
    const host = document.createElement("div");
    document.body.appendChild(host);

    function dismiss(confirmed: boolean) {
      resolve(confirmed);
      render(html``, host);
      document.body.removeChild(host);
      document.removeEventListener("keydown", onKeyDown);
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") dismiss(false);
    }
    document.addEventListener("keydown", onKeyDown);

    function template() {
      return html`
        <!-- Backdrop -->
        <div
          class="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
          @click=${() => dismiss(false)}
        ></div>

        <!-- Dialog — bottom sheet on mobile, centered card on sm+ -->
        <div
          class="fixed inset-x-0 bottom-0 z-50 sm:inset-0 sm:flex sm:items-center sm:justify-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-dialog-title"
        >
          <div
            class="bg-surface rounded-t-2xl sm:rounded-2xl shadow-card p-6 w-full sm:max-w-sm flex flex-col gap-5"
            @click=${(e: Event) => e.stopPropagation()}
          >
            <!-- Icon + heading -->
            <div class="flex flex-col items-center gap-3 text-center">
              <div
                class="w-12 h-12 rounded-full bg-danger-bg flex items-center justify-center"
              >
                <svg
                  class="w-6 h-6 text-danger-fg"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
                  />
                </svg>
              </div>
              <div>
                <h2
                  id="confirm-dialog-title"
                  class="text-base font-semibold text-fg"
                >
                  Delete ${label}?
                </h2>
                <p class="text-sm text-muted mt-1">
                  This action cannot be undone.
                </p>
              </div>
            </div>

            <!-- Actions — stacked on mobile, side-by-side on sm+ -->
            <div class="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
              <button
                class=${CANCEL_CLASSES + " py-3 sm:py-2.5"}
                @click=${() => dismiss(false)}
              >
                Cancel
              </button>
              <button
                class=${BUTTON_DANGER_CLASSES + " py-3 sm:py-2.5"}
                @click=${() => dismiss(true)}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      `;
    }

    render(template(), host);
  });
}
