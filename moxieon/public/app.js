/* MoxieOn Frontend Application — Node.js REST API + Seamless Offline/File Fallback */
const IMAGE_MAP = {
  hero: 'images/hero.jpg',
  hiphop: 'images/hiphop.jpg',
  orchestral: 'images/orchestral.jpg',
  indie: 'images/indie.jpg',
  dj: 'images/dj.jpg'
};

const ALL_INTERESTS = ['Hip-Hop', 'Orchestral', 'Indie Singer', 'DJ & Electronic', 'Jazz & Soul', 'Acoustic'];
const ARTISTS_TO_SPONSOR = [
  'Ananya Rao (Indie Singer)',
  'Rohan Varma (Modular Synth)',
  'Kavya Iyer (Solo Violin)',
  'Paal Dabba (Hip-Hop MC)',
  'Tanya Nambiar (Deep House DJ)'
];
const SEAT_LAYOUT = [
  'A1','A2','A3','A4','A5','A6','A7','A8',
  'B1','B2','B3','B4','B5','B6','B7','B8'
];
const SOLD_SEATS = new Set(['A4', 'A5', 'B3']);

const state = {
  user: null,
  events: [],
  snacks: [],
  bookings: [],
  sponsors: [],
  currentView: 'home',
  selectedEventId: null,
  sortMode: 'Recommended',
  listMode: false,
  countdownTimer: null,
  holdTimer: null,
  holdSeconds: 600,
  audioCtx: null,
  activeMixId: null,
  bookingDraft: null
};

// ---------- Helpers ----------
function esc(str) {
  return String(str || '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

function fmtINR(num) {
  return '₹' + Number(num || 0).toLocaleString('en-IN');
}

function fmtDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) +
    ' • ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

function showToast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), 3400);
}

