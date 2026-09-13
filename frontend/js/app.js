// 1. Anzisha Supabase Client
const supabase = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY) : null;

// 2. Auth Helpers
function getToken() {
  return localStorage.getItem('token');
}

function getUser() {
  const user = localStorage.getItem('user');
  try {
    return user ? JSON.parse(user) : null;
  } catch {
    return null;
  }
}

function setAuth(token, user) {
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
}

function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  if (supabase) supabase.auth.signOut();
  window.location.href = 'index.html';
}

function showMsg(el, message, type = 'error') {
  if (!el) return;
  el.textContent = message;
  el.className = `msg ${type}`;
  el.style.display = 'block';
}

// 3. System Navigation Bar
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

// 4. API Replacement Query for Supabase (Inazuia 404/Server Error)
async function apiFetch(path, options = {}) {
  if (!supabase) throw new Error("Supabase client is not initialized.");

  // Fetch Movies list
  if (path === '/movies' || path === '/movies/') {
    const { data, error } = await supabase.from('movies').select('*').order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return data;
  }

  // Fetch Single Movie by ID
  if (path.startsWith('/movies/')) {
    const id = path.split('/')[2];
    const { data, error } = await supabase.from('movies').select('*').eq('id', id).single();
    if (error) throw new Error(error.message);
    return data;
  }

  throw new Error(`Endpoint ${path} not supported on client-side Supabase setup.`);
}