/**
 * ==========================================================
 * PARKFIND — SMART PARKING & PARKING SPACE MARKETPLACE
 * 100% Vanilla JavaScript Client (Zero Framework Dependencies)
 * ==========================================================
 */

const API_BASE_URL = '/api';

// Global Application State
const state = {
  theme: 'light',
  currentPage: 'home',
  user: null,             // { token, id, full_name, email, phone, role: 'customer' | 'owner' }
  userCoords: null,       // { lat, lng } if geolocation allowed
  activeCity: 'Coimbatore',

  // Marketplace Listings
  locations: [],
  filteredLocations: [],
  selectedLocation: null,
  selectedSlot: null,
  selectedDuration: 1,
  activeQuickFilter: 'all',

  // Active Session & Timer
  activeSession: null,
  timerInterval: null,

  // Leaflet Map
  map: null,
  markersLayer: null,
  userMarker: null,

  // Owner Data
  ownerSpaces: [],
  ownerActiveSpace: null,
  ownerBookings: [],

  // Customer Data
  customerBookings: [],
  notifications: [],
  forecast: null
};

// ================= 1. INITIALIZATION & ROUTING =================
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  loadSavedAuth();
  initNavigation();
  initHashRouting();
  initModalBackdropHandlers();

  // Load Initial API Data
  loadCitiesAndAreas();
  loadLocations();
  loadSmartRecommendations();
  loadDemandForecast();
  checkActiveCarSession();

  // Active Session Countdown (every second)
  state.timerInterval = setInterval(updateTimerTick, 1000);

  // Background sync every 15 seconds
  setInterval(() => {
    if (state.currentPage === 'explore') {
      loadLocations(false);
    } else if (state.currentPage === 'owner-dashboard' && state.user?.role === 'owner') {
      loadOwnerDashboard(false);
    }
  }, 15000);
});

// Theme Management
function initTheme() {
  const savedTheme = localStorage.getItem('parkfind_theme') || 'light';
  setTheme(savedTheme);
}

function toggleTheme() {
  const nextTheme = state.theme === 'light' ? 'dark' : 'light';
  setTheme(nextTheme);
}

function setTheme(theme) {
  state.theme = theme;
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('parkfind_theme', theme);

  if (state.map) {
    state.map.invalidateSize();
  }
}

// Navigation & Hash Routing
function initNavigation() {
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const page = link.getAttribute('data-page');
      navigateTo(page);
    });
  });
}

function initHashRouting() {
  window.addEventListener('hashchange', () => {
    const hash = window.location.hash.replace('#', '');
    if (hash) navigateTo(hash, false);
  });

  const initialHash = window.location.hash.replace('#', '');
  if (initialHash) {
    navigateTo(initialHash, false);
  }
}

function navigateTo(pageId, updateHash = true) {
  const isOwner = state.user?.role === 'owner';
  const ownerPages = ['owner-dashboard', 'owner-spaces', 'owner-bookings', 'owner-earnings'];
  const customerOnlyPages = ['find-car', 'history', 'book'];

  // Enforce Strict Role Routing
  if (isOwner && customerOnlyPages.includes(pageId)) {
    pageId = 'owner-dashboard';
  } else if (!isOwner && ownerPages.includes(pageId)) {
    pageId = 'home';
    showToast('Please sign in as a Parking Owner to access the management workspace.', 'warning');
  }

  const validPages = ['home', 'explore', 'book', 'find-car', 'forecast', 'history', ...ownerPages];
  const targetPage = validPages.includes(pageId) ? pageId : 'home';

  state.currentPage = targetPage;
  if (updateHash) window.location.hash = targetPage;

  // Update Page Visibility
  document.querySelectorAll('.page-view').forEach(view => view.classList.remove('active'));
  const targetView = document.getElementById(`view-${targetPage}`);
  if (targetView) targetView.classList.add('active');

  // Update Nav Links
  document.querySelectorAll('.nav-link').forEach(link => {
    link.classList.toggle('active', link.getAttribute('data-page') === targetPage);
  });

  // Close Mobile Menu if open
  const navMenu = document.getElementById('navMenu');
  if (navMenu) navMenu.classList.remove('show');

  // Page Specific Triggers
  if (targetPage === 'explore') {
    setTimeout(initMapIfNeeded, 200);
  } else if (targetPage === 'find-car') {
    checkActiveCarSession();
  } else if (targetPage === 'forecast') {
    loadDemandForecastPage();
  } else if (targetPage === 'history') {
    loadCustomerBookings();
  } else if (targetPage === 'owner-dashboard') {
    loadOwnerDashboard();
  } else if (targetPage === 'owner-spaces') {
    loadOwnerSpaces();
  } else if (targetPage === 'owner-bookings') {
    loadOwnerBookings();
  } else if (targetPage === 'owner-earnings') {
    loadOwnerEarnings();
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function toggleMobileMenu() {
  const navMenu = document.getElementById('navMenu');
  if (navMenu) navMenu.classList.toggle('show');
}

// ================= 2. VANILLA MODALS & DROPDOWNS =================
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  modal.style.display = 'flex';
  setTimeout(() => modal.classList.add('show'), 10);
  document.body.style.overflow = 'hidden';
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  modal.classList.remove('show');
  setTimeout(() => {
    modal.style.display = 'none';
    document.body.style.overflow = '';
  }, 200);
}

function initModalBackdropHandlers() {
  document.querySelectorAll('.modal-backdrop').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeModal(modal.id);
      }
    });
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-backdrop.show').forEach(m => closeModal(m.id));
      closeAllDropdowns();
    }
  });

  // Close dropdowns on outside click
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.dropdown')) {
      closeAllDropdowns();
    }
  });
}

function toggleDropdown(dropdownId) {
  const dropdown = document.getElementById(dropdownId);
  if (!dropdown) return;
  const isShown = dropdown.classList.contains('show');
  closeAllDropdowns();
  if (!isShown) dropdown.classList.add('show');
}

function closeAllDropdowns() {
  document.querySelectorAll('.dropdown-menu.show').forEach(d => d.classList.remove('show'));
}

function showToast(message, type = 'info', duration = 4000) {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast-item toast-${type}`;

  const iconMap = {
    success: '✓',
    danger: '✕',
    warning: '⚠️',
    info: 'ℹ️'
  };

  toast.innerHTML = `
    <span style="font-size: 1.1rem; line-height: 1;">${iconMap[type] || 'ℹ️'}</span>
    <span style="flex-grow: 1;">${message}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(12px)';
    toast.style.transition = 'all 0.25s ease';
    setTimeout(() => toast.remove(), 250);
  }, duration);
}

// ================= 3. AUTHENTICATION & ROLE MANAGEMENT =================
function loadSavedAuth() {
  const saved = localStorage.getItem('parkfind_user');
  if (saved) {
    try {
      state.user = JSON.parse(saved);
    } catch (e) {
      state.user = null;
    }
  }
  updateAuthUI();
}

function updateAuthUI() {
  const authContainer = document.getElementById('authContainer');
  const userRoleBadge = document.getElementById('userRoleBadge');
  const roleLabel = document.getElementById('roleLabel');
  const roleIcon = document.getElementById('roleIcon');
  const navRoleSubtitle = document.getElementById('navRoleSubtitle');

  const custNavItems = document.querySelectorAll('.cust-nav-item');
  const ownerNavItems = document.querySelectorAll('.owner-nav-item');

  if (state.user) {
    const isOwner = state.user.role === 'owner';

    custNavItems.forEach(el => el.style.display = isOwner ? 'none' : 'inline-block');
    ownerNavItems.forEach(el => el.style.display = isOwner ? 'inline-block' : 'none');

    if (userRoleBadge) {
      userRoleBadge.className = `role-pill ${isOwner ? 'owner' : ''}`;
      if (roleLabel) roleLabel.textContent = isOwner ? 'Owner Workspace' : 'Customer Mode';
      if (roleIcon) roleIcon.textContent = isOwner ? '🏢' : '🚗';
    }

    if (navRoleSubtitle) {
      navRoleSubtitle.textContent = isOwner ? 'Parking Owner Platform' : 'Smart Parking Marketplace';
    }

    if (authContainer) {
      authContainer.innerHTML = `
        <div class="dropdown">
          <button class="btn btn-secondary btn-sm" onclick="toggleDropdown('userProfileDropdown')">
            <span style="width: 8px; height: 8px; border-radius: 50%; background: ${isOwner ? 'var(--success-500)' : 'var(--primary-600)'}; display: inline-block;"></span>
            <span>${state.user.full_name.split(' ')[0]}</span>
            <span class="badge ${isOwner ? 'badge-success' : 'badge-primary'} badge-pill" style="font-size: 9px; text-transform: uppercase;">${state.user.role}</span>
          </button>
          <div class="dropdown-menu" id="userProfileDropdown">
            <div style="padding: 0.5rem 0.75rem; border-bottom: 1px solid var(--border-subtle);">
              <strong style="display: block; font-size: 0.85rem;">${state.user.full_name}</strong>
              <span style="font-size: 0.75rem; color: var(--text-muted);">${state.user.email}</span>
            </div>
            <a class="dropdown-item" href="#" onclick="${isOwner ? "navigateTo('owner-dashboard')" : "navigateTo('history')"}">
              ${isOwner ? '🏢 Owner Dashboard' : '📋 My Bookings'}
            </a>
            <div class="dropdown-divider"></div>
            <button class="dropdown-item" style="color: var(--danger-600);" onclick="logoutUser()">
              🚪 Sign Out
            </button>
          </div>
        </div>
      `;
    }
  } else {
    // Guest view (Customer default)
    custNavItems.forEach(el => el.style.display = 'inline-block');
    ownerNavItems.forEach(el => el.style.display = 'none');

    if (userRoleBadge) {
      userRoleBadge.className = 'role-pill';
      if (roleLabel) roleLabel.textContent = 'Guest Mode';
      if (roleIcon) roleIcon.textContent = '👤';
    }

    if (navRoleSubtitle) {
      navRoleSubtitle.textContent = 'Smart Parking Marketplace';
    }

    if (authContainer) {
      authContainer.innerHTML = `
        <button class="btn btn-primary btn-sm" onclick="openAuthModal('customer')">
          Sign In
        </button>
      `;
    }
  }
}

