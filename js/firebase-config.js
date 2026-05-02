// ── Firebase Configuration ────────────────────────────────
// Apni Firebase project ki values yahan fill karo
const firebaseConfig = {
  apiKey:            "AIzaSyCyUuz7QVLswGTs9RwdDNy1RSDYUKEyfIw",
  authDomain:        "my-id-card-app-b2bbc.firebaseapp.com",
  projectId:         "my-id-card-app-b2bbc",
  storageBucket:     "my-id-card-app-b2bbc.firebasestorage.app",
  messagingSenderId: "335385118535",
  appId:             "1:335385118535:web:14033f686c0216a771ae62"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

// ── DB Helpers ────────────────────────────────────────────
// schools/{schoolId}/classes/{className}/students
window.dbStudents = (schoolId, className) =>
  firebase.firestore()
    .collection('schools').doc(schoolId)
    .collection('classes').doc(className)
    .collection('students');

// Sabhi classes ke students fetch karo (parallel)
const ALL_CLASSES = ['Nursery','LKG','UKG','KG','1','2','3','4','5','6','7','8','9','10'];

window.dbGetAllStudents = async (schoolId, filters = {}) => {
  const targetClasses = filters.class ? [filters.class] : ALL_CLASSES;

  const snapshots = await Promise.all(
    targetClasses.map(cls => {
      let q = dbStudents(schoolId, cls);
      if (filters.section) q = q.where('section', '==', filters.section);
      return q.orderBy('createdAt', 'desc').get()
        .then(snap => snap.docs.map(d => ({ docId: d.id, ...d.data() })));
    })
  );

  let results = snapshots.flat();

  if (filters.search) {
    const q = filters.search.toLowerCase();
    results = results.filter(s =>
      s.name?.toLowerCase().includes(q) || s.id?.toLowerCase().includes(q)
    );
  }

  return results.sort((a, b) => b.createdAt - a.createdAt);
};
