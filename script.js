(() => {
  "use strict";

  const STORAGE_KEY = "todo2.todos.v1";

  const form = document.getElementById("todo-form");
  const input = document.getElementById("todo-input");
  const listEl = document.getElementById("todo-list");
  const searchEl = document.getElementById("search-input");
  const clearCompletedBtn = document.getElementById("clear-completed");
  const emptyStateEl = document.getElementById("empty-state");
  const countPillEl = document.getElementById("count-pill");
  const remainingPillEl = document.getElementById("remaining-pill");

  let activeFilter = "all";

  let todos = loadTodos();

  function isTodoArray(v) {
    return (
      Array.isArray(v) &&
      v.every(
        (t) =>
          t &&
          typeof t === "object" &&
          typeof t.id === "string" &&
          typeof t.text === "string" &&
          typeof t.completed === "boolean" &&
          typeof t.createdAt === "number" &&
          typeof t.updatedAt === "number",
      )
    );
  }

  function loadTodos() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!isTodoArray(parsed)) return [];
      return parsed;
    } catch {
      return [];
    }
  }

  function saveTodos() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
  }

  function normalize(text) {
    return text.trim().replace(/\s+/g, " ");
  }

  function makeId() {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }

  function formatTime(ts) {
    try {
      const d = new Date(ts);
      return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
    } catch {
      return "";
    }
  }

  function setFilter(value) {
    if (value === "all" || value === "active" || value === "completed") {
      activeFilter = value;
    } else {
      activeFilter = "all";
    }

    document.querySelectorAll("[data-filter]").forEach((btn) => {
      const v = btn.getAttribute("data-filter");
      btn.setAttribute("aria-pressed", String(v === activeFilter));
    });

    render();
  }

  function filterTodos(query) {
    const q = normalize(query).toLowerCase();
    let items = todos.slice();

    if (activeFilter === "active") items = items.filter((t) => !t.completed);
    if (activeFilter === "completed") items = items.filter((t) => t.completed);
    if (q) items = items.filter((t) => t.text.toLowerCase().includes(q));

    items.sort((a, b) => b.createdAt - a.createdAt);
    return items;
  }

  function updateStats() {
    const total = todos.length;
    const remaining = todos.filter((t) => !t.completed).length;
    countPillEl.textContent = `${total} item${total === 1 ? "" : "s"}`;
    remainingPillEl.textContent = `${remaining} left`;
    clearCompletedBtn.disabled = todos.every((t) => !t.completed);
  }

  function toggleTodo(todoId) {
    const t = todos.find((x) => x.id === todoId);
    if (!t) return;
    t.completed = !t.completed;
    t.updatedAt = Date.now();
    saveTodos();
    render();
  }

  function deleteTodo(todoId) {
    todos = todos.filter((t) => t.id !== todoId);
    saveTodos();
    render();
  }

  function beginEdit(todoId) {
    const item = listEl.querySelector(`[data-id="${CSS.escape(todoId)}"]`);
    if (!item) return;

    const textEl = item.querySelector("[data-role='text']");
    const actionsEl = item.querySelector("[data-role='actions']");
    if (!textEl || !actionsEl) return;

    const current = String(textEl.textContent || "");
    const inputEl = document.createElement("input");
    inputEl.type = "text";
    inputEl.className = "edit-input";
    inputEl.value = current;
    inputEl.maxLength = 160;
    inputEl.setAttribute("aria-label", "Edit task");

    const saveBtn = document.createElement("button");
    saveBtn.type = "button";
    saveBtn.className = "btn primary";
    saveBtn.textContent = "Save";

    const cancelBtn = document.createElement("button");
    cancelBtn.type = "button";
    cancelBtn.className = "btn";
    cancelBtn.textContent = "Cancel";

    const originalActions = actionsEl.innerHTML;
    const originalText = textEl.textContent;

    textEl.textContent = "";
    textEl.appendChild(inputEl);
    actionsEl.innerHTML = "";
    actionsEl.appendChild(saveBtn);
    actionsEl.appendChild(cancelBtn);

    const restore = () => {
      textEl.textContent = originalText || "";
      actionsEl.innerHTML = originalActions;
    };

    const commit = () => {
      const next = normalize(inputEl.value);
      if (!next) return;
      const t = todos.find((x) => x.id === todoId);
      if (!t) return;
      t.text = next;
      t.updatedAt = Date.now();
      saveTodos();
      render({ focusId: todoId });
    };

    saveBtn.addEventListener("click", commit);
    cancelBtn.addEventListener("click", restore);

    inputEl.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        commit();
      }
      if (e.key === "Escape") {
        e.preventDefault();
        restore();
      }
    });

    inputEl.addEventListener("blur", () => {
      const next = normalize(inputEl.value);
      if (!next) {
        restore();
        return;
      }
      commit();
    });

    queueMicrotask(() => {
      inputEl.focus();
      inputEl.select();
    });
  }

  function clearCompleted() {
    todos = todos.filter((t) => !t.completed);
    saveTodos();
    render();
  }

  function render(opts = {}) {
    updateStats();

    const items = filterTodos(searchEl.value);

    listEl.innerHTML = "";
    for (const t of items) {
      const li = document.createElement("li");
      li.className = `item${t.completed ? " completed" : ""}`;
      li.dataset.id = t.id;

      const check = document.createElement("input");
      check.type = "checkbox";
      check.className = "check";
      check.checked = t.completed;
      check.setAttribute("aria-label", t.completed ? "Mark as active" : "Mark as completed");
      check.addEventListener("change", () => toggleTodo(t.id));

      const content = document.createElement("div");
      content.className = "content";

      const titleRow = document.createElement("div");
      titleRow.className = "title-row";

      const text = document.createElement("div");
      text.className = "text";
      text.dataset.role = "text";
      text.textContent = t.text;

      const actions = document.createElement("div");
      actions.className = "actions";
      actions.dataset.role = "actions";

      const editBtn = document.createElement("button");
      editBtn.type = "button";
      editBtn.className = "btn";
      editBtn.textContent = "Edit";
      editBtn.addEventListener("click", () => beginEdit(t.id));

      const delBtn = document.createElement("button");
      delBtn.type = "button";
      delBtn.className = "btn danger";
      delBtn.textContent = "Delete";
      delBtn.addEventListener("click", () => deleteTodo(t.id));

      actions.appendChild(editBtn);
      actions.appendChild(delBtn);

      titleRow.appendChild(text);
      titleRow.appendChild(actions);

      const meta = document.createElement("div");
      meta.className = "meta";
      meta.textContent = `Created ${formatTime(t.createdAt)}${t.updatedAt !== t.createdAt ? ` • Updated ${formatTime(t.updatedAt)}` : ""}`;

      content.appendChild(titleRow);
      content.appendChild(meta);

      li.appendChild(check);
      li.appendChild(content);
      listEl.appendChild(li);
    }

    const isEmpty = items.length === 0;
    emptyStateEl.hidden = !isEmpty;

    if (opts.focusId) {
      const focusItem = listEl.querySelector(`[data-id="${CSS.escape(opts.focusId)}"] button`);
      if (focusItem) focusItem.focus();
    }
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = normalize(input.value);
    if (!text) return;

    todos.unshift({
      id: makeId(),
      text,
      completed: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    input.value = "";
    saveTodos();
    render();
    input.focus();
  });

  document.querySelectorAll("[data-filter]").forEach((btn) => {
    btn.addEventListener("click", () => {
      setFilter(String(btn.getAttribute("data-filter") || "all"));
    });
  });

  searchEl.addEventListener("input", () => render());
  clearCompletedBtn.addEventListener("click", clearCompleted);

  render();
})();
