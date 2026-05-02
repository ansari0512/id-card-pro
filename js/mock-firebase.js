/**
 * MOCK FIREBASE — Demo/Test mode
 * Structure: schools/{schoolId}/classes/{className}/students/{studentId}
 *
 * Login: admin@demo.com / admin123   → Admin Panel
 *        school@demo.com / school123 → Dashboard
 */

const DEMO_USERS = {
  'admin@demo.com':  { uid: 'admin-uid-001',  password: 'admin123',  role: 'admin'  },
  'school@demo.com': { uid: 'school-uid-001', password: 'school123', role: 'school' }
};

// ── localStorage helpers ──────────────────────────────────
function getStudents() { return JSON.parse(localStorage.getItem('mock_students') || '[]'); }
function saveStudents(arr) { localStorage.setItem('mock_students', JSON.stringify(arr)); }
function getSchools()  { return JSON.parse(localStorage.getItem('mock_schools')  || '[]'); }
function saveSchools(arr)  { localStorage.setItem('mock_schools',  JSON.stringify(arr)); }

function getUserDocs() {
  return Object.entries(DEMO_USERS).map(([email, u]) => ({
    docId: u.uid, id: u.uid, role: u.role, email
  }));
}

// ── Seed demo data ────────────────────────────────────────
function seedDemoData() {
  if (localStorage.getItem('mock_seeded_v2')) return;
  // Clear old flat structure
  localStorage.removeItem('mock_students');
  localStorage.removeItem('mock_schools');
  localStorage.removeItem('mock_seeded');

  const students = [
    { docId: 'doc1', id: 'RK1700000001', schoolId: 'school-uid-001', uid: 'school-uid-001', name: 'Aarav Sharma',  father: 'Rajesh Sharma', class: '5', section: 'A', mobile: '9876543210', address: 'Delhi',   photo: null, createdAt: Date.now() - 86400000 * 2, updatedAt: Date.now() - 86400000 * 2 },
    { docId: 'doc2', id: 'RK1700000002', schoolId: 'school-uid-001', uid: 'school-uid-001', name: 'Priya Singh',   father: 'Amit Singh',   class: '3', section: 'B', mobile: '9123456789', address: 'Noida',   photo: null, createdAt: Date.now() - 86400000,     updatedAt: Date.now() - 86400000     },
    { docId: 'doc3', id: 'RK1700000003', schoolId: 'school-uid-001', uid: 'school-uid-001', name: 'Rohan Verma',   father: 'Suresh Verma', class: '5', section: 'A', mobile: '9988776655', address: 'Gurgaon', photo: null, createdAt: Date.now() - 3600000,      updatedAt: Date.now() - 3600000      },
    { docId: 'doc4', id: 'RK1700000004', schoolId: 'school-uid-001', uid: 'school-uid-001', name: 'Sneha Gupta',   father: 'Rakesh Gupta', class: '3', section: 'A', mobile: '9871234567', address: 'Delhi',   photo: null, createdAt: Date.now() - 7200000,      updatedAt: Date.now() - 7200000      },
    { docId: 'doc5', id: 'RK1700000005', schoolId: 'school-uid-001', uid: 'school-uid-001', name: 'Arjun Patel',   father: 'Vijay Patel',  class: '7', section: 'B', mobile: '9765432109', address: 'Noida',   photo: null, createdAt: Date.now() - 1800000,      updatedAt: Date.now() - 1800000      },
  ];
  const schools = [
    { id: 'school-uid-001', schoolName: 'Demo Public School', email: 'school@demo.com', uid: 'school-uid-001', city: 'Delhi', createdAt: Date.now() - 86400000 * 7, active: true }
  ];
  saveStudents(students);
  saveSchools(schools);
  localStorage.setItem('mock_seeded_v2', '1');
}
seedDemoData();

// ── Path parser ───────────────────────────────────────────
// Supports:
//   "students"                                     → flat (legacy/admin)
//   "schools"                                      → schools
//   "users"                                        → users
//   "schools/{sid}/classes/{cls}/students"         → subcollection
//   "schools/{sid}/classes/{cls}/students/{docId}" → single doc
function parsePath(segments) {
  // segments = array like ['schools','sid','classes','5','students']
  if (segments.length === 5 &&
      segments[0] === 'schools' && segments[2] === 'classes' && segments[4] === 'students') {
    return { type: 'students', schoolId: segments[1], className: segments[3] };
  }
  if (segments.length === 1) return { type: segments[0] }; // 'students','schools','users'
  return { type: 'unknown' };
}

// ── Subcollection-aware student helpers ───────────────────
function getStudentsForClass(schoolId, className) {
  return getStudents().filter(s => s.schoolId === schoolId && s.class === className);
}

function getStudentsForSchool(schoolId) {
  return getStudents().filter(s => s.schoolId === schoolId);
}

