// ============================================================
//  SEASON COORDI — script.js
//  Firebase Authentication + Data Rendering + UI Logic
// ============================================================

// ── Firebase Config (나중에 실제 값으로 교체하세요) ──────────────
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Firebase 초기화 (SDK가 로드된 경우에만)
let auth = null;
let currentUser = null;

function initFirebase() {
  try {
    if (typeof firebase !== 'undefined') {
      if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
      auth = firebase.auth();
      auth.onAuthStateChanged(user => {
        currentUser = user;
        updateAuthUI(user);
      });
    } else {
      // Firebase SDK가 없을 때 — localStorage로 데모 모드 동작
      const saved = localStorage.getItem('sc_demo_user');
      currentUser = saved ? JSON.parse(saved) : null;
      updateAuthUI(currentUser);
    }
  } catch (e) {
    console.warn('Firebase init failed, demo mode active:', e);
    const saved = localStorage.getItem('sc_demo_user');
    currentUser = saved ? JSON.parse(saved) : null;
    updateAuthUI(currentUser);
  }
}

// ── Protected Route ────────────────────────────────────────
function requireAuth() {
  const saved = localStorage.getItem('sc_demo_user');
  const user = saved ? JSON.parse(saved) : null;
  if (!user && !currentUser) {
    alert('로그인이 필요한 페이지입니다.\n로그인 후 이용해주세요.');
    window.location.href = 'index.html';
    return false;
  }
  return true;
}

// ── Auth UI Update ─────────────────────────────────────────
function updateAuthUI(user) {
  const guestBtns = document.querySelectorAll('.auth-guest');
  const userBtns = document.querySelectorAll('.auth-user');
  const userNameEls = document.querySelectorAll('.auth-username');

  if (user) {
    guestBtns.forEach(el => el.style.display = 'none');
    userBtns.forEach(el => el.style.display = 'flex');
    const name = user.displayName || user.email?.split('@')[0] || '사용자';
    userNameEls.forEach(el => el.textContent = name);
  } else {
    guestBtns.forEach(el => el.style.display = 'flex');
    userBtns.forEach(el => el.style.display = 'none');
  }
}

// ── Modal Helpers ──────────────────────────────────────────
function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) { modal.classList.add('open'); document.body.style.overflow = 'hidden'; }
}
function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) { modal.classList.remove('open'); document.body.style.overflow = ''; }
}
function showModalError(modalId, msg) {
  const el = document.querySelector(`#${modalId} .modal-error`);
  if (el) { el.textContent = msg; el.classList.add('visible'); }
}
function hideModalFeedback(modalId) {
  document.querySelectorAll(`#${modalId} .modal-error, #${modalId} .modal-success`)
    .forEach(el => el.classList.remove('visible'));
}

// ── Auth Actions ───────────────────────────────────────────
async function handleLogin(email, password) {
  hideModalFeedback('loginModal');
  try {
    if (auth) {
      await auth.signInWithEmailAndPassword(email, password);
    } else {
      // 데모 모드
      if (!email || !password) throw new Error('이메일과 비밀번호를 입력해주세요.');
      const demo = { email, displayName: email.split('@')[0] };
      localStorage.setItem('sc_demo_user', JSON.stringify(demo));
      currentUser = demo;
      updateAuthUI(demo);
    }
    closeModal('loginModal');
  } catch (e) {
    const msg = e.code === 'auth/user-not-found' ? '등록되지 않은 이메일입니다.' :
                e.code === 'auth/wrong-password' ? '비밀번호가 올바르지 않습니다.' :
                e.message || '로그인에 실패했습니다.';
    showModalError('loginModal', msg);
  }
}

async function handleSignup(email, password) {
  hideModalFeedback('signupModal');
  try {
    if (!email || !password) throw new Error('이메일과 비밀번호를 입력해주세요.');
    if (password.length < 6) throw new Error('비밀번호는 6자 이상이어야 합니다.');
    if (auth) {
      await auth.createUserWithEmailAndPassword(email, password);
    } else {
      const demo = { email, displayName: email.split('@')[0] };
      localStorage.setItem('sc_demo_user', JSON.stringify(demo));
      currentUser = demo;
      updateAuthUI(demo);
    }
    closeModal('signupModal');
  } catch (e) {
    const msg = e.code === 'auth/email-already-in-use' ? '이미 사용 중인 이메일입니다.' :
                e.code === 'auth/invalid-email' ? '올바른 이메일 형식이 아닙니다.' :
                e.message || '회원가입에 실패했습니다.';
    showModalError('signupModal', msg);
  }
}

