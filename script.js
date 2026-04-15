/*!
 * Our Little World — script.js  v2.0
 * All event listeners in JS (no inline onclick)
 * Full CRUD, gallery upload, comments, timer, messages, notes
 */

/* ── Constants ── */
const PASSWORD = 'shurenbuguiwch';

const QUOTES = [
  'Хайр гэдэг бол нэг нь нөгөөгийнхөө сэтгэлд байнга хэрэгтэй байх явдал.',
  'Чамтай хамт байхад л дэлхий дэлхий мэт санагддаг.',
  'Хамгийн сайхан дурсамж бол чамтай хамт бүтээсэн мөчүүд.',
  'Нэг алхам тутам чамтай хамт явахыг хүсдэг.',
  'Чиний инээмсэглэл миний өдрийг гэрэлтүүлдэг.',
  'Хайрлах нь ойлгох, тэвчих, хамт байх явдал.',
  'Чамаас зайлшгүй хэрэгтэй зүйл гэж байхгүй — зөвхөн чи.',
  'Хоёр зүрх нэг хэм цохилвол — энэ бол хайр.',
  'Найдвар, хайр, итгэл — бидний хоёрын дэлхий.',
  'Хамтдаа мөрөөдвөл бүх зүйл боломжтой.',
  'Чиний хажууд байхад цаг хурдан өнгөрдөг.',
  'Хайр нь үг биш — үйлдэл юм.',
];

const PAGE_TITLES = {
  home: 'Нүүр', planner: 'Хуанли',
  assignments: 'Даалгавар', gallery: 'Дурсамж', couple: 'Бидний хоёр',
};

/* ── State ── */
let calYear, calMonth, selectedDate;
let activeMemId = null;
let timerInterval = null;
let quoteIndex = -1;

/* ══════════════════════════════════════
   STORAGE
══════════════════════════════════════ */
const DB = {
  get(key) {
    try { return JSON.parse(localStorage.getItem('olw_' + key) || '[]'); }
    catch { return []; }
  },
  set(key, val) {
    try { localStorage.setItem('olw_' + key, JSON.stringify(val)); }
    catch { toast('Хадгалах зай хүрэлцэхгүй байна!', 'err'); }
  },
  getItem(key)      { return localStorage.getItem('olw_' + key); },
  setItem(key, val) { localStorage.setItem('olw_' + key, val); },
};

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

/* ══════════════════════════════════════
   DATE HELPERS
══════════════════════════════════════ */
function toDateStr(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function toMN(str) {
  if (!str) return '';
  const [y, m, d] = str.split('-');
  return `${y} оны ${+m} сарын ${+d}`;
}

function toDateTime(ts) {
  const d = new Date(ts);
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/* ══════════════════════════════════════
   XSS ESCAPE
══════════════════════════════════════ */
function esc(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* ══════════════════════════════════════
   TOAST
══════════════════════════════════════ */
let toastTimer;
function toast(msg, type = 'ok') {
  const el = document.getElementById('toast');
  clearTimeout(toastTimer);
  el.textContent = msg;
  el.className = `toast visible ${type}`;
  toastTimer = setTimeout(() => { el.className = 'toast'; }, 2800);
}

/* ══════════════════════════════════════
   MODAL
══════════════════════════════════════ */
function openModal(id) {
  const el = document.getElementById(id);
  if (el) { el.classList.add('open'); el.querySelector('.modal')?.focus(); }
}
function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('open');
}

/* ══════════════════════════════════════
   AUTH
══════════════════════════════════════ */
function tryLogin() {
  const input = document.getElementById('pwInput');
  const errEl = document.getElementById('loginErr');
  const val = input.value.trim();

  if (val === PASSWORD) {
    DB.setItem('auth', '1');
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('app').style.display = 'flex';
    bootApp();
  } else {
    errEl.textContent = '❌ Нууц үг буруу байна. Дахин оролдоно уу.';
    input.value = '';
    input.focus();
    // trigger shake
    errEl.classList.remove('shake');
    void errEl.offsetWidth; // reflow
    errEl.classList.add('shake');
  }
}

function logout() {
  if (!confirm('Гарах уу?')) return;
  DB.setItem('auth', '');
  clearInterval(timerInterval);
  location.reload();
}

/* ══════════════════════════════════════
   NAVIGATION
══════════════════════════════════════ */
function goTo(page) {
  if (!PAGE_TITLES[page]) return;

  // pages
  document.querySelectorAll('.page').forEach(p => {
    p.classList.toggle('active', p.id === 'page-' + page);
  });
  // nav buttons
  document.querySelectorAll('.nav-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.page === page);
  });
  // topbar title
  const tb = document.getElementById('topbarTitle');
  if (tb) tb.textContent = PAGE_TITLES[page];

  // close mobile sidebar
  closeSidebar();

  // page-specific updates
  if (page === 'home') updateStats();
  if (page === 'couple') {
    updateAnniversary();
    startLiveTimer();
  }
  if (page === 'planner') renderCalendar();
}

function openSidebar() {
  document.getElementById('sidebar').classList.add('open');
  document.getElementById('sidebarOverlay').classList.add('open');
}
function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarOverlay').classList.remove('open');
}

