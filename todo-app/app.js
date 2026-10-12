const form = document.getElementById('todo-form');
const input = document.getElementById('todo-input');
const authorInput = document.getElementById('author-input');
const dueInput = document.getElementById('due-input');
const list = document.getElementById('todo-list');
const emptyMessage = document.getElementById('empty-message');
const remainingCount = document.getElementById('remaining-count');
const filterButtons = document.querySelectorAll('.filter-button');
const errorMessage = document.getElementById('error-message');

// Supabase 접속 (주소와 열쇠는 config.js에 있다)
const db = supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

// 화면에 보여 줄 할 일 목록 (Supabase todos 표에서 불러온다)
let todos = [];

// 지금 골라 보는 목록: 'all'(전체), 'active'(진행중), 'done'(완료)
let currentFilter = 'all';

// 목록이 비었을 때 고른 버튼에 맞춰 보여 줄 안내 문구
const emptyMessages = {
  all: '할 일이 없습니다 🎉',
  active: '진행 중인 할 일이 없어요 🎉',
  done: '아직 완료한 할 일이 없어요',
};

// 전체/진행중/완료 버튼을 누르면 그 목록만 보여 준다
for (const button of filterButtons) {
  button.addEventListener('click', () => {
    currentFilter = button.dataset.filter;
    for (const b of filterButtons) {
      b.setAttribute('aria-pressed', String(b === button));
    }
    render();
  });
}

// 고른 버튼에 맞는 할 일인지 확인한다
function matchesFilter(todo) {
  if (currentFilter === 'active') return !todo.done;
  if (currentFilter === 'done') return todo.done;
  return true;
}

// 오류가 나면 화면에 빨간 상자로 보여 준다
function showError(message, error) {
  errorMessage.textContent = `${message}: ${error.message}`;
  errorMessage.hidden = false;
}

function clearError() {
  errorMessage.hidden = true;
}

// 한글 조합 중에 누른 Enter는 무시해서 두 번 추가되지 않게 한다 (이름 칸, 할 일 칸 모두)
for (const field of [authorInput, input]) {
  field.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && event.isComposing) {
      event.preventDefault();
    }
  });
}