function handleLogout() {
  if (auth) {
    auth.signOut().catch(console.error);
  }
  localStorage.removeItem('sc_demo_user');
  currentUser = null;
  updateAuthUI(null);
}

// ── Data Loading ───────────────────────────────────────────
async function loadJSON() {
  try {
    const res = await fetch('outfit.json');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return await res.json();
  } catch (e) {
    console.error('outfit.json 로드 실패:', e);
    return null;
  }
}

// ── Liked Set (localStorage) ───────────────────────────────
function getLiked() {
  try { return new Set(JSON.parse(localStorage.getItem('sc_liked') || '[]')); }
  catch { return new Set(); }
}
function toggleLike(id) {
  const liked = getLiked();
  if (liked.has(id)) liked.delete(id); else liked.add(id);
  localStorage.setItem('sc_liked', JSON.stringify([...liked]));
  return liked.has(id);
}

// ── Outfit Card Renderer ───────────────────────────────────
function renderOutfitCard(outfit, onClick) {
  const liked = getLiked();
  const isLiked = liked.has(outfit.id);
  const styleTags = Array.isArray(outfit.style) ? outfit.style.join(' · ') : outfit.style;

  const card = document.createElement('article');
  card.className = 'outfit-card';
  card.innerHTML = `
    <div class="outfit-card-img">
      <img src="${outfit.image}" alt="${outfit.title}" loading="lazy"
           onerror="this.src='https://images.unsplash.com/photo-1490578474895-699cd4e2cf59?w=400&q=60'">
      <div class="outfit-card-badge">${styleTags}</div>
      <button class="outfit-card-like ${isLiked ? 'liked' : ''}" data-id="${outfit.id}" title="좋아요">
        <svg viewBox="0 0 24 24" fill="${isLiked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
        </svg>
      </button>
    </div>
    <div class="outfit-card-info">
      <div class="outfit-card-style">${styleTags}</div>
      <div class="outfit-card-title">${outfit.title}</div>
      <div class="outfit-card-desc">${outfit.description}</div>
      <div class="outfit-card-temp">${outfit.tempMin} ~ ${outfit.tempMax}°C</div>
    </div>
  `;

  card.querySelector('.outfit-card-img img').addEventListener('click', () => onClick && onClick(outfit));
  card.querySelector('.outfit-card-title').addEventListener('click', () => onClick && onClick(outfit));

  card.querySelector('.outfit-card-like').addEventListener('click', e => {
    e.stopPropagation();
    const btn = e.currentTarget;
    const isNowLiked = toggleLike(outfit.id);
    btn.classList.toggle('liked', isNowLiked);
    btn.querySelector('svg').setAttribute('fill', isNowLiked ? 'currentColor' : 'none');
  });

  return card;
}

// ── Skeleton Cards ─────────────────────────────────────────
function renderSkeletons(container, count = 4) {
  container.innerHTML = '';
  for (let i = 0; i < count; i++) {
    container.innerHTML += `
      <div>
        <div class="skeleton skeleton-card"></div>
        <div class="skeleton skeleton-text" style="margin-top:12px"></div>
        <div class="skeleton skeleton-text short"></div>
      </div>`;
  }
}

// ── Navigate to subpage_2 with outfit id ───────────────────
function goToDetail(outfit) {
  sessionStorage.setItem('sc_current_outfit', JSON.stringify(outfit));
  window.location.href = 'subpage_2.html';
}

// ── Index Page Init ─────────────────────────────────────────
async function initIndexPage() {
  initFirebase();
  bindModalEvents();

  const data = await loadJSON();
  if (!data) return;

  // Preview cards
  const previewGrid = document.getElementById('previewGrid');
  if (previewGrid) {
    renderSkeletons(previewGrid, 4);
    setTimeout(() => {
      previewGrid.innerHTML = '';
      data.preview.forEach(item => {
        const card = document.createElement('div');
        card.className = 'preview-card';
        card.innerHTML = `
          <div class="preview-card-img">
            <img src="${item.image}" alt="${item.title}" loading="lazy"
                 onerror="this.src='https://images.unsplash.com/photo-1490578474895-699cd4e2cf59?w=400&q=60'">
            <span class="season-badge">${item.season}</span>
          </div>
          <div class="preview-card-title">${item.title}</div>
          <div class="preview-card-tags">${item.tags.join(' ')}</div>
        `;
        card.addEventListener('click', () => {
          const outfit = data.outfits.find(o => o.id === item.id);
          if (outfit) goToDetail(outfit);
        });
        previewGrid.appendChild(card);
      });
    }, 600);
  }

  // Temp filter cards
  const tempCards = document.querySelectorAll('.temp-card');
  tempCards.forEach(card => {
    card.addEventListener('click', () => {
      tempCards.forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      const temp = card.dataset.temp;
      sessionStorage.setItem('sc_selected_temp', temp);
      window.location.href = 'subpage_1.html?temp=' + encodeURIComponent(temp);
    });
  });

  // Hero CTA
  const heroCta = document.getElementById('heroCta');
  if (heroCta) {
    heroCta.addEventListener('click', () => { window.location.href = 'subpage_1.html'; });
  }
}

