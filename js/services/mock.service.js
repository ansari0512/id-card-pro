/**
 * Mock Firebase Service
 * Simulates Firebase for development/testing without real Firebase
 * Uses localStorage for data persistence
 */

// Demo users for testing
const DEMO_USERS = {
  'admin@demo.com': { uid: 'admin-uid-001', password: 'admin123', role: 'admin' },
  'school@demo.com': { uid: 'school-uid-001', password: 'school123', role: 'school' }
};

// Current mock auth state
let currentUser = null;

/**
 * Get students from localStorage
 */
function getStudents() {
  return JSON.parse(localStorage.getItem('mock_students') || '[]');
}

/**
 * Save students to localStorage
 */
function saveStudents(students) {
  localStorage.setItem('mock_students', JSON.stringify(students));
}

/**
 * Get schools from localStorage
 */
function getSchools() {
  return JSON.parse(localStorage.getItem('mock_schools') || '[]');
}

/**
 * Save schools to localStorage
 */
function saveSchools(schools) {
  localStorage.setItem('mock_schools', JSON.stringify(schools));
}

/**
 * Seed demo data on first load
 */
function seedDemoData() {
  if (localStorage.getItem('mock_seeded_v2')) return;

  localStorage.removeItem('mock_students');
  localStorage.removeItem('mock_schools');
  localStorage.removeItem('mock_seeded');

  const students = [
    {
      docId: 'doc1', id: 'RK1700000001', schoolId: 'school-uid-001', uid: 'school-uid-001',
      name: 'Aarav Sharma', father: 'Rajesh Sharma', class: '5', section: 'A',
      mobile: '9876543210', address: 'Delhi', photo: null,
      createdAt: Date.now() - 86400000 * 2, updatedAt: Date.now() - 86400000 * 2
    },
    {
      docId: 'doc2', id: 'RK1700000002', schoolId: 'school-uid-001', uid: 'school-uid-001',
      name: 'Priya Singh', father: 'Amit Singh', class: '3', section: 'B',
      mobile: '9123456789', address: 'Noida', photo: null,
      createdAt: Date.now() - 86400000, updatedAt: Date.now() - 86400000
    },
    {
      docId: 'doc3', id: 'RK1700000003', schoolId: 'school-uid-001', uid: 'school-uid-001',
      name: 'Rohan Verma', father: 'Suresh Verma', class: '5', section: 'A',
      mobile: '9988776655', address: 'Gurgaon', photo: null,
      createdAt: Date.now() - 3600000, updatedAt: Date.now() - 3600000
    },
    {
      docId: 'doc4', id: 'RK1700000004', schoolId: 'school-uid-001', uid: 'school-uid-001',
      name: 'Sneha Gupta', father: 'Rakesh Gupta', class: '3', section: 'A',
      mobile: '9871234567', address: 'Delhi', photo: null,
      createdAt: Date.now() - 7200000, updatedAt: Date.now() - 7200000
    },
    {
      docId: 'doc5', id: 'RK1700000005', schoolId: 'school-uid-001', uid: 'school-uid-001',
      name: 'Arjun Patel', father: 'Vijay Patel', class: '7', section: 'B',
      mobile: '9765432109', address: 'Noida', photo: null,
      createdAt: Date.now() - 1800000, updatedAt: Date.now() - 1800000
    }
  ];

  const schools = [
    {
      id: 'school-uid-001', schoolName: 'Demo Public School', email: 'school@demo.com',
      uid: 'school-uid-001', city: 'Delhi',
      createdAt: Date.now() - 86400000 * 7, active: true
    }
  ];

  saveStudents(students);
  saveSchools(schools);
  localStorage.setItem('mock_seeded_v2', '1');
}

seedDemoData();

/**
 * Parse Firestore-style path
 */
function parsePath(segments) {
  if (segments.length === 5 &&
    segments[0] === 'schools' && segments[2] === 'classes' && segments[4] === 'students') {
    return { type: 'students', schoolId: segments[1], className: segments[3] };
  }
  if (segments.length === 1) return { type: segments[0] };
  return { type: 'unknown' };
}

/**
 * Get students for a specific class
 */
function getStudentsForClass(schoolId, className) {
  return getStudents().filter(s => s.schoolId === schoolId && s.class === className);
}

/**
 * Mock Collection class (simulates Firestore collection)
 */