let activeAuthRole = 'customer';
let isRegisterMode = false;

function openAuthModal(role = 'customer') {
  activeAuthRole = role;
  isRegisterMode = false;

  // Clean form inputs completely — ZERO pre-filling
  const form = document.getElementById('authForm');
  if (form) form.reset();
  document.getElementById('authEmail').value = '';
  document.getElementById('authPassword').value = '';
  const nameInput = document.getElementById('authFullName');
  if (nameInput) nameInput.value = '';
  const phoneInput = document.getElementById('authPhone');
  if (phoneInput) phoneInput.value = '';

  switchAuthRole(role);
  toggleAuthMode(false);
  openModal('authModal');
}

function switchAuthRole(role) {
  activeAuthRole = role;
  const tabCust = document.getElementById('authTabCustomer');
  const tabOwner = document.getElementById('authTabOwner');
  const title = document.getElementById('authModalTitle');

  if (role === 'customer') {
    tabCust.style.background = 'var(--bg-surface)';
    tabCust.style.color = 'var(--primary-600)';
    tabCust.style.boxShadow = 'var(--shadow-sm)';
    tabOwner.style.background = 'transparent';
    tabOwner.style.color = 'var(--text-muted)';
    tabOwner.style.boxShadow = 'none';
    if (title) title.textContent = isRegisterMode ? 'Create Customer Account' : 'Sign in as Customer';
  } else {
    tabOwner.style.background = 'var(--bg-surface)';
    tabOwner.style.color = 'var(--success-600)';
    tabOwner.style.boxShadow = 'var(--shadow-sm)';
    tabCust.style.background = 'transparent';
    tabCust.style.color = 'var(--text-muted)';
    tabCust.style.boxShadow = 'none';
    if (title) title.textContent = isRegisterMode ? 'Create Parking Owner Account' : 'Sign in as Parking Owner';
  }
}

function toggleAuthMode(forceState) {
  isRegisterMode = forceState !== undefined ? forceState : !isRegisterMode;
  const nameField = document.getElementById('registerNameField');
  const phoneField = document.getElementById('registerPhoneField');
  const submitBtn = document.getElementById('authSubmitBtn');
  const toggleBtn = document.getElementById('toggleAuthModeBtn');
  const title = document.getElementById('authModalTitle');

  if (isRegisterMode) {
    if (nameField) nameField.style.display = 'block';
    if (phoneField) phoneField.style.display = 'block';
    if (submitBtn) submitBtn.textContent = 'Create Account';
    if (toggleBtn) toggleBtn.textContent = 'Already have an account? Sign in';
    if (title) title.textContent = activeAuthRole === 'owner' ? 'Create Parking Owner Account' : 'Create Customer Account';
  } else {
    if (nameField) nameField.style.display = 'none';
    if (phoneField) phoneField.style.display = 'none';
    if (submitBtn) submitBtn.textContent = 'Sign In';
    if (toggleBtn) toggleBtn.textContent = "Don't have an account? Create one";
    if (title) title.textContent = activeAuthRole === 'owner' ? 'Sign in as Parking Owner' : 'Sign in as Customer';
  }
}

async function handleAuthSubmit(e) {
  e.preventDefault();
  const email = document.getElementById('authEmail').value.trim();
  const password = document.getElementById('authPassword').value;
  const fullName = document.getElementById('authFullName')?.value.trim();
  const phone = document.getElementById('authPhone')?.value.trim();

  if (isRegisterMode && !fullName) {
    showToast('Please enter your full name to create an account.', 'warning');
    return;
  }

  const endpoint = isRegisterMode ? `${API_BASE_URL}/auth/register` : `${API_BASE_URL}/auth/login`;
  const body = isRegisterMode
    ? { full_name: fullName, email, phone: phone || '+91 98422 00000', password, role: activeAuthRole }
    : { email, password, role: activeAuthRole };

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      showToast(data.message || 'Authentication failed', 'danger');
      return;
    }

    state.user = {
      token: data.data.token,
      ...data.data.user
    };
    localStorage.setItem('parkfind_user', JSON.stringify(state.user));

    closeModal('authModal');
    // Clear inputs immediately after success
    document.getElementById('authEmail').value = '';
    document.getElementById('authPassword').value = '';

    updateAuthUI();
    showToast(`Welcome back, ${state.user.full_name}!`, 'success');

    if (state.user.role === 'owner') {
      navigateTo('owner-dashboard');
    } else {
      navigateTo('home');
      checkActiveCarSession();
    }
  } catch (err) {
    showToast('Network error during authentication.', 'danger');
  }
}

function logoutUser() {
  state.user = null;
  localStorage.removeItem('parkfind_user');

  // Clear any inputs in auth form
  const form = document.getElementById('authForm');
  if (form) form.reset();

  updateAuthUI();
  showToast('You have signed out.', 'info');
  navigateTo('home');
}

// ================= 4. GEOLOCATION & CITY METADATA =================
async function loadCitiesAndAreas() {
  try {
    const res = await fetch(`${API_BASE_URL}/locations/meta/cities`);
    const data = await res.json();
    if (data.success && data.data) {
      const areaSelect = document.getElementById('exploreAreaSelect');
      if (areaSelect) {
        areaSelect.innerHTML = '<option value="all">All Locations / Areas</option>';
        data.data.areas.forEach(a => {
          areaSelect.innerHTML += `<option value="${a.name}">${a.name} (${a.city})</option>`;
        });
      }
    }
  } catch (e) {
    console.error('Failed to load city metadata:', e.message);
  }
}

function useCurrentLocation() {
  if (!navigator.geolocation) {
    showToast('Geolocation is not supported by your browser.', 'warning');
    return;
  }

  showToast('Obtaining your GPS position...', 'info', 2000);

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      state.userCoords = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude
      };

      showToast('Location detected! Sorting facilities nearest to you.', 'success');

      // Update sort dropdown to nearest
      const sortSelect = document.getElementById('exploreSortSelect');
      if (sortSelect) sortSelect.value = 'nearest';

      // Reload locations with GPS coords
      loadLocations(true);

      if (state.currentPage !== 'explore') {
        navigateTo('explore');
      }
    },
    (err) => {
      console.warn('Geolocation denied or unavailable:', err.message);
      showToast('Location permission denied. Showing all parking spaces.', 'info');
      // Do NOT crash or break the page — gracefully continue
      loadLocations(true);
    },
    { timeout: 8000, enableHighAccuracy: true }
  );
}

// ================= 5. LOCATIONS & MAP DISCOVERY =================
async function loadLocations(triggerRenders = true) {
  try {
    let url = `${API_BASE_URL}/locations?`;
    if (state.userCoords) {
      url += `user_lat=${state.userCoords.lat}&user_lng=${state.userCoords.lng}&`;
    }

    const sortSelect = document.getElementById('exploreSortSelect');
    if (sortSelect && sortSelect.value) {
      url += `sort_by=${sortSelect.value}&`;
    }

    const res = await fetch(url);
    const data = await res.json();

    if (data.success) {
      state.locations = data.data;
      state.filteredLocations = [...state.locations];

      if (triggerRenders) {
        renderHomeLocations();
        renderExploreLocations();
        updateMarketplaceStats();
        updateMapMarkers();
      }
    }
  } catch (err) {
    console.error('Failed to fetch locations:', err.message);
  }
}

function updateMarketplaceStats() {
  const totalLoc = document.getElementById('heroTotalLocations');
  const availSlots = document.getElementById('heroAvailableSlots');
  const activeSessions = document.getElementById('heroActiveSessions');

  if (totalLoc) totalLoc.textContent = state.locations.length;
  if (availSlots) {
    const totalAvail = state.locations.reduce((acc, l) => acc + l.availableSlots, 0);
    availSlots.textContent = totalAvail;
  }
  if (activeSessions) {
    const totalTaken = state.locations.reduce((acc, l) => acc + (l.totalCapacity - l.availableSlots), 0);
    activeSessions.textContent = totalTaken;
  }
}

