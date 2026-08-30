// Set relative base path for production deployment (Render)
const API_BASE = '/api';

// Helper functions for Authentication Token & User State
function getToken() {
  return localStorage.getItem('token');
}

function getUser() {
  const user = localStorage.getItem('user');
  return user ? JSON.parse(user) : null;
}

function setAuth(token, user) {
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
}

function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = 'index.html';
}

// Global API Fetch wrapper
async function apiFetch(path, options = {}) {
  const headers = options.headers || {};

  // Add Auth Header if user is logged in
  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Set JSON Content-Type only when sending non-FormData bodies
  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || 'Something went wrong.');
  }

  return data;
}

// Global Notification Helper
function showMsg(el, message, type = 'error') {
  if (!el) return;
  el.textContent = message;
  el.className = `msg ${type}`;
  el.style.display = 'block';
}

// Dynamic Navigation Renderer
function renderNav() {
  const nav = document.getElementById('nav');
  if (!nav) return;

  const user = getUser();
  if (user) {
    let links = `<a href="index.html">Home</a>`;
    if (user.role === 'admin') {
      links += `<a href="admin.html">Admin</a>`;
    }
    links += `<a href="#" id="logoutBtn">Logout (${user.email})</a>`;
    nav.innerHTML = links;

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        logout();
      });
    }
  } else {
    nav.innerHTML = `
      <a href="index.html">Home</a>
      <a href="login.html">Login</a>
      <a href="register.html">Register</a>
    `;
  }
}