class MockCollection {
  constructor(collectionName, pathSegments = [collectionName]) {
    this._segments = pathSegments || [collectionName];
    this._collectionName = collectionName;
  }

  doc(id) {
    return new MockDoc([...this._segments, id]);
  }

  where(field, op, value) {
    return new MockQuery(this._segments, [{ field, op, value }]);
  }

  orderBy() {
    return this;
  }

  async get() {
    const info = parsePath(this._segments);
    let data = [];

    if (info.type === 'students' && info.schoolId && info.className) {
      data = getStudentsForClass(info.schoolId, info.className);
    } else if (info.type === 'students') {
      data = getStudents();
    } else if (info.type === 'schools') {
      data = getSchools();
    } else if (info.type === 'users') {
      data = Object.entries(DEMO_USERS).map(([email, u]) => ({
        docId: u.uid, id: u.uid, role: u.role, email
      }));
    }

    return mockSnapshot(data);
  }

  async add(obj) {
    const docId = 'doc_' + Date.now() + '_' + Math.random().toString(36).slice(2);
    const info = parsePath(this._segments);

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

    return { id: docId };
  }
}

/**
 * Mock Document class
 */
class MockDoc {
  constructor(pathSegments) {
    this._path = pathSegments;
  }

  collection(subCol) {
    return new MockCollection(subCol, [...this._path, subCol]);
  }

  async get() {
    const isStudentDoc = this._path.length === 6 &&
      this._path[0] === 'schools' && this._path[2] === 'classes' && this._path[4] === 'students';
    const isSchoolDoc = this._path.length === 2 && this._path[0] === 'schools';
    const isUserDoc = this._path.length === 2 && this._path[0] === 'users';
    const docId = this._path[this._path.length - 1];

    let item = null;

    if (isUserDoc) {
      const found = Object.values(DEMO_USERS).find(u => u.uid === docId);
      if (found) {
        item = { role: found.role, email: Object.keys(DEMO_USERS).find(e => DEMO_USERS[e] === found) };
      }
    } else if (isStudentDoc) {
      item = getStudents().find(s => s.docId === docId) || null;
    } else if (isSchoolDoc) {
      item = getSchools().find(s => s.id === docId) || null;
    }

    return { exists: !!item, data: () => item, id: docId };
  }

  async set(obj) {
    if (this._path[0] === 'schools') {
      const arr = getSchools();
      const idx = arr.findIndex(s => s.id === this._path[1]);
      const item = { ...obj, id: this._path[1] };
      if (idx >= 0) arr[idx] = item; else arr.unshift(item);
      saveSchools(arr);
    }
  }

  async update(obj) {
    if (this._path[0] === 'schools') {
      const arr = getSchools();
      const idx = arr.findIndex(s => s.id === this._path[1]);
      if (idx >= 0) arr[idx] = { ...arr[idx], ...obj };
      saveSchools(arr);
    } else if (this._path[0] === 'students') {
      const arr = getStudents();
      const idx = arr.findIndex(s => s.docId === this._path[1]);
      if (idx >= 0) arr[idx] = { ...arr[idx], ...obj };
      saveStudents(arr);
    }
  }

  async delete() {
    if (this._path[0] === 'students') {
      saveStudents(getStudents().filter(s => s.docId !== this._path[1]));
    } else if (this._path[0] === 'schools') {
      saveSchools(getSchools().filter(s => s.id !== this._path[1]));
    }
  }
}

/**
 * Mock Query class
 */
class MockQuery {
  constructor(segments, filters = []) {
    this._segments = segments;
    this._filters = filters;
  }

  where(field, op, value) {
    return new MockQuery(this._segments, [...this._filters, { field, op, value }]);
  }

  orderBy() {
    return this;
  }

  limit() {
    return this;
  }

  async count() {
    const info = parsePath(this._segments);
    let data = info.type === 'students' && info.schoolId && info.className
      ? getStudentsForClass(info.schoolId, info.className)
      : info.type === 'students' ? getStudents() : getSchools();

    const filtered = applyFilters(data, this._filters);
    return { data: () => ({ count: filtered.length }) };
  }

  async get() {
    const info = parsePath(this._segments);
    let data = [];

    if (info.type === 'students' && info.schoolId && info.className) {
      data = getStudentsForClass(info.schoolId, info.className);
    } else if (info.type === 'students') {
      data = getStudents();
    } else if (info.type === 'schools') {
      data = getSchools();
    } else if (info.type === 'users') {
      data = Object.entries(DEMO_USERS).map(([email, u]) => ({
        docId: u.uid, id: u.uid, role: u.role, email
      }));
    }

    const filtered = applyFilters(data, this._filters);
    return mockSnapshot(filtered);
  }
}