/* ══════════════════════════════════════
   BOOT
══════════════════════════════════════ */
function bootApp() {
  const now = new Date();
  calYear = now.getFullYear();
  calMonth = now.getMonth();
  selectedDate = toDateStr(now);

  // Navigation clicks
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => goTo(btn.dataset.page));
  });
  document.querySelectorAll('.card-link-btn').forEach(btn => {
    btn.addEventListener('click', () => goTo(btn.dataset.page));
  });

  // Mobile burger
  document.getElementById('burgerBtn').addEventListener('click', () => {
    document.getElementById('sidebar').classList.contains('open')
      ? closeSidebar() : openSidebar();
  });
  document.getElementById('sidebarOverlay').addEventListener('click', closeSidebar);

  // Logout
  document.getElementById('logoutBtn').addEventListener('click', logout);

  // Modal close buttons (data-close attribute)
  document.querySelectorAll('[data-close]').forEach(btn => {
    btn.addEventListener('click', () => closeModal(btn.dataset.close));
  });
  // Close modal on overlay click
  document.querySelectorAll('.modal-wrap').forEach(wrap => {
    wrap.addEventListener('click', e => {
      if (e.target === wrap) closeModal(wrap.id);
    });
  });

  // Quote
  document.getElementById('newQuoteBtn').addEventListener('click', showQuote);

  // ── Planner ──
  document.getElementById('addTaskBtn').addEventListener('click', () => openTaskModal(null));
  document.getElementById('saveTaskBtn').addEventListener('click', saveTask);
  document.getElementById('calPrev').addEventListener('click', () => { calMonth--; if (calMonth < 0) { calMonth = 11; calYear--; } renderCalendar(); });
  document.getElementById('calNext').addEventListener('click', () => { calMonth++; if (calMonth > 11) { calMonth = 0; calYear++; } renderCalendar(); });

  // ── Assignments ──
  document.getElementById('addAssignBtn').addEventListener('click', () => openAssignModal(null));
  document.getElementById('saveAssignBtn').addEventListener('click', saveAssignment);
  document.getElementById('filterSubject').addEventListener('change', renderAssignments);
  document.getElementById('filterStatus').addEventListener('change', renderAssignments);
  document.getElementById('filterPriority').addEventListener('change', renderAssignments);

  // ── Gallery ──
  document.getElementById('addMemBtn').addEventListener('click', openMemModal);
  document.getElementById('saveMemBtn').addEventListener('click', saveMemory);
  document.getElementById('memFileInput').addEventListener('change', onFileChange);
  // Drag-drop on upload zone
  const zone = document.getElementById('uploadZone');
  zone.addEventListener('dragover', e => { e.preventDefault(); zone.style.borderColor = 'var(--rose-400)'; });
  zone.addEventListener('dragleave', () => { zone.style.borderColor = ''; });
  zone.addEventListener('drop', e => {
    e.preventDefault(); zone.style.borderColor = '';
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      const dt = new DataTransfer();
      dt.items.add(file);
      document.getElementById('memFileInput').files = dt.files;
      previewFile(file);
    }
  });

  // ── Preview modal ──
  document.getElementById('addCommentBtn').addEventListener('click', addComment);
  document.getElementById('commentText').addEventListener('keydown', e => { if (e.key === 'Enter') addComment(); });
  document.getElementById('deleteMemBtn').addEventListener('click', () => {
    if (activeMemId) deleteMemory(activeMemId);
  });

  // ── Couple ──
  document.getElementById('saveDateBtn').addEventListener('click', saveStartDate);
  document.getElementById('sendMsgBtn').addEventListener('click', sendMessage);
  document.getElementById('msgText').addEventListener('keydown', e => {
    if (e.key === 'Enter' && e.ctrlKey) sendMessage();
  });
  document.getElementById('addNoteBtn').addEventListener('click', addNote);
  document.getElementById('noteInput').addEventListener('keydown', e => { if (e.key === 'Enter') addNote(); });

  // Restore start date input
  const sd = DB.getItem('startDate');
  if (sd) document.getElementById('startDateInput').value = sd;

  // Initial renders
  showQuote();
  renderCalendar();
  renderAssignments();
  renderGallery();
  renderMessages();
  renderNotes();
  updateStats();
  updateAnniversary();
  startLiveTimer();
}

