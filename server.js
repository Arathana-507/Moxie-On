const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// ---------- Security Helpers ----------
function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.pbkdf2Sync(String(password), salt, 100000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  const [salt, originalHash] = String(stored).split(':');
  if (!salt || !originalHash) return false;
  const hash = crypto.pbkdf2Sync(String(password), salt, 100000, 64, 'sha512').toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(originalHash, 'hex'));
}

function signToken(payload) {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(data).digest('base64url');
  return `${data}.${sig}`;
}

function verifyToken(token) {
  if (!token || !token.includes('.')) return null;
  const [data, sig] = token.split('.');
  const expected = crypto.createHmac('sha256', SESSION_SECRET).update(data).digest('base64url');
  try {
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
    const parsed = JSON.parse(Buffer.from(data, 'base64url').toString('utf8'));
    if (parsed.exp && Date.now() > parsed.exp) return null;
    return parsed;
  } catch {
    return null;
  }
}

function sanitizeText(str, maxLen = 200) {
  return String(str || '').replace(/[<>]/g, '').trim().slice(0, maxLen);
}

// ---------- Initial Seed Data ----------
function getInitialDB() {
  const demoPasswordHash = hashPassword('Aura@2026');
  return {
    users: [
      {
        id: 'usr_demo_1',
        name: 'Arathana N.',
        email: 'arathana@aurastage.in',
        phone: '+91 98401 23456',
        city: 'Chennai',
        passwordHash: demoPasswordHash,
        interests: ['Indie Singer', 'Orchestral', 'DJ & Electronic'],
        onboardingComplete: true,
        attendedEventIds: ['evt_past_1', 'evt_past_2'],
        savedEventIds: ['evt_1', 'evt_3'],
        createdAt: '2026-08-12T10:00:00Z'
      }
    ],
    events: [
      {
        id: 'evt_1',
        status: 'upcoming',
        title: 'Midnight Symphony: Strings & Synth',
        category: 'Orchestral',
        artist: 'Madras Chamber Collective',
        city: 'Chennai',
        venue: 'Sir Mutha Venkatasubba Rao Concert Hall',
        date: '2026-12-18T19:30:00+05:30',
        endDate: '2026-12-18T22:30:00+05:30',
        priceMin: 1199,
        priceMax: 4999,
        rating: 4.9,
        reviewsCount: 342,
        noServiceFee: true,
        badge: 'Recommended',
        tags: ['Orchestral', 'Live Strings', 'Ambient'],
        imageKey: 'orchestral',
        description: 'A 45-piece contemporary orchestra meets analog modular synthesizers in an acoustic-engineered hall bathed in soothing indigo light.',
        highlights: [
          '45-piece live philharmonic ensemble with spatial 360-degree acoustics',
          'Custom analog synth arrangements of timeless cinema & classical motifs',
          'Express lounge access with pre-ordered artisanal snacks & cold brews'
        ],
        lineup: [
          { name: 'Madras Chamber Collective', role: 'Lead Orchestra', time: '7:30 PM' },
          { name: 'Rohan Varma', role: 'Modular Synth', time: '8:45 PM' },
          { name: 'Kavya Iyer', role: 'Solo Violin', time: '9:30 PM' }
        ],
        tiers: [
          { id: 'gen', name: 'General Balcony', price: 1199, perks: 'Standard acoustic seating' },
          { id: 'vip', name: 'VIP Orchestra Pit', price: 2999, perks: 'Front 5 rows + Priority snack lane' },
          { id: 'grp', name: 'Group Pass (4)', price: 4299, perks: '4 adjacent balcony seats + 15% off' }
        ]
      },
      {
        id: 'evt_2',
        status: 'upcoming',
        title: '808 Drift: Underground Hip-Hop Live',
        category: 'Hip-Hop',
        artist: 'KRSNA & Karma ft. MC Altaf',
        city: 'Bengaluru',
        venue: 'Jayamahal Palace Grounds',
        date: '2026-12-12T18:30:00+05:30',
        endDate: '2026-12-12T23:00:00+05:30',
        priceMin: 899,
        priceMax: 3999,
        rating: 4.8,
        reviewsCount: 518,
        noServiceFee: false,
        badge: 'Popular',
        tags: ['Hip-Hop', 'Rap', 'Cypher'],
        imageKey: 'hiphop',
        description: 'High-precision lyricism, booming 808s, and a live cypher pit under the open Bengaluru night sky.',
        highlights: [
          'Back-to-back headliner sets with live brass & drumline backing',
          'Open-air freestyle cypher zone starting at 6:30 PM',
          'Zero-wait digital QR entry and pre-booked snack pickup counters'
        ],
        lineup: [
          { name: 'KRSNA', role: 'Headliner', time: '9:30 PM' },
          { name: 'MC Altaf', role: 'Guest Rapper', time: '8:15 PM' },
          { name: 'DJ Proof', role: 'Turntablist', time: '7:00 PM' }
        ],
        tiers: [
          { id: 'gen', name: 'General Standing', price: 899, perks: 'Main arena floor access' },
          { id: 'vip', name: 'VIP Fan Pit', price: 2199, perks: 'Stage-front pit + merch badge' },
          { id: 'grp', name: 'Squad Pass (4)', price: 3299, perks: '4 General passes + express gate' }
        ]
      },
      {
        id: 'evt_3',
        status: 'upcoming',
        title: 'Velvet Horizon: Indie Voices Unplugged',
        category: 'Indie Singer',
        artist: 'Prateek Kuhad & When Chai Met Toast',
        city: 'Chennai',
        venue: 'YMCA Nandanam Open Air Arena',
        date: '2026-12-26T18:00:00+05:30',
        endDate: '2026-12-26T22:00:00+05:30',
        priceMin: 1499,
        priceMax: 5499,
        rating: 4.9,
        reviewsCount: 624,
        noServiceFee: true,
        badge: 'New',
        tags: ['Indie Singer', 'Acoustic', 'Sunset'],
        imageKey: 'indie',
        description: 'An intimate sunset-to-starlight indie showcase featuring soulful acoustic storytelling, warm harmonies, and dreamy stage visuals.',
        highlights: [
          'Extended 90-minute sunset acoustic & full-band sets',
          'Curated indie vinyl & merch pop-up village',
          'Soothing lantern-lit picnic lawn seating with pre-order snacks'
        ],
        lineup: [
          { name: 'Prateek Kuhad', role: 'Headliner', time: '8:45 PM' },
          { name: 'When Chai Met Toast', role: 'Co-Headliner', time: '7:15 PM' },
          { name: 'Ananya Rao', role: 'Indie Opener', time: '6:15 PM' }
        ],
        tiers: [
          { id: 'gen', name: 'Lawn Pass', price: 1499, perks: 'Open-air lawn access' },
          { id: 'vip', name: 'Starlight Lounge', price: 3199, perks: 'Elevated deck + 1 complimentary drink' },
          { id: 'grp', name: 'Group Pass (4)', price: 5199, perks: '4 Lawn passes + reserved mat zone' }
        ]
      },
      {
        id: 'evt_4',
        status: 'upcoming',
        title: 'Solstice Pulse: Deep House & Melodic DJ Night',
        category: 'DJ & Electronic',
        artist: 'Nucleya & Lost Stories',
        city: 'Goa',
        venue: 'Vagator Hilltop Amphitheatre',
        date: '2026-12-30T17:00:00+05:30',
        endDate: '2026-12-31T01:00:00+05:30',
        priceMin: 1999,
        priceMax: 7999,
        rating: 4.7,
        reviewsCount: 890,
        noServiceFee: false,
        badge: 'Deals',
        tags: ['DJ & Electronic', 'Festival', 'Coastal'],
        imageKey: 'dj',
        description: 'Hypnotic melodic techno, bass-heavy drops, and laser-mapped coastal cliffs as we count down toward the new year.',
        highlights: [
          '8-hour continuous sunset-to-midnight electronic journey',
          'Synchronized indigo-violet laser & projection mapping',
          'Cashless QR wristband + pre-ordered food & hydration bar'
        ],
        lineup: [
          { name: 'Nucleya', role: 'Headliner DJ', time: '11:00 PM' },
          { name: 'Lost Stories', role: 'Melodic Set', time: '9:00 PM' },
          { name: 'Tanya Nambiar', role: 'Deep House', time: '7:00 PM' }
        ],
        tiers: [
          { id: 'gen', name: 'General Access', price: 1999, perks: 'Full festival grounds' },
          { id: 'vip', name: 'VIP Sunset Deck', price: 4499, perks: 'Elevated stage view + fast-track' },
          { id: 'grp', name: 'Festival Pack (4)', price: 7199, perks: '4 General passes + express entry' }
        ]
      },
      {
        id: 'evt_5',
        status: 'upcoming',
        title: 'Blue Note Courtyard: Neo-Soul & Jazz Quartet',
        category: 'Indie Singer',
        artist: 'Mali & The Velvet Brass',
        city: 'Mumbai',
        venue: 'Royal Opera House Courtyard',
        date: '2026-12-20T20:00:00+05:30',
        endDate: '2026-12-20T22:45:00+05:30',
        priceMin: 799,
        priceMax: 2799,
        rating: 4.8,
        reviewsCount: 215,
        noServiceFee: true,
        badge: 'Recommended',
        tags: ['Indie Singer', 'Jazz', 'Intimate'],
        imageKey: 'indie',
        description: 'Warm saxophone riffs, neo-soul vocals, and candlelit heritage courtyard acoustics in the heart of Mumbai.',
        highlights: [
          'Intimate 400-seat heritage courtyard setting',
          'Live horn section + improvisation encore',
          'Artisanal coffee & snack pre-order delivered to lounge'
        ],
        lineup: [
          { name: 'Mali', role: 'Vocals & Keys', time: '8:30 PM' },
          { name: 'The Velvet Brass', role: 'Live Quartet', time: '8:00 PM' }
        ],
        tiers: [
          { id: 'gen', name: 'Courtyard Seat', price: 799, perks: 'Reserved courtyard chair' },
          { id: 'vip', name: 'Royal Box', price: 2499, perks: 'Front-row table + meet & greet' }
        ]
      },
      {
        id: 'evt_6',
        status: 'upcoming',
        title: 'Aura Bass Arena: Hip-Hop & Trap Showcase',
        category: 'Hip-Hop',
        artist: 'Divine & Hanumankind',
        city: 'Chennai',
        venue: 'Island Grounds Dome',
        date: '2027-01-09T19:00:00+05:30',
        endDate: '2027-01-09T23:30:00+05:30',
        priceMin: 999,
        priceMax: 4499,
        rating: 4.9,
        reviewsCount: 410,
        noServiceFee: true,
        badge: 'Popular',
        tags: ['Hip-Hop', 'Live Band', 'Arena'],
        imageKey: 'hiphop',
        description: 'Two powerhouse Indian hip-hop icons unite on a 360-degree center stage with custom sub-bass arrays.',
        highlights: [
          '360-degree center stage with unobstructed sightlines',
          'Special guest appearances by emerging Chennai MCs',
          'Instant digital QR pass & pre-ordered arena snacks'
        ],
        lineup: [
          { name: 'Divine', role: 'Co-Headliner', time: '10:00 PM' },
          { name: 'Hanumankind', role: 'Co-Headliner', time: '8:30 PM' },
          { name: 'Paal Dabba', role: 'Local Special', time: '7:30 PM' }
        ],
        tiers: [
          { id: 'gen', name: 'Arena Floor', price: 999, perks: 'Standing floor access' },
          { id: 'vip', name: 'Gold Circle', price: 2599, perks: 'Inner ring + priority entry' },
          { id: 'grp', name: 'Crew Pack (4)', price: 3699, perks: '4 Arena passes' }
        ]
      },
      {
        id: 'evt_past_1',
        status: 'past',
        title: 'Echoes of Marina: 2025 Symphony Under Stars',
        category: 'Orchestral',
        artist: 'A.R. Rahman Ensemble & Symphony',
        city: 'Chennai',
        venue: 'Nehru Indoor Stadium',
        date: '2025-11-14T19:00:00+05:30',
        priceMin: 1500,
        priceMax: 8500,
        rating: 4.98,
        reviewsCount: 4820,
        attendance: '18,400+ Attendees',
        imageKey: 'orchestral',
        description: 'Voted AuraStage Best Event Ever — a sold-out 18,000-strong symphonic tribute blending classical strings, choir, and spatial surround audio.'
      },
      {
        id: 'evt_past_2',
        status: 'past',
        title: 'Neon Monsoon: Midnight Electronic Odyssey',
        category: 'DJ & Electronic',
        artist: 'Ritviz, KSHMR & Nucleya',
        city: 'Bengaluru',
        venue: 'Manpho Convention Grounds',
        date: '2026-02-21T18:00:00+05:30',
        priceMin: 1299,
        priceMax: 5999,
        rating: 4.92,
        reviewsCount: 3190,
        attendance: '12,200+ Attendees',
        imageKey: 'dj',
        description: 'An unforgettable rain-kissed electronic festival featuring synchronized drone light formations and 6 hours of non-stop melodic drops.'
      },
      {
        id: 'evt_past_3',
        status: 'past',
        title: 'Indie Roots & Rooftops Festival 2026',
        category: 'Indie Singer',
        artist: 'Anuv Jain, Lucky Ali & The Local Train',
        city: 'Mumbai',
        venue: 'Mahalaxmi Racecourse',
        date: '2026-04-05T17:30:00+05:30',
        priceMin: 999,
        priceMax: 3999,
        rating: 4.95,
        reviewsCount: 2740,
        attendance: '9,800+ Attendees',
        imageKey: 'indie',
        description: 'Three generations of independent Indian songwriting united on one sunlit-to-moonlit stage with acoustic sing-alongs.'
      }
    ],
    gallery: [
      { id: 'gal_1', title: 'Echoes of Marina Finale', category: 'Orchestral', city: 'Chennai', year: '2025', caption: '45-piece string ensemble under soothing lavender-blue hall acoustics.', imageKey: 'orchestral', eventId: 'evt_past_1', featured: true },
      { id: 'gal_2', title: '808 Drift Cypher Spotlight', category: 'Hip-Hop', city: 'Bengaluru', year: '2026', caption: 'Live brass & 808s lighting up the open-air arena.', imageKey: 'hiphop', eventId: 'evt_2', featured: false },
      { id: 'gal_3', title: 'Velvet Horizon Sunset Session', category: 'Indie Singer', city: 'Chennai', year: '2026', caption: 'Intimate acoustic harmonies bathed in warm rose stage glow.', imageKey: 'indie', eventId: 'evt_3', featured: false },
      { id: 'gal_4', title: 'Solstice Coastal Laser Mapping', category: 'DJ & Electronic', city: 'Goa', year: '2026', caption: 'Synchronized indigo & magenta beams over Vagator Hilltop.', imageKey: 'dj', eventId: 'evt_4', featured: true },
      { id: 'gal_5', title: 'AuraStage Opening Night Crowd', category: 'DJ & Electronic', city: 'Bengaluru', year: '2026', caption: '12,000+ fans singing every chorus in unison.', imageKey: 'hero', eventId: 'evt_past_2', featured: false },
      { id: 'gal_6', title: 'Royal Opera Courtyard Encore', category: 'Indie Singer', city: 'Mumbai', year: '2026', caption: 'Candlelit neo-soul & brass quartet under heritage arches.', imageKey: 'indie', eventId: 'evt_5', featured: false }
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
        id: 'BK-904821',
        userId: 'usr_demo_1',
        eventId: 'evt_1',
        eventTitle: 'Midnight Symphony: Strings & Synth',
        venue: 'Sir Mutha Venkatasubba Rao Concert Hall, Chennai',
        eventDate: '2026-12-18T19:30:00+05:30',
        tierName: 'VIP Orchestra Pit',
        quantity: 2,
        snacks: [
          { id: 'snk_2', name: 'Loaded Peri-Peri Nachos', qty: 1, price: 260 },
          { id: 'snk_4', name: 'Iced Lavender Cold Brew', qty: 2, price: 210 }
        ],
        paymentMethod: 'UPI (GPay)',
        discount: 0,
        totalAmount: 6678,
        status: 'Confirmed',
        createdAt: '2026-11-20T11:20:00Z'
      },
      {
        id: 'BK-773109',
        userId: 'usr_demo_1',
        eventId: 'evt_past_1',
        eventTitle: 'Echoes of Marina: 2025 Symphony Under Stars',
        venue: 'Nehru Indoor Stadium, Chennai',
        eventDate: '2025-11-14T19:00:00+05:30',
        tierName: 'General Balcony',
        quantity: 2,
        snacks: [],
        paymentMethod: 'Debit Card',
        discount: 0,
        totalAmount: 3000,
        status: 'Attended',
        createdAt: '2025-10-28T09:15:00Z'
      }
    ],
    sponsors: [
      {
        id: 'spn_1',
        sponsorName: 'Velvet Audio Labs',
        targetType: 'Event',
        targetName: 'Midnight Symphony: Strings & Synth',
        tier: 'Gold Stage Partner',
        amount: 25000,
        message: 'Powering spatial sound for independent orchestral creators.',
        createdAt: '2026-11-10T14:00:00Z'
      },
      {
        id: 'spn_2',
        sponsorName: 'Kiran & Co. Studio',
        targetType: 'Artist',
        targetName: 'Ananya Rao (Indie Singer)',
        tier: 'Silver Patron',
        amount: 10000,
        message: 'Supporting emerging indie acoustic voices in South India.',
        createdAt: '2026-11-18T16:30:00Z'
      },
      {
        id: 'spn_3',
        sponsorName: 'BrewCraft Roasters',
        targetType: 'Event',
        targetName: 'Velvet Horizon: Indie Voices Unplugged',
        tier: 'Supporter',
        amount: 2500,
        message: 'Keeping the acoustic lounge caffeinated and cozy.',
        createdAt: '2026-11-22T09:45:00Z'
      }
    ]
  };
}

