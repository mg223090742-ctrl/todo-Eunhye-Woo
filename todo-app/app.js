const form = document.getElementById('todo-form');
const input = document.getElementById('todo-input');
const list = document.getElementById('todo-list');
const emptyMessage = document.getElementById('empty-message');
const errorMessage = document.getElementById('error-message');

// Supabase 접속 (주소와 열쇠는 config.js에 있다)
const db = supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

// 화면에 보여 줄 할 일 목록 (Supabase todos 표에서 불러온다)
let todos = [];

// 오류가 나면 화면에 빨간 상자로 보여 준다
function showError(message, error) {
  errorMessage.textContent = `${message}: ${error.message}`;
  errorMessage.hidden = false;
}

function clearError() {
  errorMessage.hidden = true;
}

// 한글 조합 중에 누른 Enter는 무시해서 두 번 추가되지 않게 한다
input.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && event.isComposing) {
    event.preventDefault();
  }
});

form.addEventListener('submit', async (event) => {
  event.preventDefault(); // 폼 제출 시 페이지가 새로고침되는 것을 막는다

  const text = input.value.trim();
  if (text === '') return;

  // 표에 한 줄 넣고, Supabase가 붙여 준 id까지 포함된 결과를 돌려받는다
  const { data, error } = await db
    .from('todos')
    .insert({ text })
    .select('id, text, done')
    .single();

  if (error) {
    showError('할 일을 추가하지 못했어요', error);
    return; // 실패하면 입력한 글자를 지우지 않고 그대로 둔다
  }

  clearError();
  todos.push(data);
  input.value = '';
  render();
});

async function toggleTodo(id) {
  const todo = todos.find((t) => t.id === id);

  const { error } = await db
    .from('todos')
    .update({ done: !todo.done })
    .eq('id', id);

  if (error) {
    showError('완료 상태를 바꾸지 못했어요', error);
    render(); // 체크박스를 원래 상태로 되돌린다
    return;
  }

  clearError();
  todo.done = !todo.done;
  render();
}

async function deleteTodo(id) {
  const { error } = await db
    .from('todos')
    .delete()
    .eq('id', id);

  if (error) {
    showError('할 일을 삭제하지 못했어요', error);
    return;
  }

  clearError();
  todos = todos.filter((t) => t.id !== id);
  render();
}

// 처음 화면을 열 때 표에 저장된 할 일을 추가한 순서대로 불러온다
async function loadTodos() {
  const { data, error } = await db
    .from('todos')
    .select('id, text, done')
    .order('id');

  if (error) {
    showError('할 일 목록을 불러오지 못했어요', error);
    return;
  }

  clearError();
  todos = data;
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

loadTodos();