function executeHomeSearch() {
  const searchInput = document.getElementById('homeSearchInput');
  const term = searchInput ? searchInput.value.trim() : '';

  navigateTo('explore');
  const exploreSearch = document.getElementById('exploreSearchInput');
  if (exploreSearch) {
    exploreSearch.value = term;
    filterAndRenderLocations();
  }
}

function filterByArea(areaName) {
  navigateTo('explore');
  const areaSelect = document.getElementById('exploreAreaSelect');
  if (areaSelect) {
    areaSelect.value = areaName;
    filterAndRenderLocations();
  }
}

function toggleQuickFilter(filterType) {
  state.activeQuickFilter = filterType;
  document.querySelectorAll('.filter-pill').forEach(btn => {
    btn.classList.toggle('active', btn.id === `chip-${filterType}`);
  });
  filterAndRenderLocations();
}

function filterAndRenderLocations() {
  const searchTerm = (document.getElementById('exploreSearchInput')?.value || '').toLowerCase().trim();
  const selectedArea = document.getElementById('exploreAreaSelect')?.value || 'all';
  const selectedPrice = document.getElementById('explorePriceFilter')?.value || 'all';
  const selectedSort = document.getElementById('exploreSortSelect')?.value || 'recommended';

  state.filteredLocations = state.locations.filter(loc => {
    // Search text
    if (searchTerm) {
      const matchName = loc.name.toLowerCase().includes(searchTerm);
      const matchArea = loc.area.toLowerCase().includes(searchTerm);
      const matchCity = loc.city.toLowerCase().includes(searchTerm);
      const matchAddr = loc.address.toLowerCase().includes(searchTerm);
      if (!matchName && !matchArea && !matchCity && !matchAddr) return false;
    }

    // Area
    if (selectedArea !== 'all' && loc.area !== selectedArea) return false;

    // Price
    if (selectedPrice !== 'all' && loc.hourlyRate > parseFloat(selectedPrice)) return false;

    // Quick Amenities
    if (state.activeQuickFilter === 'ev' && !loc.hasEv) return false;
    if (state.activeQuickFilter === 'covered' && !loc.isCovered) return false;
    if (state.activeQuickFilter === '247' && !loc.is24x7) return false;
    if (state.activeQuickFilter === 'accessible' && !loc.isAccessible) return false;

    return true;
  });

  // Client-side Sorting
  if (selectedSort === 'nearest') {
    state.filteredLocations.sort((a, b) => (a.distanceKm !== null ? a.distanceKm : 9999) - (b.distanceKm !== null ? b.distanceKm : 9999));
  } else if (selectedSort === 'price_asc') {
    state.filteredLocations.sort((a, b) => a.hourlyRate - b.hourlyRate);
  } else if (selectedSort === 'price_desc') {
    state.filteredLocations.sort((a, b) => b.hourlyRate - a.hourlyRate);
  } else if (selectedSort === 'available_desc') {
    state.filteredLocations.sort((a, b) => b.availableSlots - a.availableSlots);
  } else if (selectedSort === 'rating_desc') {
    state.filteredLocations.sort((a, b) => b.rating - a.rating);
  }

  renderExploreLocations();
  updateMapMarkers();
}

function renderHomeLocations() {
  const container = document.getElementById('homeLocationsGrid');
  if (!container) return;

  const displayList = state.locations.slice(0, 6);
  if (displayList.length === 0) {
    container.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 2rem; color: var(--text-muted);">No parking locations found.</div>';
    return;
  }

  container.innerHTML = displayList.map(loc => `
    <div class="card card-hover" style="display: flex; flex-direction: column;">
      <div style="position: relative; height: 160px; overflow: hidden;">
        <img src="${loc.imageUrl}" alt="${loc.name}" style="width: 100%; height: 100%; object-fit: cover;">
        <span class="badge ${loc.isFull ? 'badge-danger' : 'badge-success'} badge-pill" style="position: absolute; top: 12px; right: 12px;">
          ${loc.isFull ? 'Sold Out' : `${loc.availableSlots} Bays Left`}
        </span>
        <span class="badge badge-primary badge-pill" style="position: absolute; bottom: 12px; left: 12px;">
          ₹${loc.hourlyRate}/hr
        </span>
      </div>
      <div class="card-body" style="flex-grow: 1; display: flex; flex-direction: column; justify-content: space-between;">
        <div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.35rem;">
            <span style="font-size: 0.75rem; font-weight: 700; color: var(--primary-600);">${loc.area} · ${loc.city}</span>
            <span style="font-size: 0.8rem; font-weight: 800; color: #eab308;">⭐ ${loc.rating}</span>
          </div>
          <h3 style="font-size: 1.1rem; font-weight: 800; color: var(--text-main); margin-bottom: 0.4rem;">${loc.name}</h3>
          <p style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.85rem;">${loc.address}</p>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--border-subtle); padding-top: 0.75rem;">
          <span style="font-size: 0.75rem; color: var(--text-dim); font-weight: 600;">
            ${loc.distanceLabel ? `📍 ${loc.distanceLabel}` : `Open ${loc.openingTime}–${loc.closingTime}`}
          </span>
          <button class="btn btn-primary btn-sm" onclick="startBookingLocation(${loc.id})">
            Book Bay →
          </button>
        </div>
      </div>
    </div>
  `).join('');
}

function renderExploreLocations() {
  const container = document.getElementById('exploreCardsContainer');
  if (!container) return;

  if (state.filteredLocations.length === 0) {
    container.innerHTML = `
      <div class="card" style="padding: 2.5rem; text-align: center;">
        <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">🔍</div>
        <h4 style="font-size: 1.1rem; font-weight: 800;">No matching parking spaces</h4>
        <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1rem;">Try clearing your search query or selecting another area.</p>
        <button class="btn btn-secondary btn-sm" onclick="resetFilters()">Reset All Filters</button>
      </div>
    `;
    return;
  }

  container.innerHTML = state.filteredLocations.map(loc => `
    <div class="card card-hover" style="padding: 1.15rem; cursor: pointer;" onclick="focusMapLocation(${loc.id})">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.4rem;">
        <div>
          <span style="font-size: 0.75rem; font-weight: 700; color: var(--primary-600);">${loc.area} · ${loc.city}</span>
          <h4 style="font-size: 1.05rem; font-weight: 800; color: var(--text-main); margin-top: 0.1rem;">${loc.name}</h4>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 1.15rem; font-weight: 800; font-family: 'JetBrains Mono', monospace; color: var(--primary-600);">₹${loc.hourlyRate}<span style="font-size: 0.75rem;">/hr</span></div>
          <span style="font-size: 0.75rem; font-weight: 800; color: #eab308;">⭐ ${loc.rating}</span>
        </div>
      </div>
      <p style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.75rem;">${loc.address}</p>
      
      <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--border-subtle); padding-top: 0.75rem;">
        <div style="display: flex; gap: 0.4rem; align-items: center;">
          <span class="badge ${loc.isFull ? 'badge-danger' : 'badge-success'}">${loc.isFull ? 'Full' : `${loc.availableSlots} Available`}</span>
          ${loc.distanceLabel ? `<span class="badge badge-slate">📍 ${loc.distanceLabel}</span>` : ''}
          ${loc.hasEv ? '<span class="badge badge-primary">⚡ EV</span>' : ''}
        </div>
        <button class="btn btn-primary btn-sm" onclick="event.stopPropagation(); startBookingLocation(${loc.id})">
          Select & Book →
        </button>
      </div>
    </div>
  `).join('');
}

function resetFilters() {
  document.getElementById('exploreSearchInput').value = '';
  document.getElementById('exploreAreaSelect').value = 'all';
  document.getElementById('explorePriceFilter').value = 'all';
  document.getElementById('exploreSortSelect').value = 'recommended';
  toggleQuickFilter('all');
}

// ================= 6. LEAFLET MAP INTEGRATION =================
function initMapIfNeeded() {
  const mapContainer = document.getElementById('interactiveMap');
  if (!mapContainer || state.map) return;

  // Default Center (Coimbatore Hub)
  const centerLat = state.userCoords ? state.userCoords.lat : 11.0168;
  const centerLng = state.userCoords ? state.userCoords.lng : 76.9558;

  state.map = L.map('interactiveMap', {
    center: [centerLat, centerLng],
    zoom: 13,
    zoomControl: true
  });

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(state.map);

  state.markersLayer = L.layerGroup().addTo(state.map);

  if (state.userCoords) {
    const userIcon = L.divIcon({
      className: 'custom-map-user-pin',
      iconSize: [16, 16],
      iconAnchor: [8, 8]
    });
    state.userMarker = L.marker([state.userCoords.lat, state.userCoords.lng], { icon: userIcon })
      .addTo(state.map)
      .bindPopup('<strong>Your Location</strong>');
  }

  updateMapMarkers();
}

