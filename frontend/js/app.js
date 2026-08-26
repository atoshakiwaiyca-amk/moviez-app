// ---------- AUTH HELPERS (used on every page) ----------
function saveSession(token, user) {
  localStorage.setItem('moviez_token', token);
  localStorage.setItem('moviez_user', JSON.stringify(user));
}

function getToken() {
  return localStorage.getItem('moviez_token');
}

function getUser() {
  const raw = localStorage.getItem('moviez_user');
  return raw ? JSON.parse(raw) : null;
}

function logout() {
  localStorage.removeItem('moviez_token');
  localStorage.removeItem('moviez_user');
  window.location.href = 'login.html';
}

async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = options.headers || {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (!(options.body instanceof FormData) && options.body) {
    headers['Content-Type'] = 'application/json';
  }
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Something went wrong.');
  return data;
}

function showMsg(el, text, type = 'error') {
  el.textContent = text;
  el.className = `msg ${type}`;
  el.style.display = 'block';
}

function requireLogin() {
  if (!getToken()) window.location.href = 'login.html';
}

function renderNav() {
  const user = getUser();
  const navEl = document.getElementById('nav');
  if (!navEl) return;
  if (user) {
    navEl.innerHTML = `
      <a href="index.html">Movies</a>
      <a href="my-movies.html">My Movies</a>
      <a href="#" id="logoutBtn">Log Out</a>
    `;
    document.getElementById('logoutBtn').addEventListener('click', (e) => {
      e.preventDefault();
      logout();
    });
  } else {
    navEl.innerHTML = `
      <a href="index.html">Movies</a>
      <a href="login.html">Log In</a>
      <a href="register.html">Sign Up</a>
    `;
  }
}