// ---------- Fallback Local Store (for file:// or Canvas standalone) ----------
const LOCAL_SEED = {
  users: [{
    id: 'usr_demo_1', name: 'Arathana N.', email: 'arathana@moxieon.in',
    phone: '+91 98401 23456', city: 'Chennai',
    interests: ['Indie Singer', 'Orchestral', 'DJ & Electronic'],
    onboardingComplete: true, attendedEventIds: ['evt_past_1', 'evt_past_2'],
    savedEventIds: ['evt_1', 'evt_3']
  }],
  events: [
    {
      id: 'evt_1', status: 'upcoming', title: 'Midnight Symphony: Strings & Synth',
      category: 'Orchestral', artist: 'Madras Chamber Collective', city: 'Chennai',
      venue: 'Sir Mutha Venkatasubba Rao Concert Hall', date: '2026-12-18T19:30:00+05:30',
      priceMin: 1199, priceMax: 4999, rating: 4.9, reviewsCount: 342, noServiceFee: true,
      badge: 'Recommended', imageKey: 'orchestral',
      description: 'A 45-piece contemporary orchestra meets analog modular synthesizers in an acoustic-engineered hall bathed in soothing indigo light.',
      highlights: ['45-piece live philharmonic ensemble with spatial 360-degree acoustics', 'Custom analog synth arrangements of timeless cinema & classical motifs', 'Express lounge access with pre-ordered artisanal snacks & cold brews'],
      lineup: [{ name: 'Madras Chamber Collective', role: 'Lead Orchestra', time: '7:30 PM' }, { name: 'Rohan Varma', role: 'Modular Synth', time: '8:45 PM' }, { name: 'Kavya Iyer', role: 'Solo Violin', time: '9:30 PM' }],
      tiers: [{ id: 'gen', name: 'General Balcony', price: 1199, perks: 'Standard acoustic seating' }, { id: 'vip', name: 'VIP Orchestra Pit', price: 2999, perks: 'Front 5 rows + Priority snack lane' }, { id: 'grp', name: 'Group Pass (4)', price: 4299, perks: '4 adjacent balcony seats + 15% off' }]
    },
    {
      id: 'evt_2', status: 'upcoming', title: '808 Drift: Underground Hip-Hop Live',
      category: 'Hip-Hop', artist: 'KRSNA & Karma ft. MC Altaf', city: 'Bengaluru',
      venue: 'Jayamahal Palace Grounds', date: '2026-12-12T18:30:00+05:30',
      priceMin: 899, priceMax: 3999, rating: 4.8, reviewsCount: 518, noServiceFee: false,
      badge: 'Popular', imageKey: 'hiphop',
      description: 'High-precision lyricism, booming 808s, and a live cypher pit under the open Bengaluru night sky.',
      highlights: ['Back-to-back headliner sets with live brass & drumline backing', 'Open-air freestyle cypher zone starting at 6:30 PM', 'Zero-wait digital QR entry and pre-booked snack pickup counters'],
      lineup: [{ name: 'KRSNA', role: 'Headliner', time: '9:30 PM' }, { name: 'MC Altaf', role: 'Guest Rapper', time: '8:15 PM' }, { name: 'DJ Proof', role: 'Turntablist', time: '7:00 PM' }],
      tiers: [{ id: 'gen', name: 'General Standing', price: 899, perks: 'Main arena floor access' }, { id: 'vip', name: 'VIP Fan Pit', price: 2199, perks: 'Stage-front pit + merch badge' }, { id: 'grp', name: 'Squad Pass (4)', price: 3299, perks: '4 General passes + express gate' }]
    },
    {
      id: 'evt_3', status: 'upcoming', title: 'Velvet Horizon: Indie Voices Unplugged',
      category: 'Indie Singer', artist: 'Prateek Kuhad & When Chai Met Toast', city: 'Chennai',
      venue: 'YMCA Nandanam Open Air Arena', date: '2026-12-26T18:00:00+05:30',
      priceMin: 1499, priceMax: 5499, rating: 4.9, reviewsCount: 624, noServiceFee: true,
      badge: 'New', imageKey: 'indie',
      description: 'An intimate sunset-to-starlight indie showcase featuring soulful acoustic storytelling, warm harmonies, and dreamy stage visuals.',
      highlights: ['Extended 90-minute sunset acoustic & full-band sets', 'Curated indie vinyl & merch pop-up village', 'Soothing lantern-lit picnic lawn seating with pre-order snacks'],
      lineup: [{ name: 'Prateek Kuhad', role: 'Headliner', time: '8:45 PM' }, { name: 'When Chai Met Toast', role: 'Co-Headliner', time: '7:15 PM' }, { name: 'Ananya Rao', role: 'Indie Opener', time: '6:15 PM' }],
      tiers: [{ id: 'gen', name: 'Lawn Pass', price: 1499, perks: 'Open-air lawn access' }, { id: 'vip', name: 'Starlight Lounge', price: 3199, perks: 'Elevated deck + 1 complimentary drink' }, { id: 'grp', name: 'Group Pass (4)', price: 5199, perks: '4 Lawn passes + reserved mat zone' }]
    },
    {
      id: 'evt_4', status: 'upcoming', title: 'Solstice Pulse: Deep House & Melodic DJ Night',
      category: 'DJ & Electronic', artist: 'Nucleya & Lost Stories', city: 'Goa',
      venue: 'Vagator Hilltop Amphitheatre', date: '2026-12-30T17:00:00+05:30',
      priceMin: 1999, priceMax: 7999, rating: 4.7, reviewsCount: 890, noServiceFee: false,
      badge: 'Deals', imageKey: 'dj',
      description: 'Hypnotic melodic techno, bass-heavy drops, and laser-mapped coastal cliffs as we count down toward the new year.',
      highlights: ['8-hour continuous sunset-to-midnight electronic journey', 'Synchronized indigo-violet laser & projection mapping', 'Cashless QR wristband + pre-ordered food & hydration bar'],
      lineup: [{ name: 'Nucleya', role: 'Headliner DJ', time: '11:00 PM' }, { name: 'Lost Stories', role: 'Melodic Set', time: '9:00 PM' }, { name: 'Tanya Nambiar', role: 'Deep House', time: '7:00 PM' }],
      tiers: [{ id: 'gen', name: 'General Access', price: 1999, perks: 'Full festival grounds' }, { id: 'vip', name: 'VIP Sunset Deck', price: 4499, perks: 'Elevated stage view + fast-track' }, { id: 'grp', name: 'Festival Pack (4)', price: 7199, perks: '4 General passes + express entry' }]
    },
    {
      id: 'evt_5', status: 'upcoming', title: 'Blue Note Courtyard: Neo-Soul & Jazz Quartet',
      category: 'Indie Singer', artist: 'Mali & The Velvet Brass', city: 'Mumbai',
      venue: 'Royal Opera House Courtyard', date: '2026-12-20T20:00:00+05:30',
      priceMin: 799, priceMax: 2799, rating: 4.8, reviewsCount: 215, noServiceFee: true,
      badge: 'Recommended', imageKey: 'indie',
      description: 'Warm saxophone riffs, neo-soul vocals, and candlelit heritage courtyard acoustics in the heart of Mumbai.',
      highlights: ['Intimate 400-seat heritage courtyard setting', 'Live horn section + improvisation encore', 'Artisanal coffee & snack pre-order delivered to lounge'],
      lineup: [{ name: 'Mali', role: 'Vocals & Keys', time: '8:30 PM' }, { name: 'The Velvet Brass', role: 'Live Quartet', time: '8:00 PM' }],
      tiers: [{ id: 'gen', name: 'Courtyard Seat', price: 799, perks: 'Reserved courtyard chair' }, { id: 'vip', name: 'Royal Box', price: 2499, perks: 'Front-row table + meet & greet' }]
    },
    {
      id: 'evt_6', status: 'upcoming', title: 'MoxieOn Bass Arena: Hip-Hop & Trap Showcase',
      category: 'Hip-Hop', artist: 'Divine & Hanumankind', city: 'Chennai',
      venue: 'Island Grounds Dome', date: '2027-01-09T19:00:00+05:30',
      priceMin: 999, priceMax: 4499, rating: 4.9, reviewsCount: 410, noServiceFee: true,
      badge: 'Popular', imageKey: 'hiphop',
      description: 'Two powerhouse Indian hip-hop icons unite on a 360-degree center stage with custom sub-bass arrays.',
      highlights: ['360-degree center stage with unobstructed sightlines', 'Special guest appearances by emerging Chennai MCs', 'Instant digital QR pass & pre-ordered arena snacks'],
      lineup: [{ name: 'Divine', role: 'Co-Headliner', time: '10:00 PM' }, { name: 'Hanumankind', role: 'Co-Headliner', time: '8:30 PM' }, { name: 'Paal Dabba', role: 'Local Special', time: '7:30 PM' }],
      tiers: [{ id: 'gen', name: 'Arena Floor', price: 999, perks: 'Standing floor access' }, { id: 'vip', name: 'Gold Circle', price: 2599, perks: 'Inner ring + priority entry' }, { id: 'grp', name: 'Crew Pack (4)', price: 3699, perks: '4 Arena passes' }]
    },
    {
      id: 'evt_past_1', status: 'past', title: 'Echoes of Marina: 2025 Symphony Under Stars',
      category: 'Orchestral', artist: 'A.R. Rahman Ensemble & Symphony', city: 'Chennai',
      venue: 'Nehru Indoor Stadium', date: '2025-11-14T19:00:00+05:30',
      priceMin: 1500, rating: 4.98, reviewsCount: 4820, attendance: '18,400+ Attendees', imageKey: 'orchestral',
      description: 'Voted MoxieOn Best Event Ever — a sold-out 18,000-strong symphonic tribute blending classical strings, choir, and spatial surround audio.'
    },
    {
      id: 'evt_past_2', status: 'past', title: 'Neon Monsoon: Midnight Electronic Odyssey',
      category: 'DJ & Electronic', artist: 'Ritviz, KSHMR & Nucleya', city: 'Bengaluru',
      venue: 'Manpho Convention Grounds', date: '2026-02-21T18:00:00+05:30',
      priceMin: 1299, rating: 4.92, reviewsCount: 3190, attendance: '12,200+ Attendees', imageKey: 'dj',
      description: 'An unforgettable rain-kissed electronic festival featuring synchronized drone light formations and 6 hours of non-stop melodic drops.'
    },
    {
      id: 'evt_past_3', status: 'past', title: 'Indie Roots & Rooftops Festival 2026',
      category: 'Indie Singer', artist: 'Anuv Jain, Lucky Ali & The Local Train', city: 'Mumbai',
      venue: 'Mahalaxmi Racecourse', date: '2026-04-05T17:30:00+05:30',
      priceMin: 999, rating: 4.95, reviewsCount: 2740, attendance: '9,800+ Attendees', imageKey: 'indie',
      description: 'Three generations of independent Indian songwriting united on one sunlit-to-moonlit stage with acoustic sing-alongs.'
    }
  ],
  snacks: [
    { id: 'snk_1', name: 'Classic Sea-Salt Popcorn', price: 180, category: 'Snacks', tag: 'Veg', prep: 'Ready at Gate B' },
    { id: 'snk_2', name: 'Loaded Peri-Peri Nachos', price: 260, category: 'Snacks', tag: 'Veg', prep: 'Warm cheese dip' },
    { id: 'snk_3', name: 'Smoked Chicken Sliders (2pc)', price: 320, category: 'Bites', tag: 'Non-Veg', prep: 'Express counter' },
    { id: 'snk_4', name: 'Iced Lavender Cold Brew', price: 210, category: 'Drinks', tag: 'Signature', prep: 'Chilled' },
    { id: 'snk_5', name: 'Sparkling Berry & Mint Cooler', price: 160, category: 'Drinks', tag: 'Zero Sugar', prep: 'Chilled' },
    { id: 'snk_6', name: 'Truffle Fries & Herb Mayo', price: 240, category: 'Bites', tag: 'Veg', prep: 'Fresh batch' }
  ],
  bookings: [
    {
      id: 'BK-904821', userId: 'usr_demo_1', eventId: 'evt_1',
      eventTitle: 'Midnight Symphony: Strings & Synth', venue: 'Sir Mutha Venkatasubba Rao Concert Hall, Chennai',
      eventDate: '2026-12-18T19:30:00+05:30', tierName: 'VIP Orchestra Pit', seats: ['A3', 'A4'], quantity: 2,
      snacks: [{ id: 'snk_2', name: 'Loaded Peri-Peri Nachos', qty: 1, price: 260 }, { id: 'snk_4', name: 'Iced Lavender Cold Brew', qty: 2, price: 210 }],
      paymentMethod: 'UPI (GPay)', discount: 0, totalAmount: 6678, status: 'Confirmed'
    },
    {
      id: 'BK-773109', userId: 'usr_demo_1', eventId: 'evt_past_1',
      eventTitle: 'Echoes of Marina: 2025 Symphony Under Stars', venue: 'Nehru Indoor Stadium, Chennai',
      eventDate: '2025-11-14T19:00:00+05:30', tierName: 'General Balcony', seats: ['B6', 'B7'], quantity: 2,
      snacks: [], paymentMethod: 'Debit Card', discount: 0, totalAmount: 3000, status: 'Attended'
    }
  ],
  sponsors: [
    { id: 'spn_1', sponsorName: 'Velvet Audio Labs', targetType: 'Event', targetName: 'Midnight Symphony: Strings & Synth', tier: 'Gold Stage Partner', amount: 25000, message: 'Powering spatial sound for independent orchestral creators.' },
    { id: 'spn_2', sponsorName: 'Kiran & Co. Studio', targetType: 'Artist', targetName: 'Ananya Rao (Indie Singer)', tier: 'Silver Patron', amount: 10000, message: 'Supporting emerging indie acoustic voices in South India.' },
    { id: 'spn_3', sponsorName: 'BrewCraft Roasters', targetType: 'Event', targetName: 'Velvet Horizon: Indie Voices Unplugged', tier: 'Supporter', amount: 2500, message: 'Keeping the acoustic lounge caffeinated and cozy.' }
  ]
};

let MEM_DB = JSON.parse(JSON.stringify(LOCAL_SEED));
let MEM_UID = null;
try {
  const saved = localStorage.getItem('moxieon_db');
  if (saved) MEM_DB = JSON.parse(saved);
  MEM_UID = localStorage.getItem('moxieon_uid');
} catch {}

function saveLocal() {
  try {
    localStorage.setItem('moxieon_db', JSON.stringify(MEM_DB));
    if (MEM_UID) localStorage.setItem('moxieon_uid', MEM_UID);
    else localStorage.removeItem('moxieon_uid');
  } catch {}
}