function updateMapMarkers() {
  if (!state.map || !state.markersLayer) return;

  state.markersLayer.clearLayers();

  const bounds = [];

  state.filteredLocations.forEach(loc => {
    const customIcon = L.divIcon({
      className: 'custom-map-pin-wrapper',
      html: `
        <div class="custom-map-price-pin" onclick="focusMapLocation(${loc.id})">
          <span>₹${loc.hourlyRate}</span>
        </div>
      `,
      iconSize: [50, 24],
      iconAnchor: [25, 12]
    });

    const marker = L.marker([loc.latitude, loc.longitude], { icon: customIcon });

    const popupHtml = `
      <div style="font-family: inherit; font-size: 12px; max-width: 200px;">
        <strong style="font-size: 13px; display: block; margin-bottom: 2px;">${loc.name}</strong>
        <span style="color: #64748b;">${loc.area} · ₹${loc.hourlyRate}/hr</span>
        <div style="margin: 6px 0;">
          <span style="color: ${loc.isFull ? '#ef4444' : '#10b981'}; font-weight: 700;">
            ${loc.isFull ? 'Sold Out' : `${loc.availableSlots} Bays Available`}
          </span>
        </div>
        <button style="width: 100%; padding: 4px 8px; background: #2563eb; color: #fff; border: none; border-radius: 6px; font-weight: 700; cursor: pointer;" onclick="startBookingLocation(${loc.id})">
          Book Spot
        </button>
      </div>
    `;

    marker.bindPopup(popupHtml);
    state.markersLayer.addLayer(marker);
    bounds.push([loc.latitude, loc.longitude]);
  });

  if (bounds.length > 0 && !state.userCoords) {
    state.map.fitBounds(bounds, { padding: [30, 30] });
  }
}

function focusMapLocation(locationId) {
  const loc = state.locations.find(l => l.id === locationId);
  if (!loc || !state.map) return;
  state.map.flyTo([loc.latitude, loc.longitude], 15, { duration: 0.8 });
}

// ================= 7. BOOKING & VISUAL BAY SELECTOR =================
async function startBookingLocation(locationId) {
  await loadLocationDetail(locationId);
  navigateTo('book');
}

async function loadLocationDetail(locationId, showSpinner = true) {
  try {
    const res = await fetch(`${API_BASE_URL}/locations/${locationId}`);
    const data = await res.json();
    if (!data.success) throw new Error(data.message);

    state.selectedLocation = data.data;
    state.selectedSlot = null;

    // Populate Booking Header
    document.getElementById('bookAreaBadge').textContent = `${state.selectedLocation.area} · ${state.selectedLocation.city}`;
    document.getElementById('bookLocationName').textContent = state.selectedLocation.name;
    document.getElementById('bookLocationAddress').textContent = state.selectedLocation.address;
    document.getElementById('bookLocationRate').textContent = `₹${state.selectedLocation.hourlyRate}/hr`;

    renderBayMatrix();
    updateTariffSummary();
  } catch (err) {
    showToast(`Failed to load facility details: ${err.message}`, 'danger');
  }
}

function renderBayMatrix(activeFloorId = null) {
  const container = document.getElementById('bayMatrixGrid');
  const floorTabs = document.getElementById('bookingFloorTabs');
  if (!container || !state.selectedLocation) return;

  const loc = state.selectedLocation;
  const floors = loc.floors && loc.floors.length > 0 ? loc.floors : [{ id: null, floorName: 'Main Deck', slots: loc.slots }];

  // Render Floor Switcher if multiple floors
  if (floors.length > 1 && floorTabs) {
    const currentFloorId = activeFloorId || floors[0].id;
    floorTabs.innerHTML = floors.map(f => `
      <button class="btn btn-sm ${f.id === currentFloorId ? 'btn-primary' : 'btn-secondary'}" onclick="renderBayMatrix(${f.id})">
        ${f.floorName}
      </button>
    `).join('');
  } else if (floorTabs) {
    floorTabs.innerHTML = '';
  }

  const selectedFloor = activeFloorId
    ? floors.find(f => f.id === activeFloorId) || floors[0]
    : floors[0];

  const floorSlots = selectedFloor.slots || loc.slots;

  // Group slots by Row (Bay Row)
  const rowsMap = {};
  floorSlots.forEach(s => {
    const rowNum = s.bay_row || s.bayRow || 1;
    if (!rowsMap[rowNum]) rowsMap[rowNum] = [];
    rowsMap[rowNum].push(s);
  });

  container.innerHTML = Object.keys(rowsMap).map(rowKey => {
    const rowSlots = rowsMap[rowKey];
    const rowName = rowSlots[0].row_name || rowSlots[0].rowName || `Row ${rowKey}`;

    return `
      <div class="bay-row-lane">
        <div class="bay-row-header">
          <span class="bay-row-title">${rowName}</span>
          <span style="font-size: 0.75rem; color: var(--text-muted);">${rowSlots.filter(s => s.status === 'available').length} Available</span>
        </div>
        <div class="bay-grid">
          ${rowSlots.map(s => {
            const isSelected = state.selectedSlot?.id === s.id;
            const slotNo = s.slot_no || s.slotNo;
            const slotType = s.slot_type || s.slotType;
            const isAvailable = s.status === 'available';

            const typeIcons = {
              standard: '🚗',
              ev_charging: '⚡',
              accessible: '♿',
              compact: '🚙'
            };

            return `
              <div 
                class="slot-node ${isSelected ? 'selected' : s.status}" 
                onclick="${isAvailable ? `selectSlotNode(${s.id})` : ''}"
                title="${slotNo} (${slotType}) — ${s.status}"
              >
                <span class="slot-type-icon">${typeIcons[slotType] || '🚗'}</span>
                <span class="slot-no-text">${slotNo}</span>
                <span class="slot-status-text">${isSelected ? 'SELECTED' : s.status}</span>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }).join('');
}

function selectSlotNode(slotId) {
  const slot = state.selectedLocation.slots.find(s => s.id === slotId);
  if (!slot || slot.status !== 'available') return;

  state.selectedSlot = slot;
  renderBayMatrix(slot.floor_id || slot.floorId);
  updateTariffSummary();
}

function selectDuration(hours) {
  state.selectedDuration = hours;
  document.querySelectorAll('.duration-btn').forEach(btn => {
    btn.classList.toggle('active', parseInt(btn.dataset.hours, 10) === hours);
  });
  updateTariffSummary();
}

function updateTariffSummary() {
  const summarySlotNo = document.getElementById('summarySlotNo');
  const summarySlotType = document.getElementById('summarySlotType');
  const rateCalc = document.getElementById('rateCalculationText');
  const totalDisplay = document.getElementById('totalAmountDisplay');
  const proceedBtn = document.getElementById('proceedToPayBtn');

  if (!state.selectedLocation) return;

  const rate = state.selectedLocation.hourlyRate;
  const total = rate * state.selectedDuration;

  if (state.selectedSlot) {
    const slotNo = state.selectedSlot.slot_no || state.selectedSlot.slotNo;
    const slotType = state.selectedSlot.slot_type || state.selectedSlot.slotType;
    if (summarySlotNo) summarySlotNo.textContent = slotNo;
    if (summarySlotType) summarySlotType.textContent = slotType.toUpperCase();
    if (proceedBtn) proceedBtn.disabled = false;
  } else {
    if (summarySlotNo) summarySlotNo.textContent = 'Please select a bay';
    if (summarySlotType) summarySlotType.textContent = '--';
    if (proceedBtn) proceedBtn.disabled = true;
  }

  if (rateCalc) rateCalc.textContent = `₹${rate} × ${state.selectedDuration} hr(s)`;
  if (totalDisplay) totalDisplay.textContent = `₹${total}`;
}

function openPaymentModal() {
  if (!state.selectedSlot || !state.selectedLocation) {
    showToast('Please select an available parking bay first.', 'warning');
    return;
  }

  const vPlate = document.getElementById('bookingVehicleNumber').value.trim();
  const dName = document.getElementById('bookingDriverName').value.trim();
  const dPhone = document.getElementById('bookingDriverPhone').value.trim();

  if (!vPlate || !dName || !dPhone) {
    showToast('Please fill in vehicle number, driver name, and phone number.', 'warning');
    return;
  }

  const slotNo = state.selectedSlot.slot_no || state.selectedSlot.slotNo;
  const total = state.selectedLocation.hourlyRate * state.selectedDuration;

  document.getElementById('payLocationName').textContent = state.selectedLocation.name;
  document.getElementById('paySlotNo').textContent = slotNo;
  document.getElementById('payDuration').textContent = `${state.selectedDuration} Hour(s)`;
  document.getElementById('payTotalAmount').textContent = `₹${total}`;

  openModal('paymentModal');
}