// ── Subpage 1 Init ─────────────────────────────────────────
async function initSubpage1() {
  initFirebase();
  if (!requireAuth()) return;
  bindModalEvents();

  const data = await loadJSON();
  if (!data) return;

  let allOutfits = [...data.outfits];
  let filteredOutfits = [...allOutfits];
  const ITEMS_PER_PAGE = 8;
  let currentPage = 1;

  // Read initial filter from URL
  const params = new URLSearchParams(window.location.search);
  const tempParam = params.get('temp');
  let activeTemp = tempParam || 'all';
  let activeStyle = 'all';
  let activeGender = 'all';

  // Set header title based on selected temp
  const titleEl = document.getElementById('pageTitle');
  const descEl = document.getElementById('pageDesc');

  function setTempTitle(temp) {
    const map = {
      'cold': { label: '추운 날', celsius: '0 ~ 10°C', desc: '추운 날씨에 따뜻하게 입을 수 있는 코디를 추천해드려요.' },
      'fresh': { label: '선선한 날', celsius: '10 ~ 20°C', desc: '선선한 날씨에 어울리는 코디를 추천해드려요.' },
      'warm': { label: '더운 날', celsius: '20°C 이상', desc: '더운 날씨에 시원하게 입을 수 있는 코디를 추천해드려요.' },
      'all': { label: '전체', celsius: '', desc: '다양한 날씨에 어울리는 코디를 추천해드려요.' }
    };
    const t = map[temp] || map['all'];
    if (titleEl) titleEl.innerHTML = `🌡️ ${t.celsius ? t.celsius + ' ' : ''}코디 추천`;
    if (descEl) descEl.textContent = t.desc;
  }

  setTempTitle(activeTemp);

  // Set active temp filter button
  if (activeTemp && activeTemp !== 'all') {
    const tempBtnMap = { 'cold': '0 ~ 10℃', 'fresh': '10 ~ 20℃', 'warm': '20℃ 이상' };
    document.querySelectorAll('.filter-temp-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.value === activeTemp || btn.dataset.range === activeTemp);
    });
  }

  function applyFilters() {
    filteredOutfits = allOutfits.filter(o => {
      const matchTemp = activeTemp === 'all' || checkTempMatch(o, activeTemp);
      const matchStyle = activeStyle === 'all' || o.style.includes(activeStyle);
      const matchGender = activeGender === 'all' || o.gender === activeGender || o.gender === '공용';
      return matchTemp && matchStyle && matchGender;
    });
    currentPage = 1;
    renderPage();
  }

  function checkTempMatch(o, temp) {
    if (temp === 'cold') return o.tempMin < 10;
    if (temp === 'fresh') return o.tempMin >= 10 && o.tempMax <= 20;
    if (temp === 'warm') return o.tempMax >= 20;
    // numeric range filters
    const [minS, maxS] = temp.split('~').map(s => parseInt(s));
    if (!isNaN(minS) && !isNaN(maxS)) return o.tempMin >= minS && o.tempMax <= maxS;
    return true;
  }

  function renderPage() {
    const grid = document.getElementById('outfitsGrid');
    const countEl = document.getElementById('resultCount');
    if (!grid) return;

    renderSkeletons(grid, Math.min(ITEMS_PER_PAGE, filteredOutfits.length || 4));

    setTimeout(() => {
      grid.innerHTML = '';
      if (filteredOutfits.length === 0) {
        grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:60px 0;color:var(--gray-400)">조건에 맞는 코디가 없습니다.</div>';
      } else {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        const pageItems = filteredOutfits.slice(start, start + ITEMS_PER_PAGE);
        pageItems.forEach(outfit => {
          grid.appendChild(renderOutfitCard(outfit, goToDetail));
        });
      }
      if (countEl) countEl.textContent = `총 ${filteredOutfits.length}개의 코디`;
      renderPagination();
    }, 400);
  }

  function renderPagination() {
    const pag = document.getElementById('pagination');
    if (!pag) return;
    const totalPages = Math.max(1, Math.ceil(filteredOutfits.length / ITEMS_PER_PAGE));
    pag.innerHTML = '';

    const prev = document.createElement('button');
    prev.className = 'page-btn' + (currentPage === 1 ? ' disabled' : '');
    prev.innerHTML = '‹';
    prev.addEventListener('click', () => { if (currentPage > 1) { currentPage--; renderPage(); } });
    pag.appendChild(prev);

    for (let i = 1; i <= totalPages; i++) {
      const btn = document.createElement('button');
      btn.className = 'page-btn' + (i === currentPage ? ' active' : '');
      btn.textContent = i;
      btn.addEventListener('click', () => { currentPage = i; renderPage(); window.scrollTo({ top: 0, behavior: 'smooth' }); });
      pag.appendChild(btn);
    }

    const next = document.createElement('button');
    next.className = 'page-btn' + (currentPage === totalPages ? ' disabled' : '');
    next.innerHTML = '›';
    next.addEventListener('click', () => { if (currentPage < totalPages) { currentPage++; renderPage(); } });
    pag.appendChild(next);
  }

  // Filter button events
  document.querySelectorAll('.filter-temp-btn').forEach(btn => {
    if (btn.dataset.value === activeTemp) btn.classList.add('active');
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-temp-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeTemp = btn.dataset.value;
      setTempTitle(activeTemp);
      applyFilters();
    });
  });

  document.querySelectorAll('.filter-style-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-style-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeStyle = btn.dataset.value;
      applyFilters();
    });
  });

  document.querySelectorAll('.filter-gender-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-gender-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeGender = btn.dataset.value;
      applyFilters();
    });
  });

  // Today weather refresh button
  const weatherBtn = document.getElementById('weatherRefreshBtn');
  if (weatherBtn) {
    weatherBtn.addEventListener('click', () => {
      const temps = ['cold', 'fresh', 'warm'];
      const random = temps[Math.floor(Math.random() * temps.length)];
      document.querySelectorAll('.filter-temp-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.value === random);
      });
      activeTemp = random;
      setTempTitle(random);
      applyFilters();
    });
  }

  applyFilters();
}