function loadDB() {
  if (!fs.existsSync(DB_FILE)) {
    const initial = getInitialDB();
    fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2));
    return initial;
  }
  const db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  if (!db.gallery) {
    db.gallery = getInitialDB().gallery;
    saveDB(db);
  }
  return db;
}

function saveDB(db) {
  const tmp = `${DB_FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
  fs.renameSync(tmp, DB_FILE);
}

// ---------- HTTP Helpers ----------
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

function getCorsHeaders(req) {
  const origin = req.headers.origin;
  if (origin && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)) {
    return {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    };
  }
  return {};
}

function sendJSON(req, res, status, data, headers = {}) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    ...getCorsHeaders(req),
    ...headers
  });
  res.end(JSON.stringify(data));
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 1e6) {
        req.destroy();
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error('Invalid JSON'));
      }
    });
  });
}

function getAuthUser(req, db) {
  const authHeader = req.headers.authorization || '';
  let token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token && req.headers.cookie) {
    const match = req.headers.cookie.match(/aurastage_token=([^;]+)/);
    if (match) token = decodeURIComponent(match[1]);
  }
  const payload = verifyToken(token);
  if (!payload) return null;
  return db.users.find(u => u.id === payload.userId) || null;
}

function safeUser(user) {
  const { passwordHash, ...rest } = user;
  return rest;
}

// ---------- Request Router ----------
const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, getCorsHeaders(req));
    return res.end();
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;

  if (pathname.startsWith('/api/')) {
    const db = loadDB();

    if (pathname === '/api/health' && req.method === 'GET') {
      return sendJSON(req, res, 200, { ok: true, service: 'AuraStage Node.js API', time: new Date().toISOString() });
    }

    if (pathname === '/api/auth/register' && req.method === 'POST') {
      try {
        const body = await parseBody(req);
        const name = sanitizeText(body.name, 80);
        const email = sanitizeText(body.email, 120).toLowerCase();
        const phone = sanitizeText(body.phone || '+91 90000 00000', 25);
        const city = sanitizeText(body.city || 'Chennai', 50);
        const password = String(body.password || '');

        if (!name || !email.includes('@') || password.length < 6) {
          return sendJSON(req, res, 400, { error: 'Valid name, email, and 6+ character password are required.' });
        }
        if (db.users.some(u => u.email === email)) {
          return sendJSON(req, res, 409, { error: 'An account with this email already exists.' });
        }
        const newUser = {
          id: `usr_${crypto.randomBytes(6).toString('hex')}`,
          name,
          email,
          phone,
          city,
          passwordHash: hashPassword(password),
          interests: Array.isArray(body.interests) ? body.interests.slice(0, 6) : [],
          onboardingComplete: false,
          attendedEventIds: [],
          savedEventIds: [],
          createdAt: new Date().toISOString()
        };
        db.users.push(newUser);
        saveDB(db);
        const token = signToken({ userId: newUser.id, exp: Date.now() + 7 * 86400000 });
        return sendJSON(req, res, 201, { user: safeUser(newUser), token }, {
          'Set-Cookie': `aurastage_token=${encodeURIComponent(token)}; HttpOnly; Path=/; SameSite=Lax; Max-Age=604800`
        });
      } catch (err) {
        return sendJSON(req, res, 400, { error: err.message });
      }
    }

    if (pathname === '/api/auth/login' && req.method === 'POST') {
      try {
        const body = await parseBody(req);
        const email = sanitizeText(body.email, 120).toLowerCase();
        const password = String(body.password || '');
        const user = db.users.find(u => u.email === email);
        if (!user || !verifyPassword(password, user.passwordHash)) {
          return sendJSON(req, res, 401, { error: 'Invalid email or password.' });
        }
        const token = signToken({ userId: user.id, exp: Date.now() + 7 * 86400000 });
        return sendJSON(req, res, 200, { user: safeUser(user), token }, {
          'Set-Cookie': `aurastage_token=${encodeURIComponent(token)}; HttpOnly; Path=/; SameSite=Lax; Max-Age=604800`
        });
      } catch (err) {
        return sendJSON(req, res, 400, { error: err.message });
      }
    }

    if (pathname === '/api/auth/logout' && req.method === 'POST') {
      return sendJSON(req, res, 200, { ok: true }, {
        'Set-Cookie': 'aurastage_token=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0'
      });
    }

    if (pathname === '/api/auth/me' && req.method === 'GET') {
      const user = getAuthUser(req, db);
      if (!user) return sendJSON(req, res, 401, { error: 'Not authenticated' });
      return sendJSON(req, res, 200, { user: safeUser(user) });
    }

    if (pathname === '/api/user/preferences' && req.method === 'PUT') {
      const user = getAuthUser(req, db);
      if (!user) return sendJSON(req, res, 401, { error: 'Please sign in first.' });
      try {
        const body = await parseBody(req);
        if (Array.isArray(body.interests)) {
          user.interests = body.interests.map(i => sanitizeText(i, 40)).slice(0, 8);
          user.onboardingComplete = true;
        }
        if (body.city) user.city = sanitizeText(body.city, 50);
        if (body.toggleSavedEventId) {
          const eid = sanitizeText(body.toggleSavedEventId, 40);
          if (user.savedEventIds.includes(eid)) {
            user.savedEventIds = user.savedEventIds.filter(id => id !== eid);
          } else {
            user.savedEventIds.push(eid);
          }
        }
        saveDB(db);
        return sendJSON(req, res, 200, { user: safeUser(user) });
      } catch (err) {
        return sendJSON(req, res, 400, { error: err.message });
      }
    }

    if (pathname === '/api/events' && req.method === 'GET') {
      const q = (parsedUrl.searchParams.get('q') || '').toLowerCase();
      const category = parsedUrl.searchParams.get('category') || 'All';
      const city = parsedUrl.searchParams.get('city') || 'All';
      const minRating = parseFloat(parsedUrl.searchParams.get('minRating') || '0');
      const maxPrice = parseFloat(parsedUrl.searchParams.get('maxPrice') || '999999');
      const noServiceFee = parsedUrl.searchParams.get('noServiceFee') === 'true';
      const status = parsedUrl.searchParams.get('status') || 'all';

      const list = db.events.filter(ev => {
        if (status !== 'all' && ev.status !== status) return false;
        if (category !== 'All' && ev.category !== category) return false;
        if (city !== 'All' && ev.city !== city) return false;
        if (ev.rating < minRating) return false;
        if (ev.priceMin > maxPrice) return false;
        if (noServiceFee && !ev.noServiceFee) return false;
        if (q) {
          const hay = `${ev.title} ${ev.artist} ${ev.venue} ${ev.city} ${ev.category}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      });
      return sendJSON(req, res, 200, { events: list, snacks: db.snacks, gallery: db.gallery });
    }

    if (pathname === '/api/gallery' && req.method === 'GET') {
      return sendJSON(req, res, 200, { gallery: db.gallery });
    }

    if (pathname === '/api/bookings' && req.method === 'GET') {
      const user = getAuthUser(req, db);
      if (!user) return sendJSON(req, res, 401, { error: 'Authentication required' });
      const userBookings = db.bookings.filter(b => b.userId === user.id);
      return sendJSON(req, res, 200, { bookings: userBookings });
    }

    if (pathname === '/api/bookings' && req.method === 'POST') {
      const user = getAuthUser(req, db);
      if (!user) return sendJSON(req, res, 401, { error: 'Please log in to book tickets.' });
      try {
        const body = await parseBody(req);
        const event = db.events.find(e => e.id === body.eventId && e.status === 'upcoming');
        if (!event) return sendJSON(req, res, 404, { error: 'Upcoming event not found.' });
        const tier = (event.tiers || []).find(t => t.id === body.tierId);
        const qty = Math.max(1, Math.min(10, parseInt(body.quantity || 1, 10)));
        if (!tier) return sendJSON(req, res, 400, { error: 'Invalid ticket tier.' });

        const orderedSnacks = [];
        let snacksTotal = 0;
        if (Array.isArray(body.snacks)) {
          for (const item of body.snacks) {
            const snack = db.snacks.find(s => s.id === item.id);
            const sQty = Math.max(0, Math.min(10, parseInt(item.qty || 0, 10)));
            if (snack && sQty > 0) {
              orderedSnacks.push({ id: snack.id, name: snack.name, qty: sQty, price: snack.price });
              snacksTotal += snack.price * sQty;
            }
          }
        }

        const ticketSubtotal = tier.price * qty;
        const serviceFee = event.noServiceFee ? 0 : Math.round(ticketSubtotal * 0.05);
        const couponValid = String(body.coupon || '').trim().toUpperCase() === 'AURA15';
        const discount = couponValid ? Math.round(ticketSubtotal * 0.15) : 0;
        const totalAmount = Math.max(0, ticketSubtotal + snacksTotal + serviceFee - discount);

        const booking = {
          id: `BK-${Math.floor(100000 + Math.random() * 900000)}`,
          userId: user.id,
          eventId: event.id,
          eventTitle: event.title,
          venue: `${event.venue}, ${event.city}`,
          eventDate: event.date,
          tierName: tier.name,
          quantity: qty,
          snacks: orderedSnacks,
          paymentMethod: sanitizeText(body.paymentMethod || 'UPI', 40),
          discount,
          serviceFee,
          totalAmount,
          status: 'Confirmed',
          createdAt: new Date().toISOString()
        };

        db.bookings.unshift(booking);
        saveDB(db);
        return sendJSON(req, res, 201, { booking });
      } catch (err) {
        return sendJSON(req, res, 400, { error: err.message });
      }
    }

    if (pathname === '/api/sponsors' && req.method === 'GET') {
      return sendJSON(req, res, 200, { sponsors: db.sponsors });
    }

    if (pathname === '/api/sponsors' && req.method === 'POST') {
      try {
        const body = await parseBody(req);
        const sponsorName = sanitizeText(body.sponsorName, 80);
        const targetType = body.targetType === 'Artist' ? 'Artist' : 'Event';
        const targetName = sanitizeText(body.targetName, 100);
        const tier = sanitizeText(body.tier || 'Supporter', 40);
        const amount = Math.max(500, Math.min(500000, parseInt(body.amount || 2500, 10)));
        const message = sanitizeText(body.message || '', 220);

        if (!sponsorName || !targetName) {
          return sendJSON(req, res, 400, { error: 'Sponsor name and target event/artist are required.' });
        }

        const entry = {
          id: `spn_${crypto.randomBytes(4).toString('hex')}`,
          sponsorName,
          targetType,
          targetName,
          tier,
          amount,
          message,
          createdAt: new Date().toISOString()
        };
        db.sponsors.unshift(entry);
        saveDB(db);
        return sendJSON(req, res, 201, { sponsor: entry });
      } catch (err) {
        return sendJSON(req, res, 400, { error: err.message });
      }
    }

    return sendJSON(req, res, 404, { error: 'API route not found' });
  }

  // Static File Serving (Path Traversal Safe)
  const safePath = path.normalize(pathname === '/' ? '/index.html' : pathname).replace(/^(\.\.[/\\])+/, '');
  const filePath = path.join(PUBLIC_DIR, safePath);
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      return res.end('Not Found');
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
    res.end(content);
  });
});

server.on('error', err => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Try: PORT=3001 node server.js`);
    process.exit(1);
  }
  throw err;
});

server.listen(PORT, () => {
  console.log(`AuraStage Event Booking System running at http://localhost:${PORT}`);
});