/* ══════════════════════════════════════
   QUOTES
══════════════════════════════════════ */
function showQuote() {
  let idx;
  do { idx = Math.floor(Math.random() * QUOTES.length); } while (idx === quoteIndex && QUOTES.length > 1);
  quoteIndex = idx;
  const el = document.getElementById('quoteText');
  el.style.opacity = '0';
  setTimeout(() => {
    el.textContent = QUOTES[idx];
    el.style.transition = 'opacity .45s';
    el.style.opacity = '1';
  }, 180);
}

/* ══════════════════════════════════════
   STATS
══════════════════════════════════════ */
function updateStats() {
  const today = toDateStr(new Date());
  const tasks = DB.get('tasks');
  const assigns = DB.get('assignments');
  const mems = DB.get('memories');

  // counts
  set('statTasks', tasks.filter(t => t.date === today).length);
  set('statAssign', assigns.filter(a => a.status !== 'done').length);
  set('statMems', mems.length);

  // home days
  const sd = DB.getItem('startDate');
  set('homeDays', sd ? Math.floor((Date.now() - new Date(sd)) / 86400000) : '—');

  // today tasks mini
  const todayTasks = tasks.filter(t => t.date === today);
  const htEl = document.getElementById('homeTasks');
  if (todayTasks.length === 0) {
    htEl.innerHTML = '<div class="empty-state" style="padding:.8rem"><p>Өнөөдөр даалгавар алга ✨</p></div>';
  } else {
    htEl.innerHTML = todayTasks.slice(0, 4).map(t => `
      <div class="mini-item ${t.status === 'done' ? 'done' : ''}">
        <span class="mini-dot dot-${t.status === 'done' ? 'done' : 'pending'}"></span>
        <span>${esc(t.title)}</span>
      </div>`).join('');
  }

  // upcoming assigns
  const upcoming = assigns
    .filter(a => a.status !== 'done' && a.deadline >= today)
    .sort((a, b) => a.deadline.localeCompare(b.deadline))
    .slice(0, 4);
  const haEl = document.getElementById('homeAssigns');
  if (upcoming.length === 0) {
    haEl.innerHTML = '<div class="empty-state" style="padding:.8rem"><p>Дуусаагүй даалгавар алга 🎉</p></div>';
  } else {
    haEl.innerHTML = upcoming.map(a => `
      <div class="mini-item">
        <span class="mini-dot dot-${a.priority === 'high' ? 'pending' : a.priority === 'medium' ? 'progress' : 'done'}"></span>
        <span>${esc(a.subject)}: ${esc(a.title)}</span>
      </div>`).join('');
  }
}

