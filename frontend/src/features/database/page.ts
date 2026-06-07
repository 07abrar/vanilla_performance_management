import { html, render } from "lit-html";
import { Entity } from "shared/api/types";
import {
  createActivity,
  createUser,
  deleteActivity,
  deleteUser,
  getActivitiesState,
  getUsersState,
  loadActivities,
  loadUsers,
  subscribe,
} from "shared/store";

// ── Style constants ───────────────────────────────────────────────────────────

const CARD =
  "bg-surface border border-ring rounded-2xl p-6 shadow-card flex flex-col gap-5";

const BTN_BASE =
  "rounded-full px-4 py-2.5 text-sm font-semibold border border-transparent " +
  "transition-colors duration-150 disabled:opacity-60 disabled:cursor-not-allowed";

const BTN_PRIMARY =
  BTN_BASE +
  " bg-primary text-white border-primary hover:bg-primary-dark" +
  " disabled:bg-primary-disabled disabled:border-primary-disabled disabled:text-white";

const BTN_DANGER =
  BTN_BASE +
  " bg-danger-bg text-danger-fg border-danger-border hover:bg-red-200";

// ── Local state ───────────────────────────────────────────────────────────────

interface ItemState {
  inputValue: string;
  isSubmitting: boolean;
  deletingIds: Set<number>;
  feedback: { message: string | null; isError: boolean };
}

function createCardState(): ItemState {
  return {
    inputValue: "",
    isSubmitting: false,
    deletingIds: new Set(),
    feedback: { message: null, isError: false },
  };
}

// ── Handler shape ─────────────────────────────────────────────────────────────

interface ItemHandlers {
  onInput: (value: string) => void;
  onSubmit: (e: Event) => void;
  onDelete: (id: number) => void;
}

// ── Templates ─────────────────────────────────────────────────────────────────

function feedbackMessage(feedback: ItemState["feedback"]) {
  const cls = feedback.isError
    ? "text-sm text-danger-fg"
    : "text-sm text-teal-700";
  return html`
    <p class=${feedback.message ? cls : "text-sm text-muted-strong"}>
      ${feedback.message ?? ""}
    </p>
  `;
}

function itemsList<T extends Entity>(
  listState: { data: T[]; isLoading: boolean; error: string | null },
  cardState: ItemState,
  handlers: ItemHandlers,
) {
  if (listState.isLoading) {
    return html`<div class="skeleton"></div>`;
  }
  if (listState.error) {
    return html`<p class="text-sm text-danger-fg">${listState.error}</p>`;
  }
  if (!listState.data.length) {
    return html`
      <p
        class="p-6 text-center text-muted border border-dashed border-ring rounded-xl bg-white/60"
      >
        No items yet.
      </p>
    `;
  }
  return html`
    <div class="mt-2.5 border-t border-dashed border-ring pt-2.5">
      ${listState.data.map(
        (item) => html`
          <div class="flex justify-between py-1.5">
            <span>${item.name}</span>
            <button
              class=${BTN_DANGER}
              ?disabled=${cardState.deletingIds.has(item.id)}
              @click=${() => handlers.onDelete(item.id)}
            >
              Delete
            </button>
          </div>
        `,
      )}
    </div>
  `;
}

function itemsListContainer<T extends Entity>(
  config: { title: string; subtitle: string; placeholder: string },
  listState: { data: T[]; isLoading: boolean; error: string | null },
  cardState: ItemState,
  handlers: ItemHandlers,
) {
  return html`
    <section class=${CARD}>
      <div class="flex flex-col gap-1.5">
        <h3 class="text-lg font-semibold">${config.title}</h3>
        <p class="text-muted text-sm">${config.subtitle}</p>
      </div>

      <form
        class="flex gap-2 mb-2.5"
        autocomplete="off"
        @submit=${handlers.onSubmit}
      >
        <input
          type="text"
          placeholder=${config.placeholder}
          class="flex-1 px-2.5 py-2 border border-ring rounded-lg"
          .value=${cardState.inputValue}
          ?disabled=${cardState.isSubmitting}
          @input=${(e: Event) =>
            handlers.onInput((e.target as HTMLInputElement).value)}
        />
        <button
          type="submit"
          class=${BTN_PRIMARY}
          ?disabled=${cardState.isSubmitting}
        >
          Add
        </button>
      </form>

      ${feedbackMessage(cardState.feedback)}

      <div class="h-px bg-ring -mt-1 -mx-6"></div>

      ${itemsList(listState, cardState, handlers)}
    </section>
  `;
}