// ── Mock Firestore collection() ───────────────────────────
// Supports chaining: db.collection('schools').doc(sid).collection('classes').doc(cls).collection('students')
function mockCollection(colName, _pathSegments) {
  const segments = _pathSegments || [colName];

  const col = {
    _segments: segments,

    doc(id) {
      return mockDocObj([...segments, id]);
    },

    where(field, op, val) {
      return mockQuery(segments, [{ field, op, val }]);
    },

    orderBy() { return this; },

    get() {
      const info = parsePath(segments);
      let data = [];
      if (info.type === 'students' && info.schoolId && info.className) {
        data = getStudentsForClass(info.schoolId, info.className);
      } else if (info.type === 'students') {
        data = getStudents();
      } else if (info.type === 'schools') {
        data = getSchools();
      } else if (info.type === 'users') {
        data = getUserDocs();
      }
      return Promise.resolve(mockSnapshot(data));
    },

    add(obj) {
      const docId = 'doc_' + Date.now() + '_' + Math.random().toString(36).slice(2);
      const info = parsePath(segments);
      if (info.type === 'students') {
        const item = { ...obj, docId };
        const arr = getStudents();
        arr.unshift(item);
        saveStudents(arr);
      } else if (info.type === 'schools') {
        const item = { ...obj, docId };
        const arr = getSchools();
        arr.unshift(item);
        saveSchools(arr);
      }
      return Promise.resolve({ id: docId });
    }
  };
  return col;
}

// ── Mock doc object ───────────────────────────────────────
function mockDocObj(pathSegments) {
  // pathSegments e.g. ['schools','sid','classes','5','students','docId']
  const isStudentDoc = pathSegments.length === 6 &&
    pathSegments[0] === 'schools' && pathSegments[2] === 'classes' && pathSegments[4] === 'students';
  const isSchoolDoc  = pathSegments.length === 2 && pathSegments[0] === 'schools';
  const isUserDoc    = pathSegments.length === 2 && pathSegments[0] === 'users';
  const docId        = pathSegments[pathSegments.length - 1];

  return {
    _path: pathSegments,

    // Subcollection chaining: .doc(sid).collection('classes').doc(cls).collection('students')
    collection(subCol) {
      return mockCollection(subCol, [...pathSegments, subCol]);
    },

    get() {
      let item = null;
      if (isUserDoc) {
        const found = Object.values(DEMO_USERS).find(u => u.uid === docId);
        if (found) item = { role: found.role, email: Object.keys(DEMO_USERS).find(e => DEMO_USERS[e] === found) };
      } else if (isStudentDoc) {
        item = getStudents().find(s => s.docId === docId) || null;
      } else if (isSchoolDoc) {
        item = getSchools().find(s => s.id === docId) || null;
      }
      return Promise.resolve({ exists: !!item, data: () => item, id: docId });
    },

    set(obj) {
      if (isSchoolDoc) {
        const arr = getSchools();
        const idx = arr.findIndex(s => s.id === docId);
        const item = { ...obj, id: docId };
        if (idx >= 0) arr[idx] = item; else arr.unshift(item);
        saveSchools(arr);
      }
      return Promise.resolve();
    },

    update(obj) {
      if (isStudentDoc) {
        const arr = getStudents();
        const idx = arr.findIndex(s => s.docId === docId);
        if (idx >= 0) arr[idx] = { ...arr[idx], ...obj };
        saveStudents(arr);
      } else if (isSchoolDoc) {
        const arr = getSchools();
        const idx = arr.findIndex(s => s.id === docId);
        if (idx >= 0) arr[idx] = { ...arr[idx], ...obj };
        saveSchools(arr);
      }
      return Promise.resolve();
    },

    delete() {
      if (isStudentDoc) saveStudents(getStudents().filter(s => s.docId !== docId));
      else if (isSchoolDoc) saveSchools(getSchools().filter(s => s.id !== docId));
      return Promise.resolve();
    }
  };
}

// ── Mock Query ────────────────────────────────────────────
function mockQuery(segments, filters) {
  function applyFilters(arr) {
    return filters.reduce((acc, { field, op, val }) => {
      if (op === '==') return acc.filter(item => item[field] === val);
      return acc;
    }, arr);
  }

  const self = {
    where(field, op, val) { return mockQuery(segments, [...filters, { field, op, val }]); },
    orderBy() { return self; },
    limit() { return self; },
    count() {
      return {
        get() {
          const info = parsePath(segments);
          let data = info.type === 'students' && info.schoolId && info.className
            ? getStudentsForClass(info.schoolId, info.className)
            : info.type === 'students' ? getStudents()
            : getSchools();
          return Promise.resolve({ data: () => ({ count: applyFilters(data).length }) });
        }
      };
    },
    get() {
      const info = parsePath(segments);
      let data = [];
      if (info.type === 'students' && info.schoolId && info.className) {
        data = getStudentsForClass(info.schoolId, info.className);
      } else if (info.type === 'students') {
        data = getStudents();
      } else if (info.type === 'schools') {
        data = getSchools();
      } else if (info.type === 'users') {
        data = getUserDocs();
      }
      return Promise.resolve(mockSnapshot(applyFilters(data)));
    }
  };
  return self;
}

