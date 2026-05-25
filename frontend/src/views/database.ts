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
} from "../store";
import { Activity, User } from "../type";
import {
  createButton,
  createCard,
  el,
  renderList,
  setChildren,
  showMessage,
} from "../ui/dom";

export function renderDatabaseView(container: HTMLElement): () => void {
  const page = el("div", { className: "flex flex-col gap-6" });
  const pageHeader = el("div", { className: "flex flex-col gap-1" }, [
    el("h2", { className: "text-2xl", textContent: "Database" }),
    el("p", {
      className: "text-muted text-sm",
      textContent: "Manage users and activities list.",
    }),
  ]);

  const grid = el("div", {
    className: "grid gap-6 grid-cols-[repeat(auto-fit,minmax(320px,1fr))]",
  });
  page.append(pageHeader, grid);
  container.replaceChildren(page);

  const usersCard = buildEntityCard<User>({
    title: "Users",
    subtitle: "User name to be tracked.",
    placeholder: "User name",
    stateSelector: getUsersState,
    onCreate: (name) => createUser({ name }),
    onDelete: (id) => deleteUser(id),
  });

  const activitiesCard = buildEntityCard<Activity>({
    title: "Activities",
    subtitle: "Activity name to be tracked.",
    placeholder: "Activity name",
    stateSelector: getActivitiesState,
    onCreate: (name) => createActivity({ name }),
    onDelete: (id) => deleteActivity(id),
  });

  grid.append(usersCard.element, activitiesCard.element);

  const unsubscribe = subscribe(["users", "activities"], () => {
    usersCard.refresh();
    activitiesCard.refresh();
  });

  void loadUsers();
  void loadActivities();

  usersCard.refresh();
  activitiesCard.refresh();

  return () => {
    unsubscribe();
    usersCard.cleanup();
    activitiesCard.cleanup();
  };
}

interface EntityCardOptions<T> {
  title: string;
  subtitle: string;
  placeholder: string;
  stateSelector: () => { data: T[]; isLoading: boolean; error: string | null };
  onCreate: (name: string) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}

function buildEntityCard<T extends { id: number; name: string }>(
  options: EntityCardOptions<T>,
) {
  const section = createCard();
  const header = el("div", { className: "flex flex-col gap-1.5" }, [
    el("h3", {
      className: "text-lg font-semibold",
      textContent: options.title,
    }),
    el("p", { className: "text-muted text-sm", textContent: options.subtitle }),
  ]);

  const form = document.createElement("form");
  form.className = "flex gap-2 mb-2.5";
  form.autocomplete = "off";

  const input = document.createElement("input");
  input.type = "text";
  input.placeholder = options.placeholder;
  input.className = "flex-1 px-2.5 py-2 border border-ring rounded-lg";

  const submitButton = createButton("Add", "primary", { type: "submit" });

  form.append(input, submitButton);

  const feedback = el("p", { className: "status-message" });
  const listContainer = el("div");

  section.append(
    header,
    form,
    feedback,
    el("div", { className: "h-px bg-ring -mt-1 -mx-6" }),
    listContainer,
  );

  let isSubmitting = false;
  const deletingIds = new Set<number>();

  const handleSubmit = async (event: Event) => {
    event.preventDefault();
    if (isSubmitting) return;
    const trimmed = input.value.trim();
    if (!trimmed) return;
    isSubmitting = true;
    submitButton.disabled = true;
    input.disabled = true;
    showMessage(feedback, null, "success");
    try {
      await options.onCreate(trimmed);
      input.value = "";
      showMessage(feedback, "Created successfully.", "success");
    } catch (error) {
      showMessage(feedback, (error as Error).message, "error");
    } finally {
      isSubmitting = false;
      submitButton.disabled = false;
      input.disabled = false;
    }
  };

  form.addEventListener("submit", handleSubmit);

  const renderListItems = () => {
    const state = options.stateSelector();
    if (state.isLoading) {
      setChildren(listContainer, [el("div", { className: "skeleton" })]);
      return;
    }
    if (state.error) {
      setChildren(listContainer, [
        el("p", {
          className: "status-message status-error",
          textContent: state.error,
        }),
      ]);
      return;
    }
    renderList(listContainer, state.data, (item) => {
      const row = el("div", { className: "flex justify-between py-1.5" });
      const name = el("span", { textContent: item.name });
      const deleteBtn = createButton("Delete", "danger");
      deleteBtn.disabled = deletingIds.has(item.id);
      deleteBtn.addEventListener("click", async () => {
        if (deletingIds.has(item.id)) return;
        deletingIds.add(item.id);
        deleteBtn.disabled = true;
        showMessage(feedback, null, "success");
        try {
          await options.onDelete(item.id);
          showMessage(feedback, "Deleted.", "success");
        } catch (error) {
          showMessage(feedback, (error as Error).message, "error");
        } finally {
          deletingIds.delete(item.id);
          deleteBtn.disabled = false;
        }
      });
      row.append(name, deleteBtn);
      return row;
    });
  };

  return {
    element: section,
    refresh: renderListItems,
    cleanup: () => {
      form.removeEventListener("submit", handleSubmit);
    },
  };
}