form.addEventListener('submit', async (event) => {
  event.preventDefault(); // 폼 제출 시 페이지가 새로고침되는 것을 막는다

  const text = input.value.trim();
  if (text === '') return;

  // 이름은 안 적어도 된다. 비어 있으면 '이름 없음(null)'으로 저장한다
  const author = authorInput.value.trim() || null;

  // 마감일도 안 적어도 된다. 날짜 칸 값은 '2026-10-15' 같은 글자다
  const due_date = dueInput.value || null;

  // 표에 한 줄 넣고, Supabase가 붙여 준 id까지 포함된 결과를 돌려받는다
  const { data, error } = await db
    .from('todos')
    .insert({ text, author, due_date })
    .select('id, text, done, author, due_date')
    .single();

  if (error) {
    showError('할 일을 추가하지 못했어요', error);
    return; // 실패하면 입력한 글자를 지우지 않고 그대로 둔다
  }

  clearError();
  todos.push(data);
  input.value = ''; // 이름은 다음 할 일에도 쓰도록 남겨 둔다
  dueInput.value = '';
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

async function updateTodoText(id, text) {
  const { error } = await db
    .from('todos')
    .update({ text })
    .eq('id', id);

  if (error) {
    showError('할 일을 고치지 못했어요', error);
    return false;
  }

  clearError();
  const todo = todos.find((t) => t.id === id);
  todo.text = text;
  return true;
}

// 할 일 글자를 입력칸으로 바꿔서 고칠 수 있게 한다
// Enter는 저장, Esc는 취소, 다른 곳을 누르면 저장하지 않고 취소한다
function startEditing(todo, textElement) {
  const editInput = document.createElement('input');
  editInput.type = 'text';
  editInput.className = 'edit-input';
  editInput.value = todo.text;
  textElement.replaceWith(editInput);
  editInput.focus();
  editInput.select();

  // 저장이나 취소가 이미 시작됐는지 표시한다 (Enter 뒤에 blur가 또 처리되지 않게)
  let finished = false;

  editInput.addEventListener('keydown', async (event) => {
    // 한글 조합 중에 누른 Enter/Esc는 글자 조합에만 쓰이게 무시한다
    if (event.isComposing || finished) return;

    if (event.key === 'Escape') {
      finished = true;
      render(); // 원래 글자로 되돌린다
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const newText = editInput.value.trim();

      // 비웠거나 그대로면 저장할 필요 없이 원래대로 돌아간다
      if (newText === '' || newText === todo.text) {
        finished = true;
        render();
        return;
      }

      finished = true;
      const saved = await updateTodoText(todo.id, newText);
      if (saved) {
        render();
      } else {
        finished = false; // 실패하면 입력칸을 그대로 두어 다시 시도할 수 있게 한다
        editInput.focus();
      }
    }
  });

  editInput.addEventListener('blur', () => {
    if (finished) return;
    finished = true;
    render();
  });
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
    .select('id, text, done, author, due_date')
    .order('id');

  if (error) {
    showError('할 일 목록을 불러오지 못했어요', error);
    return;
  }

  clearError();
  todos = data;
  render();
}

// 오늘 날짜를 '2026-10-12' 같은 글자로 만든다 (마감일과 같은 모양이라 바로 비교할 수 있다)
function todayString() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

// '2026-10-15' → '10월 15일'
function formatDueDate(dueDate) {
  const [, month, day] = dueDate.split('-');
  return `${Number(month)}월 ${Number(day)}일`;
}

// 마감이 가까운 순서로 정렬한다. 마감일이 없으면 맨 아래, 같으면 추가한 순서대로
function compareTodos(a, b) {
  if (a.due_date !== b.due_date) {
    if (a.due_date === null) return 1;
    if (b.due_date === null) return -1;
    return a.due_date < b.due_date ? -1 : 1;
  }
  return a.id - b.id;
}

// todos 배열 내용대로 화면을 다시 그린다
function render() {
  list.innerHTML = '';
  const today = todayString();

  const visibleTodos = todos.filter(matchesFilter).sort(compareTodos);

  for (const todo of visibleTodos) {
    const item = document.createElement('li');
    item.className = todo.done ? 'todo-item done' : 'todo-item';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = todo.done;
    checkbox.addEventListener('change', () => toggleTodo(todo.id));

    // 글자를 두 번 누르면 고칠 수 있다
    // (글자를 체크박스와 따로 두어서, 두 번 누를 때 체크가 같이 바뀌지 않게 한다)
    const text = document.createElement('span');
    text.className = 'todo-text';
    text.textContent = todo.text;
    text.title = '두 번 누르면 고칠 수 있어요';
    text.addEventListener('dblclick', () => startEditing(todo, text));

    item.append(checkbox, text);

    // 작성자 이름이 있을 때만 꼬리표를 붙인다
    if (todo.author) {
      const authorTag = document.createElement('span');
      authorTag.className = 'author-tag';
      authorTag.textContent = todo.author;
      item.append(authorTag);
    }

    // 마감일이 있을 때만 보여 준다. 끝내지 못했는데 마감이 지났으면 빨갛게 표시한다
    if (todo.due_date) {
      const dueTag = document.createElement('span');
      dueTag.className = 'due-tag';
      if (!todo.done && todo.due_date < today) {
        dueTag.classList.add('overdue');
      }
      dueTag.textContent = `${formatDueDate(todo.due_date)}까지`;
      item.append(dueTag);
    }

    const deleteButton = document.createElement('button');
    deleteButton.className = 'delete-button';
    deleteButton.textContent = '삭제';
    deleteButton.addEventListener('click', () => deleteTodo(todo.id));

    item.append(deleteButton);
    list.append(item);
  }

  emptyMessage.textContent = emptyMessages[currentFilter];
  emptyMessage.hidden = visibleTodos.length > 0;

  // 남은 할 일 개수는 어떤 버튼을 골랐든 끝내지 않은 할 일을 센다
  const remaining = todos.filter((t) => !t.done).length;
  remainingCount.textContent = `남은 할 일 ${remaining}개`;
}

loadTodos();