function databasePage(
  usersState: ItemState,
  activitiesState: ItemState,
  usersFormHandlers: ItemHandlers,
  activitiesFormHandlers: ItemHandlers,
) {
  return html`
    <div class="flex flex-col gap-6">
      <div class="flex flex-col gap-1">
        <h2 class="text-2xl">Database</h2>
        <p class="text-muted text-sm">Manage users and activities list.</p>
      </div>
      <div class="grid gap-6 grid-cols-[repeat(auto-fit,minmax(320px,1fr))]">
        ${itemsListContainer(
          {
            title: "Users",
            subtitle: "User name to be tracked.",
            placeholder: "User name",
          },
          getUsersState(),
          usersState,
          usersFormHandlers,
        )}
        ${itemsListContainer(
          {
            title: "Activities",
            subtitle: "Activity name to be tracked.",
            placeholder: "Activity name",
          },
          getActivitiesState(),
          activitiesState,
          activitiesFormHandlers,
        )}
      </div>
    </div>
  `;
}

// ── Main export ───────────────────────────────────────────────────────────────

export function renderDatabaseView(container: HTMLElement): () => void {
  const root = document.createElement("div");
  container.replaceChildren(root);

  const usersState = createCardState();
  const activitiesState = createCardState();

  function update(): void {
    render(
      databasePage(
        usersState,
        activitiesState,
        usersFormHandlers,
        activitiesFormHandlers,
      ),
      root,
    );
  }

  // Form event handlers for the Users card — mutate usersState and call update()
  const usersFormHandlers: ItemHandlers = {
    onInput(value) {
      usersState.inputValue = value;
      update();
    },

    async onSubmit(e) {
      e.preventDefault();
      if (usersState.isSubmitting) return;

      const trimmed = usersState.inputValue.trim();
      if (!trimmed) return;

      usersState.isSubmitting = true;
      usersState.feedback = { message: null, isError: false };
      update();

      try {
        await createUser({ name: trimmed });
        usersState.inputValue = "";
        usersState.feedback = {
          message: "Created successfully.",
          isError: false,
        };
      } catch (error) {
        usersState.feedback = {
          message: (error as Error).message,
          isError: true,
        };
      } finally {
        usersState.isSubmitting = false;
        update();
      }
    },

    async onDelete(id) {
      if (usersState.deletingIds.has(id)) return;

      usersState.deletingIds.add(id);
      usersState.feedback = { message: null, isError: false };
      update();

      try {
        await deleteUser(id);
        usersState.feedback = { message: "Deleted.", isError: false };
      } catch (error) {
        usersState.feedback = {
          message: (error as Error).message,
          isError: true,
        };
      } finally {
        usersState.deletingIds.delete(id);
        update();
      }
    },
  };

  // Form event handlers for the Activities items — mutate activitiesState and call update()
  const activitiesFormHandlers: ItemHandlers = {
    onInput(value) {
      activitiesState.inputValue = value;
      update();
    },

    async onSubmit(e) {
      e.preventDefault();
      if (activitiesState.isSubmitting) return;

      const trimmed = activitiesState.inputValue.trim();
      if (!trimmed) return;

      activitiesState.isSubmitting = true;
      activitiesState.feedback = { message: null, isError: false };
      update();

      try {
        await createActivity({ name: trimmed });
        activitiesState.inputValue = "";
        activitiesState.feedback = {
          message: "Created successfully.",
          isError: false,
        };
      } catch (error) {
        activitiesState.feedback = {
          message: (error as Error).message,
          isError: true,
        };
      } finally {
        activitiesState.isSubmitting = false;
        update();
      }
    },

    async onDelete(id) {
      if (activitiesState.deletingIds.has(id)) return;

      activitiesState.deletingIds.add(id);
      activitiesState.feedback = { message: null, isError: false };
      update();

      try {
        await deleteActivity(id);
        activitiesState.feedback = { message: "Deleted.", isError: false };
      } catch (error) {
        activitiesState.feedback = {
          message: (error as Error).message,
          isError: true,
        };
      } finally {
        activitiesState.deletingIds.delete(id);
        update();
      }
    },
  };

  // Initial render — usersHandlers and activitiesHandlers are both initialised
  // by this point, so update() can safely reference them.
  update();

  // Re-render whenever the store notifies us (e.g. after loadUsers resolves).
  const unsubscribe = subscribe(["users", "activities"], update);

  void loadUsers();
  void loadActivities();

  // Cleanup: lit-html owns the event listeners, so only the store subscription
  // needs to be manually torn down.
  return () => unsubscribe();
}