function localApi(url, opts = {}) {
  const body = opts.body ? JSON.parse(opts.body) : {};
  if (url === '/api/events') return { events: MEM_DB.events, snacks: MEM_DB.snacks };
  if (url === '/api/sponsors' && (!opts.method || opts.method === 'GET')) return { sponsors: MEM_DB.sponsors };
  if (url === '/api/sponsors' && opts.method === 'POST') {
    const entry = { id: 'spn_' + Date.now(), ...body };
    MEM_DB.sponsors.unshift(entry);
    saveLocal();
    return { sponsor: entry };
  }
  if (url === '/api/auth/me') {
    const u = MEM_DB.users.find(x => x.id === MEM_UID);
    if (!u) throw new Error('Not signed in');
    return { user: u };
  }
  if (url === '/api/auth/login') {
    const email = String(body.email || '').trim().toLowerCase();
    const u = MEM_DB.users.find(x => x.email === email) || (email === 'arathana@moxieon.in' ? MEM_DB.users[0] : null);
    if (!u) throw new Error('No account found with that email. Create one or use Demo Login!');
    MEM_UID = u.id;
    saveLocal();
    return { user: u };
  }
  if (url === '/api/auth/register') {
    const name = String(body.name || '').trim();
    const email = String(body.email || '').trim().toLowerCase();
    const pass = String(body.password || '');
    if (!name || !email.includes('@') || pass.length < 4) {
      throw new Error('Please enter your name, a valid email, and a 4+ character password.');
    }
    if (MEM_DB.users.some(x => x.email === email)) {
      throw new Error('An account with this email already exists. Try signing in!');
    }
    const u = {
      id: 'usr_' + Date.now(), name, email,
      city: body.city || 'Chennai', interests: [], onboardingComplete: false,
      attendedEventIds: [], savedEventIds: []
    };
    MEM_DB.users.push(u);
    MEM_UID = u.id;
    saveLocal();
    return { user: u };
  }
  if (url === '/api/auth/logout') { MEM_UID = null; saveLocal(); return { ok: true }; }
  if (url === '/api/user/preferences') {
    const u = MEM_DB.users.find(x => x.id === MEM_UID);
    if (!u) throw new Error('Please sign in first');
    if (Array.isArray(body.interests)) { u.interests = body.interests; u.onboardingComplete = true; }
    if (body.city) u.city = body.city;
    if (body.toggleSavedEventId) {
      if (u.savedEventIds.includes(body.toggleSavedEventId)) u.savedEventIds = u.savedEventIds.filter(i => i !== body.toggleSavedEventId);
      else u.savedEventIds.push(body.toggleSavedEventId);
    }
    saveLocal();
    return { user: u };
  }
  if (url === '/api/bookings' && (!opts.method || opts.method === 'GET')) {
    return { bookings: MEM_DB.bookings.filter(b => b.userId === MEM_UID) };
  }
  if (url === '/api/bookings' && opts.method === 'POST') {
    const ev = MEM_DB.events.find(e => e.id === body.eventId);
    const tier = ev.tiers.find(t => t.id === body.tierId);
    const snacks = (body.snacks || []).map(s => {
      const ref = MEM_DB.snacks.find(x => x.id === s.id);
      return { id: ref.id, name: ref.name, qty: s.qty, price: ref.price };
    });
    const tSub = tier.price * body.quantity;
    const sSub = snacks.reduce((a, b) => a + b.price * b.qty, 0);
    const fee = ev.noServiceFee ? 0 : Math.round(tSub * 0.05);
    const disc = String(body.coupon || '').trim().toUpperCase() === 'MOXIE15' ? Math.round(tSub * 0.15) : 0;
    const bk = {
      id: 'BK-' + Math.floor(100000 + Math.random() * 900000),
      userId: MEM_UID, eventId: ev.id, eventTitle: ev.title,
      venue: ev.venue + ', ' + ev.city, eventDate: ev.date,
      tierName: tier.name, seats: body.seats || [], quantity: body.quantity, snacks,
      paymentMethod: body.paymentMethod, discount: disc,
      totalAmount: Math.max(0, tSub + sSub + fee - disc), status: 'Confirmed'
    };
    MEM_DB.bookings.unshift(bk);
    saveLocal();
    return { booking: bk };
  }
  throw new Error('Unknown route');
}

async function api(url, opts = {}) {
  if (window.location.protocol === 'file:' || window.location.protocol === 'about:' || window.location.hostname === '') {
    return localApi(url, opts);
  }
  try {
    const res = await fetch(url, {
      headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
      credentials: 'same-origin',
      ...opts
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
  } catch (err) {
    if (err.name === 'TypeError' || String(err.message).includes('Failed to fetch')) {
      return localApi(url, opts);
    }
    throw err;
  }
}

function generateQRSVG(seedText) {
  const size = 21;
  let hash = 2166136261;
  for (let i = 0; i < seedText.length; i++) {
    hash ^= seedText.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const rects = [];
  const isFinder = (r, c) =>
    (r < 7 && c < 7) || (r < 7 && c >= size - 7) || (r >= size - 7 && c < 7);
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      let dark = false;
      if (isFinder(r, c)) {
        const lr = r >= size - 7 ? r - (size - 7) : r;
        const lc = c >= size - 7 ? c - (size - 7) : c;
        dark = lr === 0 || lr === 6 || lc === 0 || lc === 6 || (lr >= 2 && lr <= 4 && lc >= 2 && lc <= 4);
      } else {
        hash = (Math.imul(hash ^ (r * 31 + c), 16777619) >>> 0);
        dark = (hash & 1) === 1;
      }
      if (dark) rects.push(`<rect x="${c * 6}" y="${r * 6}" width="6" height="6" fill="#151232"/>`);
    }
  }
  return `<svg width="126" height="126" viewBox="0 0 126 126" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Digital Ticket QR">${rects.join('')}</svg>`;
}

// ---------- Scroll Reveal Observer ----------
function setupScrollReveal() {
  const els = document.querySelectorAll('.reveal');
  if (!('IntersectionObserver' in window)) {
    els.forEach(el => el.classList.add('in-view'));
    return;
  }
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08 });
  els.forEach(el => obs.observe(el));
}

// ---------- Navigation ----------
function switchView(view) {
  state.currentView = view;
  document.querySelectorAll('.view-section').forEach(s => s.classList.remove('active'));
  const target = document.getElementById(`view-${view}`);
  if (target) target.classList.add('active');
  document.querySelectorAll('.nav-link').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === view);
  });
  const drawer = document.getElementById('mobileMenuDrawer');
  if (drawer) drawer.classList.remove('open');
  window.scrollTo({ top: 0, behavior: 'smooth' });
  if (view === 'account') renderAccount();
  if (view === 'sponsors') renderSponsors();
  setupScrollReveal();
}

function openModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(id) {
  document.getElementById(id).classList.remove('open');
  if (id === 'bookingModal') clearInterval(state.holdTimer);
}

// ---------- Initialization ----------
async function init() {
  try {
    const [evRes, spRes] = await Promise.all([api('/api/events'), api('/api/sponsors')]);
    state.events = evRes.events || [];
    state.snacks = evRes.snacks || [];
    state.sponsors = spRes.sponsors || [];
  } catch (err) {
    showToast('Could not load events: ' + err.message);
  }

  try {
    const me = await api('/api/auth/me');
    state.user = me.user;
    await loadUserBookings();
  } catch {
    state.user = null;
  }

  bindEvents();
  updateNavAuth();
  renderHome();
  renderEventsCatalog();
  renderMixesAndGallery();
  populateSponsorTargets();
  renderSponsors();
  setupScrollReveal();
}

async function loadUserBookings() {
  if (!state.user) { state.bookings = []; return; }
  try {
    const res = await api('/api/bookings');
    state.bookings = res.bookings || [];
  } catch {
    state.bookings = [];
  }
  updateNavAuth();
}

function updateNavAuth() {
  const authBtn = document.getElementById('navAuthBtn');
  const countEl = document.getElementById('navTicketCount');
  const upcomingCount = state.bookings.filter(b => b.status === 'Confirmed').length;
  countEl.textContent = upcomingCount;
  authBtn.textContent = state.user ? state.user.name.split(' ')[0] : 'Sign In';
}

function eventCardHTML(ev) {
  const isSaved = state.user && (state.user.savedEventIds || []).includes(ev.id);
  const img = IMAGE_MAP[ev.imageKey] || IMAGE_MAP.hero;
  const isPast = ev.status === 'past';
  return `
    <article class="event-card" data-event-id="${esc(ev.id)}">
      <div class="card-media">
        <img src="${esc(img)}" alt="${esc(ev.title)}" />
        <span class="card-badge">${esc(isPast ? (ev.attendance || 'Hall of Fame') : (ev.badge || ev.category))}</span>
        <span class="card-rating">★ ${esc(ev.rating)}</span>
        ${!isPast ? `<button class="card-save-btn ${isSaved ? 'saved' : ''}" data-save-id="${esc(ev.id)}" title="Save event">${isSaved ? '♥' : '♡'}</button>` : ''}
      </div>
      <div class="card-body">
        <div class="card-meta">
          <span>${esc(ev.category)}</span>
          <span>${esc(ev.city)}</span>
        </div>
        <h3 class="card-title">${esc(ev.title)}</h3>
        <p class="card-sub">${esc(ev.artist)} • ${esc(ev.venue)}</p>
        <div class="card-footer">
          <div class="price-tag">${isPast ? 'Iconic Archive' : `${fmtINR(ev.priceMin)} <small>onwards</small>`}</div>
          <button class="btn ${isPast ? 'btn-soft' : 'btn-primary'}" data-open-id="${esc(ev.id)}">${isPast ? 'Relive Highlights' : 'View &amp; Book'}</button>
        </div>
      </div>
    </article>
  `;
}