async function executeBookingPayment() {
  const confirmBtn = document.getElementById('confirmPayBtn');
  if (confirmBtn) confirmBtn.disabled = true;

  const vPlate = document.getElementById('bookingVehicleNumber').value.trim();
  const dName = document.getElementById('bookingDriverName').value.trim();
  const dPhone = document.getElementById('bookingDriverPhone').value.trim();
  const payMethod = document.querySelector('input[name="payMethod"]:checked')?.value || 'upi';

  try {
    const headers = { 'Content-Type': 'application/json' };
    if (state.user?.token) headers['Authorization'] = `Bearer ${state.user.token}`;

    const res = await fetch(`${API_BASE_URL}/bookings`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        slot_id: state.selectedSlot.id,
        duration_hours: state.selectedDuration,
        vehicle_number: vPlate,
        driver_name: dName,
        driver_phone: dPhone,
        payment_method: payMethod
      })
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || 'Booking reservation failed');
    }

    closeModal('paymentModal');
    showToast('Booking Confirmed & Payment Processed!', 'success');

    // Populate Digital Pass Modal
    const b = data.data.booking;
    const p = data.data.payment;

    document.getElementById('passBookingRef').textContent = b.bookingRef;
    document.getElementById('passTxnRef').textContent = `Txn: ${p.transactionRef}`;
    document.getElementById('passFacility').textContent = state.selectedLocation.name;
    document.getElementById('passSlot').textContent = b.slotNo;
    document.getElementById('passVehicle').textContent = b.vehicleNumber;
    document.getElementById('passValidUntil').textContent = new Date(b.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    openModal('passModal');
    checkActiveCarSession();
  } catch (err) {
    showToast(err.message, 'danger');
  } finally {
    if (confirmBtn) confirmBtn.disabled = false;
  }
}

// ================= 8. FIND MY CAR & DYNAMIC WAYFINDING =================
async function checkActiveCarSession() {
  try {
    let url = `${API_BASE_URL}/bookings/active-car`;
    const headers = {};
    if (state.user?.token) headers['Authorization'] = `Bearer ${state.user.token}`;

    const res = await fetch(url, { headers });
    const data = await res.json();

    if (data.success && data.hasActiveCar) {
      state.activeSession = data.data;
      renderActiveSessionBanner();
      renderFindCarView();
    } else {
      state.activeSession = null;
      const banner = document.getElementById('activeSessionBanner');
      if (banner) banner.style.display = 'none';
      renderEmptyFindCarView();
    }
  } catch (err) {
    console.error('Active session check error:', err.message);
  }
}

async function searchCarLocation() {
  const input = document.getElementById('findCarPlateInput');
  const term = input ? input.value.trim() : '';

  if (!term) {
    showToast('Please enter a vehicle license plate number or booking reference.', 'warning');
    return;
  }

  try {
    const res = await fetch(`${API_BASE_URL}/bookings/active-car?plate=${encodeURIComponent(term)}&ref=${encodeURIComponent(term)}`);
    const data = await res.json();

    if (data.success && data.hasActiveCar) {
      state.activeSession = data.data;
      renderActiveSessionBanner();
      renderFindCarView();
      showToast(`Located vehicle ${data.data.vehicleNumber}!`, 'success');
    } else {
      showToast('No active parking session found for this vehicle/ref.', 'warning');
      renderEmptyFindCarView('No active session found matching this plate number.');
    }
  } catch (err) {
    showToast('Error locating vehicle.', 'danger');
  }
}

function renderActiveSessionBanner() {
  const banner = document.getElementById('activeSessionBanner');
  if (!banner || !state.activeSession) return;

  banner.style.display = 'block';
  document.getElementById('bannerVehicleInfo').textContent = `Vehicle: ${state.activeSession.vehicleNumber}`;
  document.getElementById('bannerSlotInfo').textContent = `${state.activeSession.locationName} · Bay ${state.activeSession.slotNo}`;
}

function updateTimerTick() {
  if (!state.activeSession) return;

  if (state.activeSession.remainingSeconds > 0) {
    state.activeSession.remainingSeconds--;
  }

  const sec = state.activeSession.remainingSeconds;
  const hrs = Math.floor(sec / 3600);
  const mins = Math.floor((sec % 3600) / 60);
  const secs = sec % 60;
  const timeStr = `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  const bannerTimer = document.getElementById('bannerTimer');
  if (bannerTimer) bannerTimer.textContent = timeStr;

  const carTimer = document.getElementById('carDetailTimer');
  if (carTimer) carTimer.textContent = timeStr;
}

function renderFindCarView() {
  const container = document.getElementById('carDetailsContainer');
  const canvas = document.getElementById('floorPlanCanvas');
  const locLabel = document.getElementById('wayfindingLocationLabel');
  const dirText = document.getElementById('directionsText');

  if (!container || !state.activeSession) return;

  const s = state.activeSession;
  if (locLabel) locLabel.textContent = `${s.locationName} · ${s.floorName} (${s.rowName})`;
  if (dirText) dirText.textContent = s.directions;

  // Render Left Session Card
  container.innerHTML = `
    <div class="card" style="padding: 1.5rem;">
      <span class="badge badge-success badge-pill" style="margin-bottom: 0.75rem;">Active Vehicle Session</span>
      <h2 style="font-size: 1.6rem; font-weight: 800; font-family: 'JetBrains Mono', monospace; color: var(--text-main); margin-bottom: 0.25rem;">${s.vehicleNumber}</h2>
      <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1.25rem;">Ref: ${s.bookingRef}</p>

      <div style="padding: 1rem; border-radius: var(--radius-md); background: var(--bg-subtle); margin-bottom: 1.25rem; font-size: 0.85rem; display: flex; flex-direction: column; gap: 0.4rem;">
        <div style="display: flex; justify-content: space-between;"><span style="color: var(--text-muted);">Facility:</span><strong>${s.locationName}</strong></div>
        <div style="display: flex; justify-content: space-between;"><span style="color: var(--text-muted);">Floor / Level:</span><strong>${s.floorName}</strong></div>
        <div style="display: flex; justify-content: space-between;"><span style="color: var(--text-muted);">Section / Row:</span><strong>${s.rowName}</strong></div>
        <div style="display: flex; justify-content: space-between;"><span style="color: var(--text-muted);">Parked Bay:</span><strong style="color: var(--primary-600); font-family: 'JetBrains Mono', monospace; font-size: 1.05rem;">${s.slotNo}</strong></div>
      </div>

      <div style="text-align: center; padding: 1.25rem; border-radius: var(--radius-md); background: var(--primary-50); border: 1px solid var(--primary-100); margin-bottom: 1.25rem;">
        <div style="font-size: 0.75rem; text-transform: uppercase; color: var(--primary-700); font-weight: 800;">Time Remaining</div>
        <div style="font-size: 2rem; font-weight: 800; font-family: 'JetBrains Mono', monospace; color: var(--primary-700);" id="carDetailTimer">--:--:--</div>
      </div>

      <div style="display: flex; gap: 0.5rem;">
        <button class="btn btn-secondary flex-1" onclick="quickExtendSession(1)">+1 Hr (₹${s.totalAmount / s.durationHours})</button>
        <button class="btn btn-primary flex-1" onclick="window.print()">Print Pass</button>
      </div>
    </div>
  `;

  // Render Dynamic Floor Wayfinding Canvas from actual structure
  if (canvas && s.floorSlots && s.floorSlots.length > 0) {
    // Group slots by row
    const rowsMap = {};
    s.floorSlots.forEach(slot => {
      const rName = slot.rowName || `Row ${slot.bayRow || 1}`;
      if (!rowsMap[rName]) rowsMap[rName] = [];
      rowsMap[rName].push(slot);
    });

    canvas.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.5rem 1rem; border-radius: var(--radius-md); background: var(--success-50); border: 1px solid var(--success-100); margin-bottom: 1rem;">
        <span style="font-size: 0.8rem; font-weight: 800; color: var(--success-700);">🚪 Main Pedestrian Gate A (Entry Point)</span>
        <span style="font-size: 0.75rem; color: var(--success-600);">Floor: ${s.floorName}</span>
      </div>

      <div style="display: flex; flex-direction: column; gap: 1rem;">
        ${Object.keys(rowsMap).map(rowName => {
          const slots = rowsMap[rowName];
          return `
            <div style="background: var(--bg-surface); padding: 1rem; border-radius: var(--radius-md); border: 1px solid var(--border-subtle);">
              <div style="font-size: 0.75rem; font-weight: 800; text-transform: uppercase; color: var(--text-muted); margin-bottom: 0.6rem;">${rowName}</div>
              <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(70px, 1fr)); gap: 0.5rem;">
                ${slots.map(slot => {
                  const isUserCar = slot.isUserSlot || slot.slotNo === s.slotNo;
                  return `
                    <div class="wayfinding-slot-card ${isUserCar ? 'user-target' : ''}">
                      <div>${isUserCar ? '🚘' : '🅿️'}</div>
                      <div>${slot.slotNo}</div>
                    </div>
                  `;
                }).join('')}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }
}

