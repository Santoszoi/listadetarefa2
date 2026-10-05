'use strict';
const STORAGE_KEY = 'marcos-tasks-v1';
const input = document.querySelector('#taskInput');
const list = document.querySelector('#taskList');
const feedback = document.querySelector('#feedback');
const warning = document.querySelector('#storageWarning');
let tasks = [];
let filter = 'all';
let editingId = null;
let deleted = null;
let storageReadable = true;

// Do not overwrite unreadable data: preserve it for recovery.
try {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw !== null) {
    const data = JSON.parse(raw);
    if (!Array.isArray(data) || data.some(t => !t || typeof t.id !== 'string' || typeof t.text !== 'string' || !t.text.trim() || t.text.length > 160 || typeof t.done !== 'boolean') || new Set(data.map(t => t.id)).size !== data.length) throw new Error('Invalid data');
    tasks = data;
  }
} catch {
  storageReadable = false;
  warning.hidden = false;
  warning.textContent = 'Não foi possível ler os dados salvos. Nada foi substituído. Verifique as permissões de armazenamento do navegador.';
}

function save(next) {
  if (!storageReadable) return false;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    tasks = next;
    warning.hidden = true;
    return true;
  } catch {
    warning.hidden = false;
    warning.textContent = 'Não foi possível salvar. A alteração não foi aplicada. Verifique o espaço e as permissões do navegador.';
    return false;
  }
}
function finishEditing() {
  editingId = null;
  input.value = '';
  document.querySelector('#submitTask').textContent = 'Adicionar tarefa';
  document.querySelector('#cancelEdit').hidden = true;
}
function button(text, action, name) {
  const el = document.createElement('button');
  el.type = 'button';
  el.textContent = text;
  el.setAttribute('aria-label', name);
  el.addEventListener('click', action);
  return el;
}
function render() {
  list.replaceChildren();
  const visible = tasks.filter(t => filter === 'all' || (filter === 'done' ? t.done : !t.done));
  for (const task of visible) {
    const row = document.createElement('li');
    row.classList.toggle('completed', task.done);
    const check = document.createElement('input');
    check.type = 'checkbox';check.checked = task.done;
    check.setAttribute('aria-label', `Concluir: ${task.text}`);
    check.addEventListener('change', () => {
      if (save(tasks.map(t => t.id === task.id ? {...t, done: check.checked} : t))) {
        feedback.textContent = check.checked ? 'Tarefa concluída.' : 'Tarefa reaberta.';
      }
      render();input.focus();
    });
    const text = document.createElement('span');
    text.className = 'task-text';
    // User input is text, never markup, including content restored from storage.
    text.textContent = task.text;
    const actions = document.createElement('div');actions.className = 'actions';
    const edit = button('Editar', () => {
      editingId = task.id;input.value = task.text;
      document.querySelector('#submitTask').textContent = 'Salvar alteração';
      document.querySelector('#cancelEdit').hidden = false;
      input.focus();feedback.textContent = 'Edite a tarefa no campo acima.';
    }, `Editar: ${task.text}`);
    const remove = button('Excluir', () => {
      const index = tasks.findIndex(t => t.id === task.id);
      if (!save(tasks.filter(t => t.id !== task.id))) return;
      deleted = {task, index};
      if (editingId === task.id) finishEditing();
      feedback.textContent = 'Tarefa excluída. Você pode desfazer.';
      render();document.querySelector('#undoDelete').focus();
    }, `Excluir: ${task.text}`);
    remove.className = 'remove';actions.append(edit, remove);row.append(check, text, actions);list.append(row);
  }
  const pending = tasks.filter(t => !t.done).length;
  document.querySelector('#count').textContent = `${pending} ${pending === 1 ? 'pendente' : 'pendentes'}`;
  const empty = document.querySelector('#empty');empty.hidden = visible.length > 0;
  empty.textContent = tasks.length ? 'Nenhuma tarefa neste filtro.' : 'Sua lista está livre. Adicione sua primeira tarefa acima.';
  document.querySelector('#undoDelete').hidden = !deleted;
  document.querySelectorAll('[data-filter]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.filter === filter)));
}
document.querySelector('#taskForm').addEventListener('submit', event => {
  event.preventDefault();
  const text = input.value.trim();
  if (!text || text.length > 160) {feedback.textContent = 'Digite uma tarefa de 1 a 160 caracteres.';input.focus();return;}
  const isEditing = editingId !== null;
  const next = isEditing ? tasks.map(t => t.id === editingId ? {...t, text} : t) : [...tasks, {id:crypto.randomUUID(), text, done:false}];
  if (!save(next)) return;
  finishEditing();filter = 'all';render();input.focus();
  feedback.textContent = isEditing ? 'Tarefa atualizada.' : 'Tarefa adicionada e salva.';
});
document.querySelector('#cancelEdit').addEventListener('click', () => {finishEditing();input.focus();feedback.textContent = 'Edição cancelada.';});
input.addEventListener('keydown', event => {if (event.key === 'Escape' && editingId !== null) {finishEditing();input.focus();feedback.textContent = 'Edição cancelada.';}});
document.querySelectorAll('[data-filter]').forEach(b => b.addEventListener('click', () => {filter = b.dataset.filter;render();}));
document.querySelector('#undoDelete').addEventListener('click', () => {
  if (!deleted) return;
  const next = [...tasks];next.splice(deleted.index, 0, deleted.task);
  if (!save(next)) return;
  deleted = null;filter = 'all';render();input.focus();feedback.textContent = 'Tarefa restaurada.';
});
render();