function renderHome() {
  const upcoming = state.events.filter(e => e.status === 'upcoming');
  const past = state.events.filter(e => e.status === 'past');
  const eyebrow = document.getElementById('recEyebrow');
  const heading = document.getElementById('recHeading');

  let personalized = upcoming;
  if (state.user && state.user.interests && state.user.interests.length > 0) {
    eyebrow.textContent = `Picked For ${state.user.name.split(' ')[0]} • ${state.user.interests.join(' · ')}`;
    heading.textContent = `Upcoming Posters Matching Your Vibe (${state.user.city || 'Near You'})`;
    personalized = [...upcoming].sort((a, b) => {
      const aScore = (state.user.interests.includes(a.category) ? 2 : 0) + (a.city === state.user.city ? 1 : 0);
      const bScore = (state.user.interests.includes(b.category) ? 2 : 0) + (b.city === state.user.city ? 1 : 0);
      return bScore - aScore;
    });
  } else {
    eyebrow.textContent = 'Curated Upcoming Posters';
    heading.textContent = 'Upcoming Concerts Near You';
  }

  document.getElementById('homeUpcomingGrid').innerHTML = personalized.slice(0, 3).map(eventCardHTML).join('');
  document.getElementById('bestEventsGrid').innerHTML = past.map(eventCardHTML).join('');
}