function renderEmptyFindCarView(msg = 'No active parking session found.') {
  const container = document.getElementById('carDetailsContainer');
  const canvas = document.getElementById('floorPlanCanvas');
  const locLabel = document.getElementById('wayfindingLocationLabel');
  const dirText = document.getElementById('directionsText');

  if (locLabel) locLabel.textContent = 'Awaiting Vehicle Selection';
  if (dirText) dirText.textContent = 'Enter a vehicle license plate number or booking reference above to generate indoor wayfinding directions.';

  if (container) {
    container.innerHTML = `
      <div class="card" style="padding: 2.5rem; text-align: center;">
        <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">🚗</div>
        <h4 style="font-size: 1.1rem; font-weight: 800;">No Active Car Session</h4>
        <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1.25rem;">${msg}</p>
        <button class="btn btn-primary btn-sm" onclick="navigateTo('explore')">Explore & Book Parking →</button>
      </div>
    `;
  }

  if (canvas) {
    canvas.innerHTML = `
      <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 240px; color: var(--text-dim); text-align: center;">
        <div style="font-size: 2rem; margin-bottom: 0.5rem;">🗺️</div>
        <p style="font-size: 0.85rem;">Wayfinding floor diagram will be dynamically generated once an active vehicle is located.</p>
      </div>
    `;
  }
}

async function quickExtendSession(hours = 1) {
  if (!state.activeSession) return;

  try {
    const res = await fetch(`${API_BASE_URL}/bookings/${state.activeSession.bookingId}/extend`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hours })
    });

    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message);

    showToast(`Session extended by ${hours} hr(s)!`, 'success');
    checkActiveCarSession();
  } catch (err) {
    showToast(`Extension error: ${err.message}`, 'danger');
  }
}

// ================= 9. DEMAND FORECAST & INSIGHTS =================
async function loadDemandForecast() {
  try {
    const res = await fetch(`${API_BASE_URL}/analytics/forecast`);
    const data = await res.json();
    if (data.success && data.data) {
      state.forecast = data.data;
      renderHomeForecastStrip();
    }
  } catch (e) {
    console.error('Demand forecast error:', e.message);
  }
}

function renderHomeForecastStrip() {
  const strip = document.getElementById('homeForecastStrip');
  if (!strip || !state.forecast) return;

  strip.innerHTML = state.forecast.timeWindows.map(w => `
    <div style="min-width: 150px; padding: 0.85rem; border-radius: var(--radius-md); background: ${w.isCurrent ? 'var(--primary-50)' : 'var(--bg-subtle)'}; border: 1px solid ${w.isCurrent ? 'var(--primary-500)' : 'var(--border-subtle)'}; flex-shrink: 0;">
      <div style="font-size: 0.7rem; font-weight: 700; text-transform: uppercase; color: var(--text-muted);">${w.timeWindow}</div>
      <div style="font-size: 1.1rem; font-weight: 800; font-family: 'JetBrains Mono', monospace; color: var(--text-main); margin: 0.2rem 0;">${w.loadPercentage}%</div>
      <span class="badge badge-${w.statusClass}" style="font-size: 9px;">${w.demandLevel} Demand</span>
    </div>
  `).join('');
}

async function loadDemandForecastPage() {
  await loadDemandForecast();
  if (!state.forecast) return;

  const f = state.forecast;

  // Render 4 Overview Periods (Morning, Afternoon, Evening, Night)
  const overviewGrid = document.getElementById('demandPeriodsOverview');
  if (overviewGrid && f.todayOverview) {
    const periods = ['morning', 'afternoon', 'evening', 'night'];
    overviewGrid.innerHTML = periods.map(pKey => {
      const p = f.todayOverview[pKey];
      return `
        <div class="demand-period-card">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <strong style="font-size: 0.9rem; color: var(--text-main);">${p.title}</strong>
            <span class="badge badge-${p.status}">${p.level}</span>
          </div>
          <span style="font-size: 0.75rem; color: var(--text-muted);">${p.time}</span>
          <div class="demand-meter">
            <div class="demand-meter-fill ${p.status}" style="width: ${p.load}%;"></div>
          </div>
          <span style="font-size: 0.75rem; font-weight: 700; color: var(--text-secondary);">${p.load}% Expected Load</span>
        </div>
      `;
    }).join('');
  }

  // Render Operational Windows Cards
  const cardsList = document.getElementById('forecastCardsList');
  if (cardsList && f.timeWindows) {
    cardsList.innerHTML = f.timeWindows.map(w => `
      <div style="padding: 1rem; border-radius: var(--radius-md); background: ${w.isCurrent ? 'var(--primary-50)' : 'var(--bg-subtle)'}; border: 1px solid ${w.isCurrent ? 'var(--primary-500)' : 'var(--border-subtle)'}; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.75rem;">
        <div>
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <strong style="font-size: 0.95rem; color: var(--text-main);">${w.timeWindow}</strong>
            ${w.isCurrent ? '<span class="badge badge-primary">Current Window</span>' : ''}
          </div>
          <span style="font-size: 0.8rem; color: var(--text-muted);">${w.period} · ${w.advisory}</span>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 1.25rem; font-weight: 800; font-family: 'JetBrains Mono', monospace; color: var(--text-main);">${w.loadPercentage}%</div>
          <span class="badge badge-${w.statusClass}">${w.demandLevel} Demand</span>
        </div>
      </div>
    `).join('');
  }

  // Update Summary Right Card
  document.getElementById('insightPeakHours').textContent = f.peakHours || '5:00 PM — 8:00 PM';
  document.getElementById('insightDemandMeter').textContent = `${f.expectedDemand}%`;
  document.getElementById('insightDemandBar').style.width = `${f.expectedDemand}%`;
  document.getElementById('insightAvailabilityStatus').textContent = f.availabilityOutlook || 'Limited';
  document.getElementById('insightRecommendedTime').textContent = f.recommendedArrivalTime || 'Before 4:30 PM';
}

// ================= 10. SMART RECOMMENDATIONS =================
async function loadSmartRecommendations() {
  try {
    let url = `${API_BASE_URL}/recommendations`;
    if (state.userCoords) {
      url += `?user_lat=${state.userCoords.lat}&user_lng=${state.userCoords.lng}`;
    }

    const res = await fetch(url);
    const data = await res.json();
    if (data.success && data.data) {
      renderSmartRecBanner(data.data);
    }
  } catch (e) {
    console.error('Recommendation error:', e.message);
  }
}

function renderSmartRecBanner(rec) {
  const container = document.getElementById('smartRecContainer');
  if (!container || !rec) return;

  container.innerHTML = `
    <div class="card" style="background: linear-gradient(135deg, rgba(37, 99, 235, 0.08), rgba(99, 102, 241, 0.08)); border: 1px solid var(--primary-200); padding: 1.5rem;">
      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
        <div>
          <span class="badge badge-primary badge-pill" style="margin-bottom: 0.4rem;">Top Recommended Spot</span>
          <h3 style="font-size: 1.25rem; font-weight: 800; color: var(--text-main);">${rec.name}</h3>
          <p style="font-size: 0.85rem; color: var(--text-muted); margin-top: 0.2rem;">${rec.recommendationReason || 'Optimal rate and high bay availability near destination.'}</p>
        </div>
        <div style="display: flex; align-items: center; gap: 1.25rem;">
          <div style="text-align: right;">
            <div style="font-size: 1.4rem; font-weight: 800; font-family: 'JetBrains Mono', monospace; color: var(--primary-600);">₹${rec.hourlyRate}/hr</div>
            <span style="font-size: 0.75rem; color: var(--success-600); font-weight: 700;">${rec.availableSlots} Bays Available</span>
          </div>
          <button class="btn btn-primary" onclick="startBookingLocation(${rec.id})">
            Reserve Best Bay →
          </button>
        </div>
      </div>
    </div>
  `;
}

