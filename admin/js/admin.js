// Anzisha Supabase client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ---------- PAGE GUARD: admins only ----------
const user = getUser();
if (!getToken() || !user || user.role !== 'admin') {
  document.getElementById('guard').style.display = 'block';
} else {
  document.getElementById('mainContent').style.display = 'block';
  init();
}

const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
  logoutBtn.addEventListener('click', (e) => {
    e.preventDefault();
    logout();
  });
}

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

// ---------- LOAD STATS (From Supabase) ----------
async function loadStats() {
  try {
    const { count: totalMovies } = await supabase.from('movies').select('*', { count: 'exact', head: true });
    const { count: totalUsers } = await supabase.from('users').select('*', { count: 'exact', head: true });
    const { data: sales } = await supabase.from('purchases').select('amount');

    const totalSalesCount = sales ? sales.length : 0;
    const totalRevenue = sales ? sales.reduce((sum, item) => sum + (Number(item.amount) || 0), 0) : 0;

    document.getElementById('statCards').innerHTML = `
      <div class="stat-card"><div class="num">${totalUsers || 0}</div><div class="label">Users</div></div>
      <div class="stat-card"><div class="num">${totalMovies || 0}</div><div class="label">Movies</div></div>
      <div class="stat-card"><div class="num">${totalSalesCount}</div><div class="label">Sales</div></div>
      <div class="stat-card"><div class="num">TZS ${totalRevenue.toLocaleString()}</div><div class="label">Revenue</div></div>
    `;
  } catch (err) {
    console.error('Stats error:', err);
  }
}

// ---------- LOAD MOVIES (From Supabase) ----------
async function loadMovies() {
  const el = document.getElementById('moviesList');
  try {
    const { data: movies, error } = await supabase
      .from('movies')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    if (!movies || movies.length === 0) {
      el.innerHTML = '<p style="color:#888;">No movies yet.</p>';
      return;
    }

    el.innerHTML = movies.map(m => `
      <div class="movie-row">
        <img src="${m.poster_path ? m.poster_path : 'https://via.placeholder.com/50x75'}" alt="${m.title}" />
        <div class="grow">
          <div style="font-weight:600;">${m.title}</div>
          <div style="font-size:12px;color:#999;">TZS ${Number(m.price || 0).toLocaleString()}</div>
        </div>
        <button class="del-btn" data-id="${m.id}">Delete</button>
      </div>
    `).join('');

    el.querySelectorAll('.del-btn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!confirm('Are you sure you want to delete this movie?')) return;
        try {
          const { error: delErr } = await supabase.from('movies').delete().eq('id', btn.dataset.id);
          if (delErr) throw delErr;
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

// ---------- LOAD USERS (From Supabase) ----------
async function loadUsers() {
  const body = document.getElementById('usersBody');
  try {
    const { data: users, error } = await supabase.from('users').select('*');
    if (error) throw error;

    body.innerHTML = (users || []).map(u => `
      <tr>
        <td>${u.email}</td>
        <td>${new Date(u.created_at).toLocaleDateString()}</td>
        <td>${u.role || 'user'}</td>
        <td>${u.total_purchases || 0}</td>
      </tr>
    `).join('');
  } catch (err) {
    body.innerHTML = `<tr><td colspan="4" style="color:#e05252;">${err.message}</td></tr>`;
  }
}

// ---------- HANDLE UPLOAD (Supabase Storage & Database) ----------
async function handleUpload(e) {
  e.preventDefault();
  const msgEl = document.getElementById('uploadMsg');
  const title = document.getElementById('title').value.trim();
  const description = document.getElementById('description').value.trim();
  const price = parseFloat(document.getElementById('price').value);
  const posterFile = document.getElementById('poster').files[0];
  const videoFile = document.getElementById('video').files[0];

  if (!title || !price || !videoFile) {
    showMsg(msgEl, 'Please provide a title, price, and video file.');
    return;
  }

  showMsg(msgEl, 'Uploading files to Supabase Storage...', 'info');

  try {
    let posterUrl = null;
    let videoUrl = null;

    // 1. Upload Poster
    if (posterFile) {
      const posterName = `${Date.now()}_${posterFile.name.replace(/\s+/g, '_')}`;
      const { data: pData, error: pErr } = await supabase.storage.from('posters').upload(posterName, posterFile);
      if (pErr) throw new Error(`Poster upload failed: ${pErr.message}`);
      
      const { data: pUrl } = supabase.storage.from('posters').getPublicUrl(pData.path);
      posterUrl = pUrl.publicUrl;
    }

    // 2. Upload Video
    const videoName = `${Date.now()}_${videoFile.name.replace(/\s+/g, '_')}`;
    const { data: vData, error: vErr } = await supabase.storage.from('videos').upload(videoName, videoFile);
    if (vErr) throw new Error(`Video upload failed: ${vErr.message}`);
    
    const { data: vUrl } = supabase.storage.from('videos').getPublicUrl(vData.path);
    videoUrl = vUrl.publicUrl;

    // 3. Save Record to Supabase 'movies' Table
    const { error: dbErr } = await supabase.from('movies').insert([
      { title, description, price, poster_path: posterUrl, video_path: videoUrl }
    ]);

    if (dbErr) throw dbErr;

    showMsg(msgEl, 'Movie uploaded successfully!', 'success');
    document.getElementById('uploadForm').reset();
    loadMovies();
    loadStats();
  } catch (err) {
    showMsg(msgEl, err.message);
  }
}