// ── Subpage 2 Init ─────────────────────────────────────────
async function initSubpage2() {
  initFirebase();
  if (!requireAuth()) return;
  bindModalEvents();

  const stored = sessionStorage.getItem('sc_current_outfit');
  const data = await loadJSON();

  let outfit = stored ? JSON.parse(stored) : (data && data.outfits[0]);
  if (!outfit && data) outfit = data.outfits[0];
  if (!outfit) return;

  renderDetail(outfit, data);

  // Back button
  document.querySelectorAll('.back-btn').forEach(btn => {
    btn.addEventListener('click', () => history.back());
  });
}

function renderDetail(outfit, data) {
  // Tags
  const tagsEl = document.getElementById('detailTags');
  if (tagsEl) {
    tagsEl.innerHTML = (Array.isArray(outfit.style) ? outfit.style : [outfit.style])
      .map(s => `<span class="detail-tag">${s}</span>`).join('');
  }

  // Title & desc
  setText('detailTitle', outfit.title);
  setText('detailDesc', outfit.description);

  // Meta
  setText('detailTemp', `${outfit.tempMin} ~ ${outfit.tempMax}°C`);
  setText('detailSeason', Array.isArray(outfit.season) ? outfit.season.join(' / ') : outfit.season);

  // Hashtags
  const hashEl = document.getElementById('detailHashtags');
  if (hashEl) hashEl.innerHTML = outfit.tags.map(t => `<span class="hashtag">${t}</span>`).join('');

  // Point
  setText('detailPoint', outfit.point);

  // Main image
  const mainImg = document.getElementById('detailMainImg');
  if (mainImg) { mainImg.src = outfit.images?.[0] || outfit.image; mainImg.alt = outfit.title; }

  // Thumbnails
  const thumbsEl = document.getElementById('detailThumbs');
  if (thumbsEl && outfit.images) {
    thumbsEl.innerHTML = '';
    outfit.images.forEach((src, i) => {
      const div = document.createElement('div');
      div.className = 'thumb' + (i === 0 ? ' active' : '');
      div.innerHTML = `<img src="${src}" alt="썸네일 ${i+1}" loading="lazy"
        onerror="this.src='${outfit.image}'">`;
      div.addEventListener('click', () => {
        if (mainImg) { mainImg.src = src; mainImg.style.animation = 'none'; requestAnimationFrame(() => { mainImg.style.animation = ''; }); }
        thumbsEl.querySelectorAll('.thumb').forEach(t => t.classList.remove('active'));
        div.classList.add('active');
      });
      thumbsEl.appendChild(div);
    });
  }

  // Items
  const itemsGrid = document.getElementById('itemsGrid');
  const itemEmoji = { 'OUTER': '🧥', 'TOP': '👕', 'BOTTOM': '👖', 'SHOES': '👟', 'BAG': '👜', 'ACC': '🧢' };
  if (itemsGrid && outfit.items) {
    itemsGrid.innerHTML = outfit.items.map(item => `
      <div class="item-card">
        <div class="item-img">${itemEmoji[item.category] || '👔'}</div>
        <div class="item-category">${item.category}</div>
        <div class="item-name">${item.name}</div>
        <div class="item-color-row">
          <span class="color-dot" style="background:${item.colorHex}"></span>
          <span class="item-color-name">${item.color}</span>
        </div>
      </div>
    `).join('');
  }

  // Like button
  const likeBtn = document.getElementById('detailLikeBtn');
  if (likeBtn) {
    const updateLikeBtn = () => {
      const isLiked = getLiked().has(outfit.id);
      likeBtn.classList.toggle('liked', isLiked);
      likeBtn.innerHTML = isLiked ? '♥' : '♡';
    };
    updateLikeBtn();
    likeBtn.addEventListener('click', () => { toggleLike(outfit.id); updateLikeBtn(); });
  }

  // Related & similar
  if (data) {
    renderRelated('relatedGrid', outfit.relatedIds || [], data.outfits);
    renderRelated('similarGrid', outfit.similarIds || [], data.outfits);
  }
}