// ── Mock Snapshot ─────────────────────────────────────────
function mockSnapshot(arr) {
  const docs = arr.map(item => ({
    id: item.docId || item.id || '',
    data: () => ({ ...item }),
    ref: { delete: () => Promise.resolve() }
  }));
  return { docs, size: docs.length, empty: docs.length === 0, forEach(fn) { docs.forEach(fn); } };
}

// ── Mock Storage ──────────────────────────────────────────
function mockStorage() {
  return {
    ref(path) {
      return {
        put(file) {
          return new Promise(resolve => {
            const reader = new FileReader();
            reader.onload = e => resolve({ ref: { getDownloadURL: () => Promise.resolve(e.target.result) } });
            reader.readAsDataURL(file);
          });
        },
        getDownloadURL: () => Promise.resolve('assets/placeholder.png'),
        delete: () => Promise.resolve()
      };
    },
    refFromURL() { return { delete: () => Promise.resolve() }; }
  };
}

// ── Mock Auth ─────────────────────────────────────────────
let _currentUser = null;
let _authListeners = [];  // page load pe fresh start

function mockAuth() {
  return {
    get currentUser() { return _currentUser; },
    onAuthStateChanged(fn) {
      // Sirf current page ka listener rakho
      _authListeners = [fn];
      const saved = localStorage.getItem('mock_session');
      if (saved) {
        try {
          _currentUser = JSON.parse(saved);
          fn(_currentUser);
        } catch(e) {
          localStorage.removeItem('mock_session');
          fn(null);
        }
      }
      // null case fire mat karo — agar session nahi hai toh page waise hi raha karo
      // sirf tab redirect karo jab explicitly logout ho
    },
    signInWithEmailAndPassword(email, password) {
      const user = DEMO_USERS[email];
      if (!user || user.password !== password) {
        const err = new Error('Invalid email or password'); err.code = 'auth/wrong-password';
        return Promise.reject(err);
      }
      _currentUser = { uid: user.uid, email };
      localStorage.setItem('mock_session', JSON.stringify(_currentUser));
      return Promise.resolve({ user: _currentUser });
    },
    createUserWithEmailAndPassword(email, password) {
      if (DEMO_USERS[email]) {
        const err = new Error('Email already in use'); err.code = 'auth/email-already-in-use';
        return Promise.reject(err);
      }
      const uid = 'school-uid-' + Date.now();
      DEMO_USERS[email] = { uid, password, role: 'school' };
      return Promise.resolve({ user: { uid, email } });
    },
    signOut() {
      _currentUser = null;
      localStorage.removeItem('mock_session');
      // Explicitly null fire karo taaki logout redirect ho
      _authListeners.forEach(fn => fn(null));
      return Promise.resolve();
    }
  };
}

// ── Global firebase object ────────────────────────────────
const _authInstance    = mockAuth();
const _storageInstance = mockStorage();

const _dbInstance = {
  collection(name) { return mockCollection(name, [name]); },
  batch() {
    return {
      delete() {},
      commit() { return Promise.resolve(); }
    };
  }
};

window.firebase = {
  apps: [true],
  app() { return { options: {} }; },
  initializeApp(config, name) {
    if (name) return { auth() { return _authInstance; }, delete() { return Promise.resolve(); } };
    return window.firebase;
  },
  auth()      { return _authInstance; },
  firestore() { return _dbInstance; },
  storage()   { return _storageInstance; }
};

// Set mock mode flag
window.MOCK_MODE = true;

// ── Demo banner ───────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const b = document.createElement('div');
  b.style.cssText = 'position:fixed;bottom:0;left:0;right:0;background:#f59e0b;color:#000;text-align:center;padding:6px;font-size:13px;font-family:Poppins,sans-serif;z-index:99999;font-weight:600;';
  b.textContent = '🧪 DEMO MODE — admin@demo.com / admin123  |  school@demo.com / school123';
  document.body.appendChild(b);
});

// ── DB Helper — app code ke liye shortcut functions ───────
// Usage: dbStudents(schoolId, className) → collection ref
window.dbStudents = (schoolId, className) =>
  firebase.firestore()
    .collection('schools').doc(schoolId)
    .collection('classes').doc(className)
    .collection('students');

// Sabhi classes ke students ek saath fetch karo (school level)
window.dbGetAllStudents = async (schoolId, filters = {}) => {
  // Mock mein directly localStorage se filter karo — fast
  let results = getStudents().filter(s => s.schoolId === schoolId);

  if (filters.class)   results = results.filter(s => s.class === filters.class);
  if (filters.section) results = results.filter(s => s.section === filters.section);
  if (filters.search) {
    const q = filters.search.toLowerCase();
    results = results.filter(s =>
      s.name?.toLowerCase().includes(q) || s.id?.toLowerCase().includes(q)
    );
  }

  return results
    .map(s => ({ ...s, docId: s.docId || s.id }))
    .sort((a, b) => b.createdAt - a.createdAt);
};