/**
 * Apply filters to array
 */
function applyFilters(arr, filters) {
  return filters.reduce((acc, { field, op, val }) => {
    if (op === '==') return acc.filter(item => item[field] === val);
    return acc;
  }, arr);
}

/**
 * Create mock snapshot
 */
function mockSnapshot(arr) {
  const docs = arr.map(item => ({
    id: item.docId || item.id || '',
    data: () => ({ ...item }),
    ref: { delete: () => Promise.resolve() }
  }));
  return { docs, size: docs.length, empty: docs.length === 0, forEach(fn) { docs.forEach(fn); } };
}

/**
 * Mock Storage
 */
function mockStorage() {
  return {
    ref(path) {
      return {
        put(file) {
          return new Promise(resolve => {
            const reader = new FileReader();
            reader.onload = e => resolve({
              ref: {
                getDownloadURL: () => Promise.resolve(e.target.result),
                delete: () => Promise.resolve()
              }
            });
            reader.readAsDataURL(file);
          });
        },
        getDownloadURL: () => Promise.resolve('assets/placeholder.png'),
        delete: () => Promise.resolve()
      };
    },
    refFromURL() {
      return { delete: () => Promise.resolve() };
    }
  };
}

/**
 * Mock Auth
 */
class MockAuth {
  constructor() {
    this._currentUser = null;
    this._listeners = [];
  }

  get currentUser() {
    return this._currentUser;
  }

  onAuthStateChanged(fn) {
    this._listeners = [fn];
    const saved = localStorage.getItem('mock_session');
    if (saved) {
      try {
        this._currentUser = JSON.parse(saved);
        fn(this._currentUser);
      } catch (e) {
        localStorage.removeItem('mock_session');
        fn(null);
      }
    }
  }

  async signInWithEmailAndPassword(email, password) {
    const user = DEMO_USERS[email];
    if (!user || user.password !== password) {
      const err = new Error('Invalid email or password');
      err.code = 'auth/wrong-password';
      throw err;
    }
    this._currentUser = { uid: user.uid, email };
    localStorage.setItem('mock_session', JSON.stringify(this._currentUser));
    this._notifyListeners();
    return { user: this._currentUser };
  }

  async createUserWithEmailAndPassword(email, password) {
    if (DEMO_USERS[email]) {
      const err = new Error('Email already in use');
      err.code = 'auth/email-already-in-use';
      throw err;
    }
    const uid = 'school-uid-' + Date.now();
    DEMO_USERS[email] = { uid, password, role: 'school' };
    return { user: { uid, email } };
  }

  async signOut() {
    this._currentUser = null;
    localStorage.removeItem('mock_session');
    this._notifyListeners();
  }

  _notifyListeners() {
    this._listeners.forEach(fn => fn(this._currentUser));
  }
}

/**
 * Initialize Mock Firebase
 */
export function initializeMock() {
  console.log('🚀 Mock Firebase initialized');

  const mockAuth = new MockAuth();
  const mockStorage = mockStorage();

  const mockDb = {
    collection(name) {
      return new MockCollection(name, [name]);
    },
    batch() {
      return {
        delete() {},
        commit() { return Promise.resolve(); }
      };
    }
  };

  return {
    apps: [true],
    app() { return { options: {} }; },
    initializeApp(config, name) {
      if (name) return { auth() { return mockAuth; }, delete() { return Promise.resolve(); } };
      return window.mockFirebase;
    },
    auth() { return mockAuth; },
    firestore() { return mockDb; },
    storage() { return mockStorage; }
  };
}

/**
 * DB Helpers (same as firebase-config.js)
 */
export const dbStudents = (schoolId, className) =>
  window.mockFirebase.firestore()
    .collection('schools').doc(schoolId)
    .collection('classes').doc(className)
    .collection('students');

export const dbGetAllStudents = async (schoolId, filters = {}) => {
  let results = getStudents().filter(s => s.schoolId === schoolId);

  if (filters.class) results = results.filter(s => s.class === filters.class);
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

// Export for use in controllers
export { DEMO_USERS, getStudents, saveStudents, getSchools, saveSchools };