function getFilteredEvents() {
  const q = document.getElementById('fSearch').value.trim().toLowerCase();
  const dateVal = document.getElementById('fDate').value;
  const cat = document.getElementById('fCategory').value;
  const minRating = parseFloat(document.getElementById('fRating').value || '0');
  const city = document.getElementById('fCity').value;
  const artist = document.getElementById('fArtist').value.trim().toLowerCase();
  const maxPrice = parseFloat(document.getElementById('fPrice').value || '8000');
  const noFee = document.getElementById('fNoFee').checked;
  const hideAttended = document.getElementById('fHideAttended').checked;

  let list = state.events.filter(ev => {
    if (ev.status !== 'upcoming') return false;
    if (cat !== 'All' && ev.category !== cat) return false;
    if (city !== 'All' && ev.city !== city) return false;
    if (ev.rating < minRating) return false;
    if (ev.priceMin > maxPrice) return false;
    if (noFee && !ev.noServiceFee) return false;
    if (hideAttended && state.user && (state.user.attendedEventIds || []).includes(ev.id)) return false;
    if (dateVal && !ev.date.startsWith(dateVal)) return false;
    if (artist && !ev.artist.toLowerCase().includes(artist)) return false;
    if (q) {
      const hay = `${ev.title} ${ev.artist} ${ev.venue} ${ev.city} ${ev.category}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  if (state.sortMode === 'Popular') list.sort((a, b) => b.reviewsCount - a.reviewsCount);
  else if (state.sortMode === 'New') list.sort((a, b) => new Date(b.date) - new Date(a.date));
  else if (state.sortMode === 'Deals') list.sort((a, b) => a.priceMin - b.priceMin);
  else if (state.sortMode === 'Recommended' && state.user && state.user.interests) {
    list.sort((a, b) => {
      const as = state.user.interests.includes(a.category) ? 1 : 0;
      const bs = state.user.interests.includes(b.category) ? 1 : 0;
      return bs - as || b.rating - a.rating;
    });
  }
  return list;
}

function renderEventsCatalog() {
  const grid = document.getElementById('eventsCatalogGrid');
  grid.classList.toggle('list-mode', state.listMode);
  const items = getFilteredEvents();
  if (items.length === 0) {
    grid.innerHTML = `<div class="mini-card" style="grid-column:1/-1; text-align:center; padding:2.5rem;">
      <h3>No concerts matched these filters</h3>
      <p style="color:var(--ink-muted); margin-top:0.35rem;">Try widening your price range or clearing a filter.</p>
    </div>`;
    return;
  }
  grid.innerHTML = items.map(eventCardHTML).join('');
}

// ---------- Event Detail Page + Live Countdown ----------
function openEventDetail(eventId) {
  const ev = state.events.find(e => e.id === eventId);
  if (!ev) return;
  state.selectedEventId = eventId;
  clearInterval(state.countdownTimer);

  const img = IMAGE_MAP[ev.imageKey] || IMAGE_MAP.hero;
  const isPast = ev.status === 'past';
  const collageImgs = [img, IMAGE_MAP.hero, ev.imageKey === 'dj' ? IMAGE_MAP.indie : IMAGE_MAP.dj];

  const html = `
    <div class="detail-hero">
      <img src="${esc(img)}" alt="${esc(ev.title)}" class="detail-bg" />
      <div class="detail-hero-inner">
        <div class="hero-pill">${esc(ev.category)} • ${esc(ev.city)} • ★ ${esc(ev.rating)} (${esc(ev.reviewsCount)} reviews)</div>
        <h1 style="font-size:clamp(1.8rem,3.6vw,2.8rem); font-weight:800; margin-bottom:0.5rem;">${esc(ev.title)}</h1>
        <p style="color:#DDD6FE; font-size:1rem;">${esc(fmtDate(ev.date))} | ${esc(ev.venue)}, ${esc(ev.city)}</p>
        ${!isPast ? `
          <div class="countdown-row" id="liveCountdown">
            <div class="cd-box"><div class="cd-num" id="cdDays">00</div><div class="cd-lbl">Days</div></div>
            <div class="cd-box"><div class="cd-num" id="cdHours">00</div><div class="cd-lbl">Hours</div></div>
            <div class="cd-box"><div class="cd-num" id="cdMins">00</div><div class="cd-lbl">Minutes</div></div>
            <div class="cd-box"><div class="cd-num" id="cdSecs">00</div><div class="cd-lbl">Seconds</div></div>
          </div>
          <div style="display:flex; justify-content:center; gap:0.85rem; flex-wrap:wrap;">
            <button class="btn btn-rose" id="detailBookBtn">Select Seats &amp; Pre-Order Snacks</button>
            <button class="btn btn-ghost" id="detailSponsorBtn">Sponsor This Event</button>
          </div>
        ` : `<div style="margin-top:1.5rem;"><span class="hero-pill">${esc(ev.attendance || 'Historic Sold-Out Night')}</span></div>`}
      </div>
    </div>

    <div class="about-split">
      <div class="stagger-collage">
        ${collageImgs.map(src => `<img src="${esc(src)}" alt="Stage highlight" />`).join('')}
      </div>
      <div>
        <div class="section-eyebrow">About Event</div>
        <h2 class="section-title" style="margin-bottom:0.75rem;">${esc(ev.artist)}</h2>
        <p style="color:var(--ink-muted);">${esc(ev.description)}</p>
        ${ev.highlights ? `<ul class="highlight-list">${ev.highlights.map(h => `<li>${esc(h)}</li>`).join('')}</ul>` : ''}
        ${!isPast ? `<button class="btn btn-primary" id="detailBookBtn2">Book Tickets from ${fmtINR(ev.priceMin)}</button>` : ''}
      </div>
    </div>

    ${ev.lineup ? `
      <div class="section-head">
        <div>
          <div class="section-eyebrow">Special Guests &amp; Set Times</div>
          <h2 class="section-title">Lineup</h2>
        </div>
      </div>
      <div class="lineup-grid">
        ${ev.lineup.map(a => `
          <div class="mini-card">
            <div style="font-size:0.76rem; font-weight:800; color:var(--primary);">${esc(a.time)}</div>
            <div style="font-size:1.08rem; font-weight:800; margin:0.2rem 0;">${esc(a.name)}</div>
            <div style="font-size:0.86rem; color:var(--ink-muted);">${esc(a.role)}</div>
          </div>
        `).join('')}
      </div>
    ` : ''}
  `;

  document.getElementById('eventDetailContainer').innerHTML = html;
  switchView('detail');

  if (!isPast) {
    const updateCD = () => {
      const diff = Math.max(0, new Date(ev.date).getTime() - Date.now());
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      const pad = n => String(n).padStart(2, '0');
      const dEl = document.getElementById('cdDays');
      if (!dEl) return;
      dEl.textContent = pad(d);
      document.getElementById('cdHours').textContent = pad(h);
      document.getElementById('cdMins').textContent = pad(m);
      document.getElementById('cdSecs').textContent = pad(s);
    };
    updateCD();
    state.countdownTimer = setInterval(updateCD, 1000);

    document.getElementById('detailBookBtn').onclick = () => openBookingFlow(ev.id);
    const b2 = document.getElementById('detailBookBtn2');
    if (b2) b2.onclick = () => openBookingFlow(ev.id);
    document.getElementById('detailSponsorBtn').onclick = () => {
      switchView('sponsors');
      document.getElementById('spType').value = 'Event';
      populateSponsorTargets();
      document.getElementById('spTarget').value = ev.title;
    };
  }
}

// ---------- Booking + Interactive Seat Map + Snack Pre-Order ----------
function openBookingFlow(eventId) {
  if (!state.user) {
    showToast('Please sign in first to book tickets.');
    openAuthModal('login');
    return;
  }
  const ev = state.events.find(e => e.id === eventId);
  if (!ev || !ev.tiers) return;

  state.bookingDraft = {
    event: ev,
    tierId: ev.tiers[0].id,
    quantity: 1,
    seats: ['A1'],
    snacks: {},
    coupon: '',
    paymentMethod: 'UPI (GPay / PhonePe)'
  };
  state.holdSeconds = 600;
  clearInterval(state.holdTimer);
  state.holdTimer = setInterval(() => {
    state.holdSeconds = Math.max(0, state.holdSeconds - 1);
    const el = document.getElementById('holdTimerBadge');
    if (el) {
      const m = String(Math.floor(state.holdSeconds / 60)).padStart(2, '0');
      const s = String(state.holdSeconds % 60).padStart(2, '0');
      el.textContent = `Seats locked for ${m}:${s}`;
    }
  }, 1000);

  renderBookingModal();
  openModal('bookingModal');
}

function renderBookingModal() {
  const d = state.bookingDraft;
  const ev = d.event;
  const tier = ev.tiers.find(t => t.id === d.tierId) || ev.tiers[0];
  const qty = Math.max(1, d.seats.length || d.quantity);
  d.quantity = qty;
  const ticketSubtotal = tier.price * qty;
  let snacksTotal = 0;
  for (const s of state.snacks) {
    snacksTotal += (d.snacks[s.id] || 0) * s.price;
  }
  const serviceFee = ev.noServiceFee ? 0 : Math.round(ticketSubtotal * 0.05);
  const couponApplied = d.coupon.trim().toUpperCase() === 'MOXIE15';
  const discount = couponApplied ? Math.round(ticketSubtotal * 0.15) : 0;
  const grandTotal = Math.max(0, ticketSubtotal + snacksTotal + serviceFee - discount);
  const m = String(Math.floor(state.holdSeconds / 60)).padStart(2, '0');
  const s = String(state.holdSeconds % 60).padStart(2, '0');

  document.getElementById('bookingModalBody').innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; gap:0.5rem; flex-wrap:wrap; margin-bottom:0.35rem;">
      <div class="section-eyebrow" style="margin:0;">MoxieOn Checkout</div>
      <span class="badge-count" id="holdTimerBadge" style="background:var(--primary);">Seats locked for ${m}:${s}</span>
    </div>
    <h2 style="font-size:1.35rem; font-weight:800; margin-bottom:0.2rem;">${esc(ev.title)}</h2>
    <p style="font-size:0.86rem; color:var(--ink-muted); margin-bottom:1rem;">${esc(ev.venue)}, ${esc(ev.city)}</p>

    <h4 style="font-size:0.82rem; text-transform:uppercase; letter-spacing:0.06em; color:var(--primary); margin-bottom:0.45rem;">1. Interactive Stage &amp; Seat Map</h4>
    <div class="seat-map-box">
      <div class="stage-arc">MAIN STAGE</div>
      <div class="seat-grid">
        ${SEAT_LAYOUT.map(seat => {
          const isSold = SOLD_SEATS.has(seat);
          const isSel = d.seats.includes(seat);
          return `<button type="button" class="seat-btn ${isSold ? 'sold' : ''} ${isSel ? 'selected' : ''}" data-seat="${seat}" ${isSold ? 'disabled' : ''}>${seat}</button>`;
        }).join('')}
      </div>
      <div style="font-size:0.76rem; color:var(--ink-muted);">Selected Seats: <strong>${d.seats.length ? esc(d.seats.join(', ')) : 'None'}</strong> (${qty} pass${qty > 1 ? 'es' : ''})</div>
    </div>

    <h4 style="font-size:0.82rem; text-transform:uppercase; letter-spacing:0.06em; color:var(--primary); margin-bottom:0.45rem;">2. Select Ticket Tier</h4>
    <div style="display:grid; gap:0.45rem; margin-bottom:1rem;">
      ${ev.tiers.map(t => `
        <label class="stepper-row" style="cursor:pointer; border-color:${t.id === d.tierId ? 'var(--primary)' : 'var(--border)'}; background:${t.id === d.tierId ? 'var(--surface-tint)' : '#fff'};">
          <div>
            <input type="radio" name="tierPick" value="${esc(t.id)}" ${t.id === d.tierId ? 'checked' : ''} style="margin-right:0.45rem;" />
            <strong>${esc(t.name)}</strong>
            <div style="font-size:0.78rem; color:var(--ink-muted);">${esc(t.perks)}</div>
          </div>
          <strong>${fmtINR(t.price)}</strong>
        </label>
      `).join('')}
    </div>

    <h4 style="font-size:0.82rem; text-transform:uppercase; letter-spacing:0.06em; color:var(--primary); margin-bottom:0.45rem;">3. Pre-Order Snacks &amp; Drinks</h4>
    <div style="max-height:175px; overflow-y:auto; padding-right:0.25rem; margin-bottom:0.9rem;">
      ${state.snacks.map(sn => {
        const q = d.snacks[sn.id] || 0;
        return `
          <div class="stepper-row">
            <div>
              <strong>${esc(sn.name)}</strong> <small style="color:var(--primary);">(${esc(sn.tag)})</small>
              <div style="font-size:0.76rem; color:var(--ink-muted);">${fmtINR(sn.price)} • ${esc(sn.prep)}</div>
            </div>
            <div class="stepper-controls">
              <button class="step-btn snack-dec" data-sid="${esc(sn.id)}">-</button>
              <strong style="min-width:18px; text-align:center;">${q}</strong>
              <button class="step-btn snack-inc" data-sid="${esc(sn.id)}">+</button>
            </div>
          </div>
        `;
      }).join('')}
    </div>

    <div style="display:flex; gap:0.5rem; margin-bottom:0.9rem;">
      <input id="couponInput" class="input" placeholder="Promo code (try MOXIE15)" value="${esc(d.coupon)}" />
      <button class="btn btn-soft" id="applyCouponBtn">Apply</button>
    </div>

    <h4 style="font-size:0.82rem; text-transform:uppercase; letter-spacing:0.06em; color:var(--primary); margin-bottom:0.4rem;">4. Payment Method</h4>
    <select id="payMethodSelect" class="select" style="margin-bottom:0.9rem;">
      <option ${d.paymentMethod.includes('UPI') ? 'selected' : ''}>UPI (GPay / PhonePe)</option>
      <option ${d.paymentMethod.includes('Card') ? 'selected' : ''}>Debit / Credit Card</option>
      <option ${d.paymentMethod.includes('Net') ? 'selected' : ''}>Net Banking</option>
      <option ${d.paymentMethod.includes('Wallet') ? 'selected' : ''}>Digital Wallet</option>
    </select>

    <div style="background:var(--bg); border-radius:12px; padding:0.9rem; font-size:0.88rem; margin-bottom:1rem;">
      <div style="display:flex; justify-content:space-between;"><span>Tickets (${qty} × ${fmtINR(tier.price)})</span><span>${fmtINR(ticketSubtotal)}</span></div>
      <div style="display:flex; justify-content:space-between;"><span>Pre-Ordered Snacks</span><span>${fmtINR(snacksTotal)}</span></div>
      <div style="display:flex; justify-content:space-between;"><span>Convenience Fee</span><span>${serviceFee === 0 ? 'Free' : fmtINR(serviceFee)}</span></div>
      ${discount > 0 ? `<div style="display:flex; justify-content:space-between; color:var(--rose);"><span>Promo (MOXIE15)</span><span>-${fmtINR(discount)}</span></div>` : ''}
      <div style="display:flex; justify-content:space-between; font-size:1.05rem; font-weight:800; margin-top:0.45rem; padding-top:0.45rem; border-top:1px solid var(--border);">
        <span>Total Payable</span><span>${fmtINR(grandTotal)}</span>
      </div>
    </div>

    <button class="btn btn-primary" id="confirmPayBtn" style="width:100%;">Pay ${fmtINR(grandTotal)} &amp; Generate QR Pass</button>
  `;

  document.querySelectorAll('.seat-btn:not(.sold)').forEach(btn => {
    btn.onclick = () => {
      const seat = btn.dataset.seat;
      if (d.seats.includes(seat)) {
        if (d.seats.length > 1) d.seats = d.seats.filter(x => x !== seat);
      } else if (d.seats.length < 8) {
        d.seats.push(seat);
      }
      renderBookingModal();
    };
  });
  document.querySelectorAll('input[name="tierPick"]').forEach(r => {
    r.onchange = () => { d.tierId = r.value; renderBookingModal(); };
  });
  document.querySelectorAll('.snack-dec').forEach(b => {
    b.onclick = () => {
      const id = b.dataset.sid;
      d.snacks[id] = Math.max(0, (d.snacks[id] || 0) - 1);
      renderBookingModal();
    };
  });
  document.querySelectorAll('.snack-inc').forEach(b => {
    b.onclick = () => {
      const id = b.dataset.sid;
      d.snacks[id] = Math.min(10, (d.snacks[id] || 0) + 1);
      renderBookingModal();
    };
  });
  document.getElementById('applyCouponBtn').onclick = () => {
    d.coupon = document.getElementById('couponInput').value;
    renderBookingModal();
    showToast(d.coupon.trim().toUpperCase() === 'MOXIE15' ? '15% MOXIE15 discount applied!' : 'Invalid promo code.');
  };
  document.getElementById('payMethodSelect').onchange = e => { d.paymentMethod = e.target.value; };
  document.getElementById('confirmPayBtn').onclick = submitBooking;
}

async function submitBooking() {
  const d = state.bookingDraft;
  const snacksArr = Object.entries(d.snacks).filter(([, q]) => q > 0).map(([id, qty]) => ({ id, qty }));
  try {
    const res = await api('/api/bookings', {
      method: 'POST',
      body: JSON.stringify({
        eventId: d.event.id,
        tierId: d.tierId,
        seats: d.seats,
        quantity: d.quantity,
        snacks: snacksArr,
        coupon: d.coupon,
        paymentMethod: d.paymentMethod
      })
    });
    closeModal('bookingModal');
    await loadUserBookings();
    showToast('Booking confirmed! Your digital QR ticket is ready.');
    openDigitalTicket(res.booking);
  } catch (err) {
    showToast(err.message);
  }
}

// ---------- Digital QR Ticket Modal ----------
function openDigitalTicket(bk) {
  const snacksList = (bk.snacks || []).length > 0
    ? bk.snacks.map(s => `<li>${esc(s.qty)} × ${esc(s.name)} (${fmtINR(s.price * s.qty)})</li>`).join('')
    : '<li>No snacks pre-ordered</li>';
  const seatsStr = (bk.seats && bk.seats.length) ? ` • Seats: ${esc(bk.seats.join(', '))}` : '';

  document.getElementById('ticketModalBody').innerHTML = `
    <div class="ticket-pass">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.85rem;">
        <span style="font-weight:800; letter-spacing:0.06em; color:#C4B5FD;">MOXIEON DIGITAL PASS</span>
        <span class="badge-count" style="background:rgba(255,255,255,0.16);">${esc(bk.status)}</span>
      </div>
      <h2 style="font-size:1.35rem; font-weight:800; margin-bottom:0.25rem;">${esc(bk.eventTitle)}</h2>
      <p style="font-size:0.88rem; color:#DDD6FE;">${esc(fmtDate(bk.eventDate))}</p>
      <p style="font-size:0.86rem; color:#C4B5FD;">${esc(bk.venue)}</p>

      <div class="ticket-divider"></div>

      <div style="display:flex; align-items:center; justify-content:space-between; gap:1rem; flex-wrap:wrap;">
        <div>
          <div style="font-size:0.75rem; color:#C4B5FD;">BOOKING ID</div>
          <div style="font-size:1.1rem; font-weight:800; margin-bottom:0.6rem;">${esc(bk.id)}</div>
          <div style="font-size:0.75rem; color:#C4B5FD;">PASS TIER &amp; SEATS</div>
          <div style="font-weight:700; margin-bottom:0.6rem;">${esc(bk.tierName)} × ${esc(bk.quantity)}${seatsStr}</div>
          <div style="font-size:0.75rem; color:#C4B5FD;">PRE-ORDERED SNACKS (EXPRESS GATE)</div>
          <ul style="font-size:0.84rem; padding-left:1rem; margin-top:0.2rem; color:#F5F3FF;">${snacksList}</ul>
        </div>
        <div class="qr-box">${generateQRSVG(`${bk.id}|${bk.eventId}|${bk.quantity}`)}</div>
      </div>

      <div class="ticket-divider"></div>
      <div style="display:flex; justify-content:space-between; font-size:0.86rem; color:#DDD6FE;">
        <span>Paid via ${esc(bk.paymentMethod)}</span>
        <strong>Total: ${fmtINR(bk.totalAmount)}</strong>
      </div>
    </div>
    <div style="display:flex; gap:0.75rem; margin-top:1rem; justify-content:flex-end; flex-wrap:wrap;">
      <button class="btn btn-soft" onclick="window.print()">Print / Save PDF</button>
      <button class="btn btn-primary" data-close="ticketModal">Done</button>
    </div>
  `;
  openModal('ticketModal');
}

// ---------- Auth & Extending Interest Onboarding ----------
function openAuthModal(mode = 'login') {
  const isReg = mode === 'register';
  document.getElementById('authModalBody').innerHTML = `
    <div class="section-eyebrow">${isReg ? 'Create Account' : 'Welcome Back'}</div>
    <h2 style="font-size:1.45rem; font-weight:800; margin-bottom:0.35rem;">${isReg ? 'Join MoxieOn' : 'Sign In to MoxieOn'}</h2>
    <p style="font-size:0.88rem; color:var(--ink-muted); margin-bottom:1rem;">
      ${isReg ? 'Step 1 of 2: Set up your account, then pick your music interests.' : 'Access your digital QR tickets, pre-ordered snacks, and curated concert posters.'}
    </p>
    <div id="authErrorBox" style="display:none; background:#FFF1F2; color:#BE123C; border:1px solid #FECDD3; padding:0.65rem 0.85rem; border-radius:10px; font-size:0.85rem; font-weight:600; margin-bottom:0.85rem;"></div>
    <form id="authForm" style="display:grid; gap:0.85rem;">
      ${isReg ? `
        <div class="field-group"><label>Full Name</label><input id="aName" class="input" required placeholder="e.g., Arathana N." /></div>
        <div class="field-group"><label>City</label>
          <select id="aCity" class="select">
            <option>Chennai</option><option>Bengaluru</option><option>Mumbai</option><option>Goa</option>
          </select>
        </div>
      ` : ''}
      <div class="field-group"><label>Email</label><input id="aEmail" type="email" class="input" required placeholder="you@example.com" /></div>
      <div class="field-group"><label>Password</label><input id="aPass" type="password" class="input" required minlength="4" placeholder="Min 4 characters" /></div>
      <button type="submit" class="btn btn-primary">${isReg ? 'Continue to Music Interests →' : 'Sign In'}</button>
    </form>
    <div style="display:flex; justify-content:space-between; align-items:center; margin-top:1rem; padding-top:0.85rem; border-top:1px solid var(--border); flex-wrap:wrap; gap:0.5rem;">
      <button class="btn btn-soft" id="demoLoginBtn">1-Click Demo Login</button>
      <button class="btn btn-soft" id="switchAuthModeBtn">${isReg ? 'Already have an account? Sign In' : 'New here? Create Account'}</button>
    </div>
  `;
  openModal('authModal');

  const showErr = msg => {
    const box = document.getElementById('authErrorBox');
    box.textContent = msg;
    box.style.display = 'block';
  };

  document.getElementById('switchAuthModeBtn').onclick = () => openAuthModal(isReg ? 'login' : 'register');
  document.getElementById('demoLoginBtn').onclick = async () => {
    try {
      const res = await api('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: 'arathana@moxieon.in', password: 'Moxie@2026' })
      });
      state.user = res.user;
      await loadUserBookings();
      closeModal('authModal');
      renderHome();
      showToast(`Welcome back, ${state.user.name}!`);
    } catch (err) { showErr(err.message); }
  };

  document.getElementById('authForm').onsubmit = async e => {
    e.preventDefault();
    try {
      if (isReg) {
        const res = await api('/api/auth/register', {
          method: 'POST',
          body: JSON.stringify({
            name: document.getElementById('aName').value,
            city: document.getElementById('aCity').value,
            email: document.getElementById('aEmail').value,
            password: document.getElementById('aPass').value
          })
        });
        state.user = res.user;
        await loadUserBookings();
        openInterestOnboarding();
      } else {
        const res = await api('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({
            email: document.getElementById('aEmail').value,
            password: document.getElementById('aPass').value
          })
        });
        state.user = res.user;
        await loadUserBookings();
        if (!state.user.onboardingComplete) openInterestOnboarding();
        else { closeModal('authModal'); renderHome(); showToast(`Welcome back, ${state.user.name}!`); }
      }
    } catch (err) { showErr(err.message); }
  };
}

