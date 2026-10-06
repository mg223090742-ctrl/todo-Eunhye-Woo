const form = document.getElementById('todo-form');
const input = document.getElementById('todo-input');
const list = document.getElementById('todo-list');
const emptyMessage = document.getElementById('empty-message');

// 할 일 목록 (새로고침하면 초기화됨)
let todos = [];
let nextId = 1;

// 한글 조합 중에 누른 Enter는 무시해서 두 번 추가되지 않게 한다
input.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && event.isComposing) {
    event.preventDefault();
  }
});

form.addEventListener('submit', (event) => {
  event.preventDefault(); // 폼 제출 시 페이지가 새로고침되는 것을 막는다

  const text = input.value.trim();
  if (text === '') return;

  todos.push({ id: nextId++, text, done: false });
  input.value = '';
  render();
});

function toggleTodo(id) {
  const todo = todos.find((t) => t.id === id);
  todo.done = !todo.done;
  render();
}

function deleteTodo(id) {
  todos = todos.filter((t) => t.id !== id);
  render();
}

// todos 배열 내용대로 화면을 다시 그린다
function render() {
  list.innerHTML = '';

  for (const todo of todos) {
    const item = document.createElement('li');
    item.className = todo.done ? 'todo-item done' : 'todo-item';

    const label = document.createElement('label');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = todo.done;
    checkbox.addEventListener('change', () => toggleTodo(todo.id));

    const text = document.createElement('span');
    text.textContent = todo.text;

    label.append(checkbox, text);

    const deleteButton = document.createElement('button');
    deleteButton.className = 'delete-button';
    deleteButton.textContent = '삭제';
    deleteButton.addEventListener('click', () => deleteTodo(todo.id));

    item.append(label, deleteButton);
    list.append(item);
  }

  emptyMessage.hidden = todos.length > 0;
}

render();