function set(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

/* ══════════════════════════════════════
   CALENDAR
══════════════════════════════════════ */
const MONTHS_MN = ['1-р сар','2-р сар','3-р сар','4-р сар','5-р сар','6-р сар',
                   '7-р сар','8-р сар','9-р сар','10-р сар','11-р сар','12-р сар'];

function renderCalendar() {
  document.getElementById('calTitle').textContent = `${calYear} — ${MONTHS_MN[calMonth]}`;

  const taskDates = new Set(DB.get('tasks').map(t => t.date));
  const today = toDateStr(new Date());

  const firstDow = new Date(calYear, calMonth, 1).getDay(); // 0=Sun
  const offset = (firstDow + 6) % 7; // Mon=0
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const daysInPrev = new Date(calYear, calMonth, 0).getDate();

  let html = '';

  // Prev month grey days
  for (let i = 0; i < offset; i++) {
    html += `<div class="cal-day other-month"><span>${daysInPrev - offset + i + 1}</span></div>`;
  }
  // Current month
  for (let d = 1; d <= daysInMonth; d++) {
    const ds = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const cls = [
      'cal-day',
      ds === today ? 'today' : '',
      ds === selectedDate && ds !== today ? 'selected' : '',
      taskDates.has(ds) ? 'has-tasks' : '',
    ].filter(Boolean).join(' ');
    html += `<div class="${cls}" data-date="${ds}"><span>${d}</span></div>`;
  }
  // Next month fill
  const total = offset + daysInMonth;
  const remaining = total % 7 === 0 ? 0 : 7 - (total % 7);
  for (let i = 1; i <= remaining; i++) {
    html += `<div class="cal-day other-month"><span>${i}</span></div>`;
  }

  const grid = document.getElementById('calGrid');
  grid.innerHTML = html;
  grid.querySelectorAll('.cal-day[data-date]').forEach(el => {
    el.addEventListener('click', () => {
      selectedDate = el.dataset.date;
      renderCalendar(); // re-render to show selection
      renderTasks();
    });
  });

  renderTasks();
}

/* ══════════════════════════════════════
   TASKS
══════════════════════════════════════ */
function renderTasks() {
  document.getElementById('tasksHeading').textContent = `📋 ${toMN(selectedDate)} — Даалгавар`;
  const tasks = DB.get('tasks').filter(t => t.date === selectedDate);
  const el = document.getElementById('tasksList');

  if (tasks.length === 0) {
    el.innerHTML = '<div class="empty-state"><div class="e-icon">✨</div><p>Энэ өдрийн даалгавар алга</p></div>';
    return;
  }

  el.innerHTML = tasks.map(t => `
    <div class="task-row ${t.status === 'done' ? 'done' : ''}" data-id="${t.id}">
      <div class="task-check ${t.status === 'done' ? 'checked' : ''}" data-toggle="${t.id}" title="Дуусгах">
        ${t.status === 'done' ? '✓' : ''}
      </div>
      <div class="task-info">
        <div class="task-name">${esc(t.title)}</div>
        ${t.desc ? `<div class="task-desc">${esc(t.desc)}</div>` : ''}
        <div class="task-badges">
          <span class="badge badge-who">${esc(whoLbl(t.who))}</span>
          <span class="badge ${t.status === 'done' ? 'badge-done' : 'badge-pending'}">
            ${t.status === 'done' ? 'Дууссан' : 'Хүлээгдэж буй'}
          </span>
        </div>
      </div>
      <div class="task-actions">
        <button class="btn-sm" data-edit="${t.id}"><i class="fa-solid fa-pen fa-xs"></i></button>
        <button class="btn-sm del" data-del="${t.id}"><i class="fa-solid fa-trash fa-xs"></i></button>
      </div>
    </div>`).join('');

  // Attach events
  el.querySelectorAll('[data-toggle]').forEach(b =>
    b.addEventListener('click', () => toggleTask(b.dataset.toggle)));
  el.querySelectorAll('[data-edit]').forEach(b =>
    b.addEventListener('click', () => openTaskModal(b.dataset.edit)));
  el.querySelectorAll('[data-del]').forEach(b =>
    b.addEventListener('click', () => deleteTask(b.dataset.del)));
}

function openTaskModal(id) {
  const editId = document.getElementById('taskEditId');
  const title = document.getElementById('taskModalTitle');

  if (id) {
    const t = DB.get('tasks').find(x => x.id === id);
    if (!t) return;
    editId.value = t.id;
    title.textContent = 'Даалгавар засах';
    document.getElementById('taskTitle').value  = t.title;
    document.getElementById('taskDesc').value   = t.desc || '';
    document.getElementById('taskDate').value   = t.date;
    document.getElementById('taskStatus').value = t.status;
    document.getElementById('taskWho').value    = t.who || 'both';
  } else {
    editId.value = '';
    title.textContent = 'Даалгавар нэмэх';
    document.getElementById('taskTitle').value  = '';
    document.getElementById('taskDesc').value   = '';
    document.getElementById('taskDate').value   = selectedDate;
    document.getElementById('taskStatus').value = 'pending';
    document.getElementById('taskWho').value    = 'both';
  }
  openModal('taskModal');
  setTimeout(() => document.getElementById('taskTitle').focus(), 100);
}

function saveTask() {
  const title = document.getElementById('taskTitle').value.trim();
  const date  = document.getElementById('taskDate').value;
  if (!title) { toast('Гарчиг оруулна уу!', 'err'); return; }
  if (!date)  { toast('Огноо оруулна уу!', 'err'); return; }

  const tasks = DB.get('tasks');
  const id = document.getElementById('taskEditId').value;

  const task = {
    id:     id || uid(),
    title,
    desc:   document.getElementById('taskDesc').value.trim(),
    date,
    status: document.getElementById('taskStatus').value,
    who:    document.getElementById('taskWho').value,
    ts:     Date.now(),
  };

  if (id) {
    const i = tasks.findIndex(t => t.id === id);
    if (i > -1) tasks[i] = task; else tasks.push(task);
  } else {
    tasks.push(task);
  }

  DB.set('tasks', tasks);
  selectedDate = date;
  renderCalendar();
  updateStats();
  closeModal('taskModal');
  toast(id ? '✏️ Шинэчлагдлаа' : '✅ Даалгавар нэмэгдлээ');
}

function toggleTask(id) {
  const tasks = DB.get('tasks');
  const t = tasks.find(x => x.id === id);
  if (!t) return;
  t.status = t.status === 'done' ? 'pending' : 'done';
  DB.set('tasks', tasks);
  renderCalendar();
  updateStats();
}

function deleteTask(id) {
  if (!confirm('Энэ даалгаврыг устгах уу?')) return;
  DB.set('tasks', DB.get('tasks').filter(t => t.id !== id));
  renderCalendar();
  updateStats();
  toast('🗑️ Устгагдлаа');
}

/* ══════════════════════════════════════
   ASSIGNMENTS
══════════════════════════════════════ */
function renderAssignments() {
  const all = DB.get('assignments');
  const fSub  = document.getElementById('filterSubject').value;
  const fStat = document.getElementById('filterStatus').value;
  const fPrio = document.getElementById('filterPriority').value;

  // Refresh subject datalist
  const subjects = [...new Set(all.map(a => a.subject).filter(Boolean))].sort();
  const dl = document.getElementById('subjectList');
  if (dl) dl.innerHTML = subjects.map(s => `<option value="${esc(s)}"/>`).join('');

  // Refresh filter dropdown (keep current value)
  const sf = document.getElementById('filterSubject');
  const cur = sf.value;
  sf.innerHTML = '<option value="">Бүгд</option>' +
    subjects.map(s => `<option value="${esc(s)}"${s === cur ? ' selected' : ''}>${esc(s)}</option>`).join('');

  const prioOrder = { high: 0, medium: 1, low: 2 };
  const today = toDateStr(new Date());

  const filtered = all
    .filter(a =>
      (!fSub  || a.subject === fSub) &&
      (!fStat || a.status  === fStat) &&
      (!fPrio || a.priority === fPrio))
    .sort((a, b) => {
      if (a.status === 'done' && b.status !== 'done') return 1;
      if (b.status === 'done' && a.status !== 'done') return -1;
      const po = (prioOrder[a.priority] ?? 1) - (prioOrder[b.priority] ?? 1);
      if (po !== 0) return po;
      return a.deadline.localeCompare(b.deadline);
    });

  const el = document.getElementById('assignGrid');
  if (filtered.length === 0) {
    el.innerHTML = '<div class="empty-state" style="grid-column:1/-1"><div class="e-icon">📚</div><p>Даалгавар олдсонгүй</p></div>';
    return;
  }

  el.innerHTML = filtered.map(a => {
    const overdue = a.deadline < today && a.status !== 'done';
    return `
    <div class="assign-card ${a.status === 'done' ? 'done' : ''} prio-${a.priority}">
      <div class="assign-card-top">
        <span class="badge badge-subj">${esc(a.subject)}</span>
        <span class="badge badge-${a.priority}">${prioLbl(a.priority)}</span>
      </div>
      <div class="assign-title">${esc(a.title)}</div>
      ${a.desc ? `<div class="assign-desc">${esc(a.desc)}</div>` : ''}
      <div class="assign-footer">
        <div>
          <div class="assign-deadline ${overdue ? 'overdue' : ''}">
            ${overdue ? '⚠️ ' : '📅 '}${toMN(a.deadline)}
          </div>
          <div style="display:flex;gap:.35rem;flex-wrap:wrap;margin-top:.35rem">
            <span class="badge badge-${a.status === 'done' ? 'done' : a.status === 'in-progress' ? 'prog' : 'pending'}">${statusLbl(a.status)}</span>
            <span class="badge badge-who">${esc(whoLbl(a.who))}</span>
          </div>
        </div>
        <div class="assign-actions">
          <button class="btn-sm" data-edit="${a.id}"><i class="fa-solid fa-pen fa-xs"></i></button>
          <button class="btn-sm" data-cycle="${a.id}" title="Төлөв солих"><i class="fa-solid fa-rotate fa-xs"></i></button>
          <button class="btn-sm del" data-del="${a.id}"><i class="fa-solid fa-trash fa-xs"></i></button>
        </div>
      </div>
    </div>`;
  }).join('');

  el.querySelectorAll('[data-edit]').forEach(b =>
    b.addEventListener('click', () => openAssignModal(b.dataset.edit)));
  el.querySelectorAll('[data-cycle]').forEach(b =>
    b.addEventListener('click', () => cycleAssignStatus(b.dataset.cycle)));
  el.querySelectorAll('[data-del]').forEach(b =>
    b.addEventListener('click', () => deleteAssignment(b.dataset.del)));

  updateStats();
}

function openAssignModal(id) {
  const editId = document.getElementById('assignEditId');
  const title  = document.getElementById('assignModalTitle');

  if (id) {
    const a = DB.get('assignments').find(x => x.id === id);
    if (!a) return;
    editId.value = a.id;
    title.textContent = 'Даалгавар засах';
    document.getElementById('assignSubject').value  = a.subject;
    document.getElementById('assignTitle').value    = a.title;
    document.getElementById('assignDesc').value     = a.desc || '';
    document.getElementById('assignDeadline').value = a.deadline;
    document.getElementById('assignPriority').value = a.priority;
    document.getElementById('assignStatus').value   = a.status;
    document.getElementById('assignWho').value      = a.who || 'both';
  } else {
    editId.value = '';
    title.textContent = 'Даалгавар нэмэх';
    document.getElementById('assignSubject').value  = '';
    document.getElementById('assignTitle').value    = '';
    document.getElementById('assignDesc').value     = '';
    document.getElementById('assignDeadline').value = '';
    document.getElementById('assignPriority').value = 'medium';
    document.getElementById('assignStatus').value   = 'pending';
    document.getElementById('assignWho').value      = 'both';
  }
  openModal('assignModal');
  setTimeout(() => document.getElementById('assignSubject').focus(), 100);
}

function saveAssignment() {
  const subject  = document.getElementById('assignSubject').value.trim();
  const title    = document.getElementById('assignTitle').value.trim();
  const deadline = document.getElementById('assignDeadline').value;

  if (!subject)  { toast('Хичээлийн нэр оруулна уу!', 'err'); return; }
  if (!title)    { toast('Гарчиг оруулна уу!', 'err'); return; }
  if (!deadline) { toast('Дуусах огноо оруулна уу!', 'err'); return; }

  const list = DB.get('assignments');
  const id   = document.getElementById('assignEditId').value;

  const item = {
    id:       id || uid(),
    subject, title,
    desc:     document.getElementById('assignDesc').value.trim(),
    deadline,
    priority: document.getElementById('assignPriority').value,
    status:   document.getElementById('assignStatus').value,
    who:      document.getElementById('assignWho').value,
    ts:       Date.now(),
  };

  if (id) {
    const i = list.findIndex(a => a.id === id);
    if (i > -1) list[i] = item; else list.push(item);
  } else {
    list.push(item);
  }

  DB.set('assignments', list);
  renderAssignments();
  closeModal('assignModal');
  toast(id ? '✏️ Шинэчлагдлаа' : '✅ Нэмэгдлээ');
}

function cycleAssignStatus(id) {
  const list = DB.get('assignments');
  const a = list.find(x => x.id === id);
  if (!a) return;
  const cycle = { pending: 'in-progress', 'in-progress': 'done', done: 'pending' };
  a.status = cycle[a.status] || 'pending';
  DB.set('assignments', list);
  renderAssignments();
  toast(`📋 ${statusLbl(a.status)} болов`);
}

function deleteAssignment(id) {
  if (!confirm('Устгах уу?')) return;
  DB.set('assignments', DB.get('assignments').filter(a => a.id !== id));
  renderAssignments();
  toast('🗑️ Устгагдлаа');
}

/* ══════════════════════════════════════
   GALLERY / MEMORIES
══════════════════════════════════════ */
function openMemModal() {
  document.getElementById('memCaption').value = '';
  document.getElementById('memDate').value    = toDateStr(new Date());
  document.getElementById('memWho').value     = 'both';
  document.getElementById('memFileInput').value = '';

  const preview = document.getElementById('memPreviewImg');
  const placeholder = document.getElementById('uploadPlaceholder');
  preview.style.display = 'none';
  preview.src = '';
  placeholder.style.display = 'block';

  openModal('memModal');
  setTimeout(() => document.getElementById('memCaption').focus(), 100);
}

function onFileChange(e) {
  const file = e.target.files[0];
  if (file) previewFile(file);
}

function previewFile(file) {
  const reader = new FileReader();
  reader.onload = ev => {
    const preview = document.getElementById('memPreviewImg');
    const placeholder = document.getElementById('uploadPlaceholder');
    preview.src = ev.target.result;
    preview.style.display = 'block';
    placeholder.style.display = 'none';
  };
  reader.readAsDataURL(file);
}

function saveMemory() {
  const caption = document.getElementById('memCaption').value.trim();
  const fileInput = document.getElementById('memFileInput');
  const previewImg = document.getElementById('memPreviewImg');

  if (!caption) { toast('Тайлбар оруулна уу!', 'err'); return; }

  // Accept either a newly picked file or an already-previewed data URL (drag-drop)
  if (fileInput.files[0]) {
    const reader = new FileReader();
    reader.onload = ev => finishSaveMemory(caption, ev.target.result);
    reader.onerror = () => toast('Зураг унших алдаа гарлаа', 'err');
    reader.readAsDataURL(fileInput.files[0]);
  } else if (previewImg.src && previewImg.src.startsWith('data:')) {
    finishSaveMemory(caption, previewImg.src);
  } else {
    toast('Зураг оруулна уу!', 'err');
  }
}

function finishSaveMemory(caption, dataUrl) {
  const mems = DB.get('memories');
  mems.unshift({
    id:       uid(),
    caption,
    date:     document.getElementById('memDate').value,
    who:      document.getElementById('memWho').value,
    img:      dataUrl,
    comments: [],
    ts:       Date.now(),
  });
  DB.set('memories', mems);
  renderGallery();
  updateStats();
  closeModal('memModal');
  toast('📸 Дурсамж нэмэгдлээ!');
}

function renderGallery() {
  const mems = DB.get('memories');
  const el = document.getElementById('galleryGrid');

  if (mems.length === 0) {
    el.innerHTML = `<div class="gallery-empty">
      <div class="e-icon">🌸</div>
      <p>Дурсамж байхгүй байна.<br>Анхны дурсамжаа нэм!</p>
    </div>`;
    return;
  }

  el.innerHTML = mems.map(m => `
    <div class="mem-card" data-id="${m.id}">
      <div class="mem-img-wrap">
        <img src="${m.img}" alt="${esc(m.caption)}" loading="lazy"/>
        <div class="mem-hover-layer"><span>👁 Харах</span></div>
      </div>
      <div class="mem-body">
        <div class="mem-caption">${esc(m.caption)}</div>
        <div class="mem-foot">
          <span class="mem-date">${toMN(m.date)}</span>
          <span class="mem-cmts">💬 ${m.comments.length}</span>
        </div>
      </div>
    </div>`).join('');

  el.querySelectorAll('.mem-card').forEach(card => {
    card.addEventListener('click', () => openPreview(card.dataset.id));
  });
}

function openPreview(id) {
  const mems = DB.get('memories');
  const m = mems.find(x => x.id === id);
  if (!m) return;
  activeMemId = id;

  document.getElementById('previewCaption').textContent = m.caption;
  document.getElementById('previewFullImg').src         = m.img;
  document.getElementById('previewMeta').textContent    = toMN(m.date) + (m.who && m.who !== 'both' ? ' · ' + whoLbl(m.who) : '');
  document.getElementById('commentFrom').value = '';
  document.getElementById('commentText').value = '';
  renderComments(m);

  openModal('previewModal');
}

function renderComments(m) {
  const el = document.getElementById('commentsList');
  if (!m.comments || m.comments.length === 0) {
    el.innerHTML = '<p style="color:var(--text-300);font-size:.8rem">Сэтгэгдэл байхгүй...</p>';
    return;
  }
  el.innerHTML = m.comments.map(c => `
    <div class="comment-item">
      <div class="comment-from">${esc(c.from || 'Зочин')} · ${toDateTime(c.ts)}</div>
      <div class="comment-text-wrap">${esc(c.text)}</div>
    </div>`).join('');
  el.scrollTop = el.scrollHeight;
}

function addComment() {
  if (!activeMemId) return;
  const text = document.getElementById('commentText').value.trim();
  const from = document.getElementById('commentFrom').value.trim() || 'Зочин';
  if (!text) { toast('Сэтгэгдэл бичнэ үү!', 'err'); return; }

  const mems = DB.get('memories');
  const m = mems.find(x => x.id === activeMemId);
  if (!m) return;

  if (!Array.isArray(m.comments)) m.comments = [];
  m.comments.push({ from, text, ts: Date.now() });
  DB.set('memories', mems);

  renderComments(m);
  renderGallery();
  document.getElementById('commentText').value = '';
  toast('💬 Сэтгэгдэл нэмэгдлээ');
}

function deleteMemory(id) {
  if (!confirm('Дурсамжийг устгах уу?')) return;
  DB.set('memories', DB.get('memories').filter(m => m.id !== id));
  activeMemId = null;
  renderGallery();
  updateStats();
  closeModal('previewModal');
  toast('🗑️ Устгагдлаа');
}

/* ══════════════════════════════════════
   COUPLE — TIMER
══════════════════════════════════════ */
function saveStartDate() {
  const val = document.getElementById('startDateInput').value;
  if (!val) { toast('Огноо сонгоно уу!', 'err'); return; }
  DB.setItem('startDate', val);
  updateAnniversary();
  updateStats();
  startLiveTimer();
  toast('💕 Огноо хадгалагдлаа!');
}

function startLiveTimer() {
  clearInterval(timerInterval);
  tickTimer();
  timerInterval = setInterval(tickTimer, 1000);
}

function tickTimer() {
  const sd = DB.getItem('startDate');
  const ids = ['tDays', 'tHours', 'tMins', 'tSecs'];

  if (!sd) {
    ids.forEach(id => set(id, '—'));
    return;
  }

  const diff = Date.now() - new Date(sd).getTime();
  if (diff < 0) { ids.forEach(id => set(id, '—')); return; }

  const days  = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const mins  = Math.floor((diff % 3600000) / 60000);
  const secs  = Math.floor((diff % 60000) / 1000);

  set('tDays',  days);
  set('tHours', hours);
  set('tMins',  String(mins).padStart(2, '0'));
  set('tSecs',  String(secs).padStart(2, '0'));

  // Also update home card
  set('homeDays', days);
}

function updateAnniversary() {
  const sd = DB.getItem('startDate');
  const daysEl = document.getElementById('annivDays');
  const subEl  = document.getElementById('annivSub');
  if (!sd) {
    if (daysEl) daysEl.textContent = '—';
    if (subEl)  subEl.textContent  = 'Эхэлсэн огноог тохируулна уу';
    return;
  }

  const start = new Date(sd);
  const now   = new Date();
  let nextAnniv = new Date(start);
  nextAnniv.setFullYear(now.getFullYear());
  if (nextAnniv <= now) nextAnniv.setFullYear(now.getFullYear() + 1);

  const daysLeft = Math.ceil((nextAnniv - now) / 86400000);
  const years    = nextAnniv.getFullYear() - start.getFullYear();

  if (daysEl) daysEl.textContent = `${daysLeft} өдөр`;
  if (subEl)  subEl.textContent  = `🎊 ${years}-р жилийн ойн баяр хүртэл`;
}

/* ══════════════════════════════════════
   MESSAGES
══════════════════════════════════════ */
function sendMessage() {
  const from = document.getElementById('msgFrom').value.trim() || 'Хайрт нь';
  const text = document.getElementById('msgText').value.trim();
  if (!text) { toast('Захиалгаа бич!', 'err'); return; }

  const msgs = DB.get('messages');
  msgs.push({ id: uid(), from, text, ts: Date.now() });
  DB.set('messages', msgs);

  document.getElementById('msgFrom').value = '';
  document.getElementById('msgText').value = '';
  renderMessages();
  toast('💌 Захиалга илгээгдлээ!');
}

function renderMessages() {
  const msgs = DB.get('messages');
  const el = document.getElementById('msgList');

  if (msgs.length === 0) {
    el.innerHTML = '<p style="color:var(--text-300);font-size:.84rem;padding:.4rem 0">Захиалга байхгүй байна...</p>';
    return;
  }

  el.innerHTML = [...msgs].reverse().map(m => `
    <div class="msg-bubble" data-id="${m.id}">
      <div class="msg-from">💕 ${esc(m.from)}</div>
      <div class="msg-text">${esc(m.text)}</div>
      <div class="msg-time">${toDateTime(m.ts)}</div>
      <button class="msg-del" data-delm="${m.id}" title="Устгах">✕</button>
    </div>`).join('');

  el.querySelectorAll('[data-delm]').forEach(b =>
    b.addEventListener('click', () => deleteMessage(b.dataset.delm)));
}

function deleteMessage(id) {
  DB.set('messages', DB.get('messages').filter(m => m.id !== id));
  renderMessages();
}

/* ══════════════════════════════════════
   NOTES
══════════════════════════════════════ */
function addNote() {
  const text = document.getElementById('noteInput').value.trim();
  if (!text) return;

  const notes = DB.get('notes');
  notes.unshift({ id: uid(), text, ts: Date.now() });
  DB.set('notes', notes);
  document.getElementById('noteInput').value = '';
  renderNotes();
  toast('❤️ Тэмдэглэл нэмэгдлээ');
}

function renderNotes() {
  const notes = DB.get('notes');
  const el = document.getElementById('notesList');

  if (notes.length === 0) {
    el.innerHTML = '<p style="color:var(--text-300);font-size:.82rem">Хайрын тэмдэглэл нэм... 💕</p>';
    return;
  }
  el.innerHTML = notes.map(n => `
    <div class="note-row" data-id="${n.id}">
      <span class="note-heart">💕</span>
      <span class="note-txt">${esc(n.text)}</span>
      <button class="note-del" data-deln="${n.id}" title="Устгах">✕</button>
    </div>`).join('');

  el.querySelectorAll('[data-deln]').forEach(b =>
    b.addEventListener('click', () => deleteNote(b.dataset.deln)));
}

function deleteNote(id) {
  DB.set('notes', DB.get('notes').filter(n => n.id !== id));
  renderNotes();
}

/* ══════════════════════════════════════
   LABEL HELPERS
══════════════════════════════════════ */
function whoLbl(v)    { return { both: 'Хоёулаа', me: 'Би', partner: 'Хань' }[v] || 'Хоёулаа'; }
function statusLbl(v) { return { pending: 'Хүлээгдэж буй', 'in-progress': 'Хийгдэж буй', done: 'Дууссан' }[v] || v; }
function prioLbl(v)   { return { high: '🔴 Яаралтай', medium: '🟡 Дунд', low: '🟢 Бага' }[v] || v; }

/* ══════════════════════════════════════
   ENTRY POINT
══════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  // Login listeners
  document.getElementById('loginBtn').addEventListener('click', tryLogin);
  document.getElementById('pwInput').addEventListener('keydown', e => {
    if (e.key === 'Enter') tryLogin();
  });

  // Auto-login if already authenticated
  if (DB.getItem('auth') === '1') {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('app').style.display = 'flex';
    bootApp();
  }
});