function openInterestOnboarding() {
  if (!state.user) { openAuthModal('login'); return; }
  const picked = new Set(state.user.interests || ['Indie Singer']);
  document.getElementById('authModalBody').innerHTML = `
    <div class="section-eyebrow">Step 2 of 2 • Personalize</div>
    <h2 style="font-size:1.4rem; font-weight:800; margin-bottom:0.35rem;">What Sounds Move You?</h2>
    <p style="font-size:0.88rem; color:var(--ink-muted); margin-bottom:1.1rem;">Pick your favorite genres so MoxieOn surfaces upcoming concert posters near you.</p>
    <div id="interestChipsBox" style="display:flex; flex-wrap:wrap; gap:0.55rem; margin-bottom:1.25rem;">
      ${ALL_INTERESTS.map(i => `<button type="button" class="interest-chip ${picked.has(i) ? 'selected' : ''}" data-int="${esc(i)}">${esc(i)}</button>`).join('')}
    </div>
    <div class="field-group" style="margin-bottom:1.2rem;">
      <label>Preferred City</label>
      <select id="onbCity" class="select">
        ${['Chennai', 'Bengaluru', 'Mumbai', 'Goa'].map(c => `<option ${state.user.city === c ? 'selected' : ''}>${c}</option>`).join('')}
      </select>
    </div>
    <button class="btn btn-primary" id="saveOnboardingBtn" style="width:100%;">Save My Vibe &amp; Show Events</button>
  `;
  openModal('authModal');

  document.querySelectorAll('#interestChipsBox .interest-chip').forEach(btn => {
    btn.onclick = () => {
      const val = btn.dataset.int;
      if (picked.has(val)) picked.delete(val); else picked.add(val);
      btn.classList.toggle('selected', picked.has(val));
    };
  });

  document.getElementById('saveOnboardingBtn').onclick = async () => {
    try {
      const res = await api('/api/user/preferences', {
        method: 'PUT',
        body: JSON.stringify({
          interests: Array.from(picked),
          city: document.getElementById('onbCity').value
        })
      });
      state.user = res.user;
      closeModal('authModal');
      renderHome();
      renderEventsCatalog();
      if (state.currentView === 'account') renderAccount();
      showToast('Your concert vibe is updated!');
    } catch (err) { showToast(err.message); }
  };
}