function renderRelated(gridId, ids, outfits) {
  const grid = document.getElementById(gridId);
  if (!grid) return;
  const items = ids.map(id => outfits.find(o => o.id === id)).filter(Boolean);
  grid.innerHTML = items.map(o => `
    <div class="related-card" onclick="navigateToOutfit(${o.id})">
      <div class="related-card-img">
        <img src="${o.image}" alt="${o.title}" loading="lazy"
             onerror="this.src='https://images.unsplash.com/photo-1490578474895-699cd4e2cf59?w=400&q=60'">
      </div>
      <div class="related-card-title">${o.title}</div>
      <div class="related-card-temp">${o.tempMin} ~ ${o.tempMax}°C</div>
    </div>
  `).join('');
}

window.navigateToOutfit = async function(id) {
  const data = await loadJSON();
  if (!data) return;
  const outfit = data.outfits.find(o => o.id === id);
  if (outfit) {
    sessionStorage.setItem('sc_current_outfit', JSON.stringify(outfit));
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => renderDetail(outfit, data), 300);
  }
};

// ── Utilities ──────────────────────────────────────────────
function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

// ── Modal Event Binding ────────────────────────────────────
function bindModalEvents() {
  // Open modals
  document.querySelectorAll('[data-open-modal]').forEach(btn => {
    btn.addEventListener('click', () => openModal(btn.dataset.openModal));
  });

  // Close buttons
  document.querySelectorAll('[data-close-modal]').forEach(btn => {
    btn.addEventListener('click', () => closeModal(btn.dataset.closeModal));
  });

  // Overlay click
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => {
      if (e.target === overlay) closeModal(overlay.id);
    });
  });

  // Logout
  document.querySelectorAll('.btn-logout').forEach(btn => {
    btn.addEventListener('click', handleLogout);
  });

  // Login form
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', e => {
      e.preventDefault();
      const email = document.getElementById('loginEmail').value.trim();
      const password = document.getElementById('loginPassword').value;
      handleLogin(email, password);
    });
  }

  // Signup form
  const signupForm = document.getElementById('signupForm');
  if (signupForm) {
    signupForm.addEventListener('submit', e => {
      e.preventDefault();
      const email = document.getElementById('signupEmail').value.trim();
      const password = document.getElementById('signupPassword').value;
      handleSignup(email, password);
    });
  }

  // Modal switch links
  document.querySelectorAll('[data-switch-modal]').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      const [from, to] = link.dataset.switchModal.split(':');
      closeModal(from);
      setTimeout(() => openModal(to), 150);
    });
  });

  // Keyboard ESC
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-overlay.open').forEach(m => closeModal(m.id));
    }
  });
}

// ── Auto-init based on page ────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const page = document.body.dataset.page;
  if (page === 'index') initIndexPage();
  else if (page === 'sub1') initSubpage1();
  else if (page === 'sub2') initSubpage2();
});
