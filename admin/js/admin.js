// ---------- PAGE GUARD: admins only ----------
const user = getUser();
if (!getToken() || !user || user.role !== 'admin') {
  document.getElementById('guard').style.display = 'block';
} else {
  document.getElementById('mainContent').style.display = 'block';
  init();
}

document.getElementById('logoutBtn').addEventListener('click', (e) => {
  e.preventDefault();
  logout();
});

// ---------- TABS ----------
document.querySelectorAll('.tab-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach((c) => c.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
  });
});

async function init() {
  await Promise.all([loadStats(), loadMovies(), loadUsers()]);
  document.getElementById('uploadForm').addEventListener('submit', handleUpload);
}

async function loadStats() {
  try {
    const s = await apiFetch('/admin/stats');
    document.getElementById('statCards').innerHTML = `
      <div class="stat-card"><div class="num">${s.totalUsers}</div><div class="label">Users</div></div>
      <div class="stat-card"><div class="num">${s.totalMovies}</div><div class="label">Movies</div></div>
      <div class="stat-card"><div class="num">${s.totalSalesCount}</div><div class="label">Sales</div></div>
      <div class="stat-card"><div class="num">TZS ${Number(s.totalRevenue).toLocaleString()}</div><div class="label">Revenue</div></div>
    `;
  } catch (err) {
    console.error(err);
  }
}

async function loadMovies() {
  const el = document.getElementById('moviesList');
  try {
    const movies = await apiFetch('/movies');
    if (movies.length === 0) {
      el.innerHTML = '<p style="color:#888;">No movies yet.</p>';
      return;
    }
    el.innerHTML = movies.map(m => `
      <div class="movie-row">
        <img src="${m.poster_path ? 'http://localhost:4000' + m.poster_path : 'https://via.placeholder.com/50x75'}" />
        <div class="grow">
          <div style="font-weight:600;">${m.title}</div>
          <div style="font-size:12px;color:#999;">TZS ${Number(m.price).toLocaleString()}</div>
        </div>
        <button class="del-btn" data-id="${m.id}">Delete</button>
      </div>
    `).join('');

    el.querySelectorAll('.del-btn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!confirm('Are you sure you want to delete this movie?')) return;
        try {
          await apiFetch(`/movies/${btn.dataset.id}`, { method: 'DELETE' });
          loadMovies();
          loadStats();
        } catch (err) {
          alert(err.message);
        }
      });
    });
  } catch (err) {
    el.innerHTML = `<p style="color:#e05252;">${err.message}</p>`;
  }
}

async function loadUsers() {
  const body = document.getElementById('usersBody');
  try {
    const users = await apiFetch('/admin/users');
    body.innerHTML = users.map(u => `
      <tr>
        <td>${u.email}</td>
        <td>${u.created_at}</td>
        <td>${u.role}</td>
        <td>${u.total_purchases}</td>
      </tr>
    `).join('');
  } catch (err) {
    body.innerHTML = `<tr><td colspan="4" style="color:#e05252;">${err.message}</td></tr>`;
  }
}

async function handleUpload(e) {
  e.preventDefault();
  const msgEl = document.getElementById('uploadMsg');
  const formData = new FormData();
  formData.append('title', document.getElementById('title').value);
  formData.append('description', document.getElementById('description').value);
  formData.append('price', document.getElementById('price').value);
  const posterFile = document.getElementById('poster').files[0];
  const videoFile = document.getElementById('video').files[0];
  if (posterFile) formData.append('poster', posterFile);
  formData.append('video', videoFile);

  try {
    await apiFetch('/movies', { method: 'POST', body: formData });
    showMsg(msgEl, 'Movie uploaded successfully!', 'success');
    document.getElementById('uploadForm').reset();
    loadMovies();
    loadStats();
  } catch (err) {
    showMsg(msgEl, err.message);
  }
}