// ---------- Mixes & Gallery ----------
function renderMixesAndGallery() {
  const mixes = [
    { id: 'm1', title: 'Midnight Strings & Synth (Live Session)', genre: 'Orchestral', freq: 220, img: IMAGE_MAP.orchestral },
    { id: 'm2', title: '808 Drift Cypher Beat', genre: 'Hip-Hop', freq: 110, img: IMAGE_MAP.hiphop },
    { id: 'm3', title: 'Velvet Horizon Sunset Acoustic', genre: 'Indie Singer', freq: 330, img: IMAGE_MAP.indie },
    { id: 'm4', title: 'Solstice Melodic Techno Drop', genre: 'DJ & Electronic', freq: 146.8, img: IMAGE_MAP.dj }
  ];

  document.getElementById('mixesGrid').innerHTML = mixes.map(m => `
    <div class="event-card">
      <div class="card-media"><img src="${esc(m.img)}" alt="${esc(m.title)}" /><span class="card-badge">${esc(m.genre)}</span></div>
      <div class="card-body">
        <h3 class="card-title">${esc(m.title)}</h3>
        <p class="card-sub">Preview the ambient stage soundcheck directly in your browser.</p>
        <div class="card-footer">
          <button class="btn btn-primary play-mix-btn" data-mix="${esc(m.id)}" data-freq="${m.freq}">▶ Play Preview</button>
        </div>
      </div>
    </div>
  `).join('');

  document.querySelectorAll('.play-mix-btn').forEach(btn => {
    btn.onclick = () => toggleAudioPreview(btn);
  });

  document.getElementById('galleryGrid').innerHTML = state.events.map(ev => `
    <div class="event-card" data-event-id="${esc(ev.id)}">
      <div class="card-media">
        <img src="${esc(IMAGE_MAP[ev.imageKey] || IMAGE_MAP.hero)}" alt="${esc(ev.title)}" />
        <span class="card-badge">${esc(ev.city)}</span>
      </div>
      <div class="card-body">
        <h3 class="card-title">${esc(ev.title)}</h3>
        <p class="card-sub">${esc(ev.artist)} • ${esc(ev.venue)}</p>
      </div>
    </div>
  `).join('');
}

function toggleAudioPreview(btn) {
  const id = btn.dataset.mix;
  const freq = parseFloat(btn.dataset.freq || '220');
  if (state.audioCtx) {
    state.audioCtx.close().catch(() => {});
    state.audioCtx = null;
  }
  document.querySelectorAll('.play-mix-btn').forEach(b => { b.textContent = '▶ Play Preview'; });
  if (state.activeMixId === id) {
    state.activeMixId = null;
    return;
  }
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return;
  const ctx = new Ctx();
  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const gain = ctx.createGain();
  osc1.type = 'sine';
  osc2.type = 'triangle';
  osc1.frequency.value = freq;
  osc2.frequency.value = freq * 1.5;
  gain.gain.value = 0.05;
  osc1.connect(gain);
  osc2.connect(gain);
  gain.connect(ctx.destination);
  osc1.start();
  osc2.start();
  state.audioCtx = ctx;
  state.activeMixId = id;
  btn.textContent = '⏹ Stop Preview';
  setTimeout(() => {
    if (state.activeMixId === id && state.audioCtx) {
      state.audioCtx.close().catch(() => {});
      state.audioCtx = null;
      state.activeMixId = null;
      btn.textContent = '▶ Play Preview';
    }
  }, 5000);
}

// ---------- Sponsors ----------
function populateSponsorTargets() {
  const type = document.getElementById('spType').value;
  const sel = document.getElementById('spTarget');
  if (type === 'Artist') {
    sel.innerHTML = ARTISTS_TO_SPONSOR.map(a => `<option value="${esc(a)}">${esc(a)}</option>`).join('');
  } else {
    sel.innerHTML = state.events.filter(e => e.status === 'upcoming')
      .map(e => `<option value="${esc(e.title)}">${esc(e.title)}</option>`).join('');
  }
}

function renderSponsors() {
  document.getElementById('sponsorsWall').innerHTML = state.sponsors.map(s => `
    <div class="mini-card">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.35rem;">
        <strong>${esc(s.sponsorName)}</strong>
        <span class="badge-count" style="background:var(--primary);">${esc(s.tier)} • ${fmtINR(s.amount)}</span>
      </div>
      <div style="font-size:0.84rem; font-weight:700; color:var(--violet);">Sponsoring ${esc(s.targetType)}: ${esc(s.targetName)}</div>
      ${s.message ? `<p style="font-size:0.86rem; color:var(--ink-muted); margin-top:0.3rem;">"${esc(s.message)}"</p>` : ''}
    </div>
  `).join('');
}