// ================= 11. CUSTOMER BOOKINGS & REVIEWS =================
async function loadCustomerBookings() {
  const container = document.getElementById('customerBookingsList');
  if (!container) return;

  try {
    const headers = {};
    if (state.user?.token) headers['Authorization'] = `Bearer ${state.user.token}`;

    const res = await fetch(`${API_BASE_URL}/bookings/my-bookings`, { headers });
    const data = await res.json();

    if (!data.success || data.data.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 2.5rem; color: var(--text-muted);">
          <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">📋</div>
          <h4 style="font-size: 1.1rem; font-weight: 800;">No Booking History Yet</h4>
          <p style="font-size: 0.85rem; margin-bottom: 1rem;">Explore guaranteed parking spots and reserve your first space.</p>
          <button class="btn btn-primary btn-sm" onclick="navigateTo('explore')">Find Parking Spaces →</button>
        </div>
      `;
      return;
    }

    state.customerBookings = data.data;

    container.innerHTML = state.customerBookings.map(b => `
      <div class="card" style="padding: 1.25rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
        <div>
          <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.35rem;">
            <strong style="font-size: 1.05rem; color: var(--text-main);">${b.locationName}</strong>
            <span class="badge ${b.status === 'active' ? 'badge-success' : 'badge-slate'}">${b.status.toUpperCase()}</span>
          </div>
          <div style="font-size: 0.8rem; color: var(--text-muted);">
            Bay <strong style="font-family: 'JetBrains Mono', monospace; color: var(--primary-600);">${b.slotNo}</strong> · Vehicle: <strong style="font-family: 'JetBrains Mono', monospace;">${b.vehicleNumber}</strong> · Ref: ${b.bookingRef}
          </div>
          <div style="font-size: 0.75rem; color: var(--text-dim); margin-top: 0.25rem;">
            ${new Date(b.startTime).toLocaleString()} — ${new Date(b.endTime).toLocaleTimeString()}
          </div>
        </div>

        <div style="display: flex; align-items: center; gap: 0.75rem;">
          <div style="text-align: right;">
            <div style="font-size: 1.2rem; font-weight: 800; font-family: 'JetBrains Mono', monospace; color: var(--success-600);">₹${b.totalAmount}</div>
            <span style="font-size: 0.75rem; color: var(--text-muted);">${b.durationHours} hr(s)</span>
          </div>

          ${b.status === 'active' ? `
            <button class="btn btn-primary btn-sm" onclick="navigateTo('find-car')">Wayfinding</button>
          ` : b.status === 'completed' && !b.hasReviewed ? `
            <button class="btn btn-outline-primary btn-sm" onclick="openReviewModal(${b.id}, ${b.locationId})">Rate ★</button>
          ` : b.hasReviewed ? `
            <span class="badge badge-warning">⭐ ${b.rating}/5</span>
          ` : ''}
        </div>
      </div>
    `).join('');
  } catch (err) {
    container.innerHTML = '<div style="text-align: center; color: var(--danger-600); padding: 1rem;">Failed to load booking history.</div>';
  }
}

function openReviewModal(bookingId, locationId) {
  document.getElementById('reviewBookingId').value = bookingId;
  document.getElementById('reviewLocationId').value = locationId;
  document.getElementById('reviewComment').value = '';
  setRating(5);
  openModal('reviewModal');
}

let selectedRating = 5;
function setRating(star) {
  selectedRating = star;
  document.querySelectorAll('.star-btn').forEach(btn => {
    const s = parseInt(btn.dataset.star, 10);
    btn.className = `btn btn-sm star-btn ${s <= star ? 'btn-primary' : 'btn-secondary'}`;
  });
}

async function handleReviewSubmit(e) {
  e.preventDefault();
  const bookingId = document.getElementById('reviewBookingId').value;
  const locationId = document.getElementById('reviewLocationId').value;
  const comment = document.getElementById('reviewComment').value.trim();

  try {
    const headers = { 'Content-Type': 'application/json' };
    if (state.user?.token) headers['Authorization'] = `Bearer ${state.user.token}`;

    const res = await fetch(`${API_BASE_URL}/reviews`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        booking_id: bookingId,
        parking_location_id: locationId,
        rating: selectedRating,
        comment
      })
    });

    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message);

    closeModal('reviewModal');
    showToast('Thank you for your rating!', 'success');
    loadCustomerBookings();
  } catch (err) {
    showToast(err.message, 'danger');
  }
}

// ================= 12. OWNER DASHBOARD & MANAGEMENT =================
async function loadOwnerDashboard(triggerStats = true) {
  if (state.user?.role !== 'owner') return;

  try {
    const headers = { 'Authorization': `Bearer ${state.user.token}` };

    const [statsRes, bookingsRes] = await Promise.all([
      fetch(`${API_BASE_URL}/dashboard/stats`, { headers }),
      fetch(`${API_BASE_URL}/bookings/owner-bookings?limit=10`, { headers })
    ]);

    const statsData = await statsRes.json();
    const bookingsData = await bookingsRes.json();

    if (statsData.success && statsData.data.ownerStats) {
      const o = statsData.data.ownerStats;
      document.getElementById('ownerKpiRevenue').textContent = `₹${o.totalEarnings}`;
      document.getElementById('ownerKpiOccupancy').textContent = `${o.overallOccupancyPct}%`;
      document.getElementById('ownerKpiTotalBookings').textContent = o.totalBookings;
      document.getElementById('ownerKpiRating').textContent = `${o.avgRating} ★`;
    }

    if (bookingsData.success) {
      state.ownerBookings = bookingsData.data;
      renderOwnerRecentBookings();
    }
  } catch (err) {
    console.error('Owner dashboard error:', err.message);
  }
}

function renderOwnerRecentBookings() {
  const tbody = document.getElementById('ownerRecentBookingsBody');
  if (!tbody) return;

  if (state.ownerBookings.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--text-dim); padding: 2rem;">No customer bookings recorded yet.</td></tr>';
    return;
  }

  tbody.innerHTML = state.ownerBookings.slice(0, 8).map(b => `
    <tr>
      <td><strong style="font-family: 'JetBrains Mono', monospace; color: var(--primary-600);">${b.bookingRef}</strong></td>
      <td>
        <strong>${b.driverName}</strong><br>
        <span style="font-size: 0.75rem; color: var(--text-muted); font-family: 'JetBrains Mono', monospace;">${b.vehicleNumber}</span>
      </td>
      <td>
        ${b.locationName}<br>
        <span class="badge badge-slate font-mono">Bay ${b.slotNo}</span>
      </td>
      <td style="font-size: 0.75rem;">
        ${new Date(b.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} — ${new Date(b.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </td>
      <td style="font-weight: 800; font-family: 'JetBrains Mono', monospace; color: var(--success-600);">₹${b.totalAmount}</td>
      <td>
        <span class="badge ${b.status === 'active' ? 'badge-success' : b.status === 'completed' ? 'badge-slate' : 'badge-danger'}">
          ${b.status.toUpperCase()}
        </span>
      </td>
      <td>
        ${b.status === 'active' ? `
          <button class="btn btn-outline-primary btn-sm" onclick="ownerUpdateBookingStatus(${b.id}, 'completed')">
            Mark Exit / Complete
          </button>
        ` : `
          <span style="font-size: 0.75rem; color: var(--text-dim);">Done</span>
        `}
      </td>
    </tr>
  `).join('');
}

async function ownerUpdateBookingStatus(bookingId, status) {
  try {
    const res = await fetch(`${API_BASE_URL}/bookings/${bookingId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${state.user.token}`
      },
      body: JSON.stringify({ status })
    });

    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message);

    showToast(`Booking #${bookingId} marked as ${status}!`, 'success');
    loadOwnerDashboard();
    if (state.currentPage === 'owner-bookings') loadOwnerBookings();
    if (state.currentPage === 'owner-spaces') loadOwnerSpaces();
  } catch (err) {
    showToast(err.message, 'danger');
  }
}

async function loadOwnerSpaces() {
  const container = document.getElementById('ownerSpacesList');
  if (!container) return;

  try {
    const res = await fetch(`${API_BASE_URL}/locations/owner/my-locations`, {
      headers: { 'Authorization': `Bearer ${state.user.token}` }
    });

    const data = await res.json();
    if (!data.success) throw new Error(data.message);

    state.ownerSpaces = data.data;

    if (state.ownerSpaces.length === 0) {
      container.innerHTML = `
        <div class="card" style="padding: 2rem; text-align: center;">
          <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1rem;">You haven't listed any parking facilities yet.</p>
          <button class="btn btn-primary btn-sm" onclick="openAddSpaceModal()">+ Add First Facility</button>
        </div>
      `;
      return;
    }

    container.innerHTML = state.ownerSpaces.map((loc, idx) => `
      <div 
        class="card card-hover" 
        style="padding: 1rem; cursor: pointer; border-left: 4px solid ${state.ownerActiveSpace?.id === loc.id ? 'var(--primary-600)' : 'transparent'};"
        onclick="selectOwnerSpace(${loc.id})"
      >
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.25rem;">
          <h4 style="font-size: 1rem; font-weight: 800; color: var(--text-main);">${loc.name}</h4>
          <span class="badge badge-primary">₹${loc.hourlyRate}/hr</span>
        </div>
        <p style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 0.5rem;">${loc.address}, ${loc.city}</p>
        <div style="display: flex; justify-content: space-between; font-size: 0.75rem; font-weight: 700;">
          <span style="color: var(--success-600);">${loc.availableSlots}/${loc.totalCapacity} Available</span>
          <span style="color: var(--primary-600);">${loc.occupancyRate}% Occupied</span>
        </div>
      </div>
    `).join('');

    if (!state.ownerActiveSpace && state.ownerSpaces.length > 0) {
      selectOwnerSpace(state.ownerSpaces[0].id);
    }
  } catch (err) {
    container.innerHTML = `<div style="color: var(--danger-600); padding: 1rem;">Failed to load spaces: ${err.message}</div>`;
  }
}

async function selectOwnerSpace(locationId) {
  try {
    const res = await fetch(`${API_BASE_URL}/locations/${locationId}`);
    const data = await res.json();
    if (!data.success) throw new Error(data.message);

    state.ownerActiveSpace = data.data;

    document.getElementById('ownerEditorTitle').textContent = `Slot Controls: ${state.ownerActiveSpace.name}`;
    renderOwnerSlotGrid();
  } catch (err) {
    showToast('Failed to load space slot details.', 'danger');
  }
}

function renderOwnerSlotGrid() {
  const container = document.getElementById('ownerSlotEditorGrid');
  if (!container || !state.ownerActiveSpace) return;

  const slots = state.ownerActiveSpace.slots || [];

  container.innerHTML = `
    <p style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 1rem;">
      Click any bay below to toggle its operational state between <strong>Available</strong>, <strong>Occupied</strong>, and <strong>Maintenance</strong>.
    </p>
    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(80px, 1fr)); gap: 0.75rem;">
      ${slots.map(s => {
        const typeIcons = { standard: '🚗', ev_charging: '⚡', accessible: '♿', compact: '🚙' };
        return `
          <div 
            class="slot-node ${s.status}"
            onclick="ownerToggleSlotStatus(${s.id}, '${s.status}')"
            title="Click to toggle status for ${s.slot_no}"
          >
            <span class="slot-type-icon">${typeIcons[s.slot_type] || '🚗'}</span>
            <span class="slot-no-text">${s.slot_no}</span>
            <span class="slot-status-text">${s.status}</span>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

async function ownerToggleSlotStatus(slotId, currentStatus) {
  const nextStatusMap = {
    available: 'occupied',
    occupied: 'maintenance',
    maintenance: 'available',
    reserved: 'available'
  };
  const newStatus = nextStatusMap[currentStatus] || 'available';

  try {
    const res = await fetch(`${API_BASE_URL}/slots/${slotId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${state.user.token}`
      },
      body: JSON.stringify({ status: newStatus })
    });

    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message);

    showToast(`Slot status updated to ${newStatus}!`, 'success');
    if (state.ownerActiveSpace) {
      selectOwnerSpace(state.ownerActiveSpace.id);
    }
  } catch (err) {
    showToast(`Status update failed: ${err.message}`, 'danger');
  }
}

async function loadOwnerBookings() {
  const tbody = document.getElementById('ownerAllBookingsBody');
  if (!tbody) return;

  try {
    const res = await fetch(`${API_BASE_URL}/bookings/owner-bookings`, {
      headers: { 'Authorization': `Bearer ${state.user.token}` }
    });

    const data = await res.json();
    if (!data.success) throw new Error(data.message);

    state.ownerBookings = data.data;

    if (state.ownerBookings.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--text-dim); padding: 2rem;">No customer reservations yet.</td></tr>';
      return;
    }

    tbody.innerHTML = state.ownerBookings.map(b => `
      <tr>
        <td><strong style="font-family: 'JetBrains Mono', monospace; color: var(--primary-600);">${b.bookingRef}</strong></td>
        <td>
          <strong>${b.driverName}</strong><br>
          <span style="font-size: 0.75rem; color: var(--text-muted);">${b.driverPhone}</span><br>
          <span class="badge badge-slate font-mono">${b.vehicleNumber}</span>
        </td>
        <td>
          ${b.locationName}<br>
          <strong style="color: var(--primary-600);">Bay ${b.slotNo}</strong>
        </td>
        <td style="font-size: 0.75rem;">
          ${new Date(b.startTime).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })} — ${new Date(b.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </td>
        <td style="font-weight: 800; font-family: 'JetBrains Mono', monospace; color: var(--success-600);">₹${b.totalAmount}</td>
        <td>
          <span class="badge ${b.status === 'active' ? 'badge-success' : b.status === 'completed' ? 'badge-slate' : 'badge-danger'}">
            ${b.status.toUpperCase()}
          </span>
        </td>
        <td>
          ${b.status === 'active' ? `
            <button class="btn btn-primary btn-sm" onclick="ownerUpdateBookingStatus(${b.id}, 'completed')">
              Check-Out / Exit
            </button>
          ` : `
            <span style="font-size: 0.75rem; color: var(--text-dim);">Concluded</span>
          `}
        </td>
      </tr>
    `).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7" style="color: var(--danger-600); padding: 1rem;">Failed to load bookings: ${err.message}</td></tr>`;
  }
}

async function loadOwnerEarnings() {
  const container = document.getElementById('ownerEarningsFacilityList');
  if (!container) return;

  try {
    const res = await fetch(`${API_BASE_URL}/locations/owner/my-locations`, {
      headers: { 'Authorization': `Bearer ${state.user.token}` }
    });

    const data = await res.json();
    if (!data.success) throw new Error(data.message);

    const locations = data.data;
    const totalEarned = locations.reduce((acc, l) => acc + (l.totalEarnings || 0), 0);
    document.getElementById('ownerSettledAmount').textContent = `₹${totalEarned.toLocaleString()}`;

    if (locations.length === 0) {
      container.innerHTML = '<div style="color: var(--text-dim); text-align: center; padding: 2rem;">No facility earnings recorded yet.</div>';
      return;
    }

    container.innerHTML = locations.map(loc => `
      <div style="padding: 1rem; border-radius: var(--radius-md); background: var(--bg-subtle); display: flex; justify-content: space-between; align-items: center;">
        <div>
          <strong style="font-size: 0.95rem; color: var(--text-main);">${loc.name}</strong>
          <span style="display: block; font-size: 0.75rem; color: var(--text-muted);">${loc.area} · ${loc.totalBookings} Total Bookings</span>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 1.25rem; font-weight: 800; font-family: 'JetBrains Mono', monospace; color: var(--success-600);">₹${loc.totalEarnings || 0}</div>
          <span style="font-size: 0.75rem; color: var(--text-muted);">${loc.availableSlots}/${loc.totalCapacity} bays</span>
        </div>
      </div>
    `).join('');
  } catch (err) {
    container.innerHTML = `<div style="color: var(--danger-600); padding: 1rem;">Error loading earnings.</div>`;
  }
}

function openAddSpaceModal() {
  openModal('addSpaceModal');
}

async function handleAddSpaceSubmit(e) {
  e.preventDefault();

  const payload = {
    name: document.getElementById('newSpaceName').value.trim(),
    area: document.getElementById('newSpaceArea').value.trim(),
    city: document.getElementById('newSpaceCity').value.trim() || 'Coimbatore',
    state: document.getElementById('newSpaceState').value.trim() || 'Tamil Nadu',
    country: document.getElementById('newSpaceCountry').value.trim() || 'India',
    address: document.getElementById('newSpaceAddress').value.trim(),
    hourly_rate: parseFloat(document.getElementById('newSpaceRate').value),
    total_capacity: parseInt(document.getElementById('newSpaceCapacity').value, 10),
    opening_time: document.getElementById('newSpaceOpen').value,
    closing_time: document.getElementById('newSpaceClose').value,
    latitude: parseFloat(document.getElementById('newSpaceLat').value),
    longitude: parseFloat(document.getElementById('newSpaceLng').value),
    is_covered: document.getElementById('newSpaceCovered').checked,
    has_ev: document.getElementById('newSpaceEv').checked,
    is_24_7: document.getElementById('newSpace247').checked,
    is_accessible: document.getElementById('newSpaceAccessible').checked
  };

  try {
    const res = await fetch(`${API_BASE_URL}/locations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${state.user.token}`
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message || 'Failed to list parking facility');

    closeModal('addSpaceModal');
    showToast(`Facility '${payload.name}' listed with ${payload.total_capacity} generated bays!`, 'success');
    loadOwnerSpaces();
    loadOwnerDashboard();
  } catch (err) {
    showToast(err.message, 'danger');
  }
}

// ================= 13. NOTIFICATIONS =================
async function loadNotifications() {
  try {
    const headers = {};
    if (state.user?.token) headers['Authorization'] = `Bearer ${state.user.token}`;

    const res = await fetch(`${API_BASE_URL}/notifications`, { headers });
    const data = await res.json();
    if (data.success) {
      state.notifications = data.data;
      renderNotifications();
    }
  } catch (e) {
    console.error('Notification error:', e.message);
  }
}

function renderNotifications() {
  const list = document.getElementById('notificationsList');
  if (!list) return;

  if (state.notifications.length === 0) {
    list.innerHTML = '<div style="padding: 1rem; text-align: center; font-size: 0.8rem; color: var(--text-dim);">No alerts</div>';
    return;
  }

  list.innerHTML = state.notifications.map(n => `
    <div style="padding: 0.65rem 0.85rem; border-bottom: 1px solid var(--border-subtle); font-size: 0.8rem; background: ${n.isRead ? 'transparent' : 'var(--primary-50)'};">
      <strong style="display: block; color: var(--text-main); font-size: 0.825rem;">${n.title}</strong>
      <span style="color: var(--text-secondary); font-size: 0.775rem;">${n.message}</span>
      <span style="display: block; font-size: 0.7rem; color: var(--text-dim); margin-top: 2px;">${new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
    </div>
  `).join('');
}

async function markAllNotificationsRead() {
  try {
    const headers = {};
    if (state.user?.token) headers['Authorization'] = `Bearer ${state.user.token}`;

    await fetch(`${API_BASE_URL}/notifications/read-all`, { method: 'PUT', headers });
    state.notifications.forEach(n => n.isRead = true);
    renderNotifications();
  } catch (e) {
    console.error('Mark read error:', e.message);
  }
}