// ---------- Account View ----------
function renderAccount() {
  const box = document.getElementById('accountContainer');
  if (!state.user) {
    box.innerHTML = `
      <div class="mini-card" style="text-align:center; padding:3rem 1.5rem;">
        <h2 style="font-size:1.5rem; font-weight:800; margin-bottom:0.5rem;">Sign in to view your Account &amp; Digital Tickets</h2>
        <p style="color:var(--ink-muted); margin-bottom:1.25rem;">Access your upcoming QR passes, pre-ordered snacks, saved events, and booking history.</p>
        <button class="btn btn-primary" id="accSignInBtn">Sign In / Create Account</button>
      </div>
    `;
    document.getElementById('accSignInBtn').onclick = () => openAuthModal('login');
    return;
  }

  const upcomingBookings = state.bookings.filter(b => b.status === 'Confirmed');
  const pastBookings = state.bookings.filter(b => b.status !== 'Confirmed');

  box.innerHTML = `
    <div class="about-split" style="align-items:start; margin-bottom:2rem;">
      <div>
        <div class="section-eyebrow">Member Profile</div>
        <h2 class="section-title" style="margin-bottom:0.3rem;">${esc(state.user.name)}</h2>
        <p style="color:var(--ink-muted); font-size:0.92rem;">${esc(state.user.email)} • ${esc(state.user.city)}</p>
        <div style="display:flex; flex-wrap:wrap; gap:0.45rem; margin:1rem 0;">
          ${(state.user.interests || []).map(i => `<span class="interest-chip selected" style="padding:0.35rem 0.8rem; font-size:0.78rem;">${esc(i)}</span>`).join('')}
        </div>
        <div style="display:flex; gap:0.65rem; flex-wrap:wrap;">
          <button class="btn btn-soft" id="accEditVibeBtn">Edit Music Interests</button>
          <button class="btn btn-rose" id="accLogoutBtn">Logout</button>
        </div>
      </div>
      <div>
        <div class="section-eyebrow">Active Passes</div>
        <h3 style="font-size:1.2rem; font-weight:800; margin-bottom:0.85rem;">Upcoming Digital Tickets (${upcomingBookings.length})</h3>
        <div style="display:grid; gap:0.75rem;">
          ${upcomingBookings.length ? upcomingBookings.map(b => `
            <div class="mini-card" style="display:flex; justify-content:space-between; align-items:center; gap:0.75rem; flex-wrap:wrap;">
              <div>
                <strong>${esc(b.eventTitle)}</strong>
                <div style="font-size:0.82rem; color:var(--ink-muted);">${esc(b.tierName)} × ${esc(b.quantity)} • ${(b.snacks || []).length} snack items</div>
              </div>
              <button class="btn btn-primary view-bk-btn" data-bk="${esc(b.id)}">View QR Ticket</button>
            </div>
          `).join('') : '<p style="color:var(--ink-muted);">No upcoming tickets yet. Book a concert to see your QR pass here!</p>'}
        </div>
      </div>
    </div>

    <div class="section-head">
      <div>
        <div class="section-eyebrow">Archive</div>
        <h2 class="section-title">Previous Booking History</h2>
      </div>
    </div>
    <div class="lineup-grid">
      ${pastBookings.length ? pastBookings.map(b => `
        <div class="mini-card">
          <div style="font-size:0.76rem; font-weight:800; color:var(--primary);">${esc(b.id)} • ${esc(b.status)}</div>
          <div style="font-weight:800; margin:0.25rem 0;">${esc(b.eventTitle)}</div>
          <div style="font-size:0.84rem; color:var(--ink-muted);">${esc(b.tierName)} × ${esc(b.quantity)} • Paid ${fmtINR(b.totalAmount)}</div>
        </div>
      `).join('') : '<div class="mini-card">No past bookings yet.</div>'}
    </div>
  `;

  document.getElementById('accEditVibeBtn').onclick = openInterestOnboarding;
  document.getElementById('accLogoutBtn').onclick = async () => {
    await api('/api/auth/logout', { method: 'POST' });
    state.user = null;
    state.bookings = [];
    updateNavAuth();
    renderHome();
    renderAccount();
    showToast('Signed out.');
  };
  document.querySelectorAll('.view-bk-btn').forEach(btn => {
    btn.onclick = () => {
      const bk = state.bookings.find(x => x.id === btn.dataset.bk);
      if (bk) openDigitalTicket(bk);
    };
  });
}

// ---------- Event Listeners ----------
function bindEvents() {
  document.querySelectorAll('.nav-link').forEach(btn => {
    btn.onclick = () => switchView(btn.dataset.view);
  });
  document.getElementById('menuToggleBtn').onclick = () => {
    const drawer = document.getElementById('mobileMenuDrawer');
    const isOpen = drawer.classList.toggle('open');
    document.getElementById('menuToggleBtn').setAttribute('aria-expanded', String(isOpen));
  };
  document.getElementById('brandHomeBtn').onclick = e => { e.preventDefault(); switchView('home'); };
  document.getElementById('heroExploreBtn').onclick = () => switchView('events');
  document.getElementById('heroVibeBtn').onclick = () => openInterestOnboarding();
  document.getElementById('editInterestsHomeBtn').onclick = () => openInterestOnboarding();
  document.getElementById('backToEventsBtn').onclick = () => switchView('events');
  document.querySelectorAll('[data-goto]').forEach(b => { b.onclick = () => switchView(b.dataset.goto); });

  document.getElementById('heroQuickGoBtn').onclick = () => {
    const val = document.getElementById('heroQuickSearch').value;
    document.getElementById('fSearch').value = val;
    switchView('events');
    renderEventsCatalog();
  };

  document.querySelectorAll('[data-vibe], [data-vibe-jump]').forEach(el => {
    el.onclick = () => {
      const cat = el.dataset.vibe || el.dataset.vibeJump;
      document.getElementById('fCategory').value = cat;
      document.querySelectorAll('#quickCatRow .cat-pill-card').forEach(c => c.classList.toggle('active', c.dataset.cat === cat));
      switchView('events');
      renderEventsCatalog();
    };
  });

  document.getElementById('navAuthBtn').onclick = () => {
    if (state.user) switchView('account'); else openAuthModal('login');
  };
  document.getElementById('navTicketsBtn').onclick = () => {
    if (!state.user) openAuthModal('login');
    else if (state.bookings.length > 0) openDigitalTicket(state.bookings[0]);
    else switchView('account');
  };

  document.addEventListener('click', e => {
    const closeId = e.target.dataset && e.target.dataset.close;
    if (closeId) closeModal(closeId);
    if (e.target.classList.contains('modal-backdrop')) {
      e.target.classList.remove('open');
      if (e.target.id === 'bookingModal') clearInterval(state.holdTimer);
    }
    const saveBtn = e.target.closest('[data-save-id]');
    if (saveBtn) {
      e.stopPropagation();
      toggleSaveEvent(saveBtn.dataset.saveId);
      return;
    }
    const openBtn = e.target.closest('[data-open-id], .event-card[data-event-id]');
    if (openBtn && !e.target.closest('.play-mix-btn')) {
      const id = openBtn.dataset.openId || openBtn.dataset.eventId;
      if (id) openEventDetail(id);
    }
  });

  document.getElementById('toggleFiltersBtn').onclick = () => {
    const panel = document.getElementById('advancedFilterPanel');
    const hidden = panel.style.display === 'none';
    panel.style.display = hidden ? 'block' : 'none';
    document.getElementById('toggleFiltersBtn').textContent = hidden ? 'Hide Advanced Search' : 'Show Advanced Search';
  };
  document.getElementById('fPrice').oninput = e => {
    document.getElementById('fPriceVal').textContent = fmtINR(e.target.value);
    renderEventsCatalog();
  };
  document.getElementById('applyFiltersBtn').onclick = renderEventsCatalog;
  ['fSearch', 'fDate', 'fCategory', 'fRating', 'fCity', 'fArtist', 'fNoFee', 'fHideAttended'].forEach(id => {
    document.getElementById(id).addEventListener('input', renderEventsCatalog);
    document.getElementById(id).addEventListener('change', renderEventsCatalog);
  });
  document.getElementById('resetFiltersBtn').onclick = () => {
    document.getElementById('fSearch').value = '';
    document.getElementById('fDate').value = '';
    document.getElementById('fCategory').value = 'All';
    document.getElementById('fRating').value = '0';
    document.getElementById('fCity').value = 'All';
    document.getElementById('fArtist').value = '';
    document.getElementById('fPrice').value = '8000';
    document.getElementById('fPriceVal').textContent = '₹8,000';
    document.getElementById('fNoFee').checked = false;
    document.getElementById('fHideAttended').checked = false;
    renderEventsCatalog();
  };

  document.querySelectorAll('#quickCatRow .cat-pill-card').forEach(card => {
    card.onclick = () => {
      document.querySelectorAll('#quickCatRow .cat-pill-card').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      document.getElementById('fCategory').value = card.dataset.cat;
      renderEventsCatalog();
    };
  });

  document.querySelectorAll('#sortTabs .sort-tab').forEach(tab => {
    tab.onclick = () => {
      document.querySelectorAll('#sortTabs .sort-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      state.sortMode = tab.dataset.sort;
      renderEventsCatalog();
    };
  });

  document.getElementById('gridModeBtn').onclick = () => { state.listMode = false; renderEventsCatalog(); };
  document.getElementById('listModeBtn').onclick = () => { state.listMode = true; renderEventsCatalog(); };

  document.getElementById('spType').onchange = populateSponsorTargets;
  document.getElementById('sponsorForm').onsubmit = async e => {
    e.preventDefault();
    const [tier, amount] = document.getElementById('spTier').value.split('|');
    try {
      const res = await api('/api/sponsors', {
        method: 'POST',
        body: JSON.stringify({
          sponsorName: document.getElementById('spName').value,
          targetType: document.getElementById('spType').value,
          targetName: document.getElementById('spTarget').value,
          tier,
          amount: Number(amount),
          message: document.getElementById('spMessage').value
        })
      });
      state.sponsors.unshift(res.sponsor);
      renderSponsors();
      e.target.reset();
      populateSponsorTargets();
      showToast('Thank you! Your sponsorship is now live on the wall.');
    } catch (err) { showToast(err.message); }
  };
}

async function toggleSaveEvent(eventId) {
  if (!state.user) {
    showToast('Sign in to save events to your wishlist.');
    openAuthModal('login');
    return;
  }
  try {
    const res = await api('/api/user/preferences', {
      method: 'PUT',
      body: JSON.stringify({ toggleSavedEventId: eventId })
    });
    state.user = res.user;
    renderHome();
    renderEventsCatalog();
  } catch (err) { showToast(err.message); }
}

init();
