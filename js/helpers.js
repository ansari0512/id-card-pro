/**
 * Helper Utilities
 * Common utility functions for the ID Card System
 */

/**
 * Format date to Indian format
 */
window.formatDateIndian = function(timestamp) {
  if (!timestamp) return '-';
  return new Date(timestamp).toLocaleDateString('en-IN');
};

/**
 * Capitalize first letter of each word
 */
window.toProperCase = function(str) {
  if (typeof str !== 'string') return str;
  return str.replace(/\w\S*/g, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
};

/**
 * Sanitize HTML (prevent XSS)
 */
window.sanitize = function(str) {
  if (typeof str !== 'string') return str;
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
};

/**
 * Show toast notification
 */
window.showToast = function(msg, type = 'info') {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.textContent = msg;
  toast.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 12px 24px;
    background: ${type === 'error' ? '#ef4444' : type === 'success' ? '#22c55e' : '#3b82f6'};
    color: white;
    border-radius: 8px;
    z-index: 99999;
    font-family: Poppins, sans-serif;
    font-size: 14px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
  `;

  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
};

/**
 * Export data to CSV
 */
window.exportToCSV = function(data, filename) {
  if (!data || data.length === 0) return;

  const headers = Object.keys(data[0]);
  const rows = data.map(row => headers.map(header => {
    const value = row[header] || '';
    return `"${String(value).replace(/"/g, '""')}"`;
  }).join(','));

  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `export_${new Date().toISOString().slice(0,10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

/**
 * Debounce function
 */
window.debounce = function(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

window.ALL_CLASSES = ['Nursery','LKG','UKG','KG','1','2','3','4','5','6','7','8','9','10'];

/**
 * Upload photo — shared by id-form aur student controller
 * path: student_photos/{schoolName}/{className}/{studentName}_{studentId}.ext
 */
window.uploadPhoto = async function(userId, studentId, file, className, studentName) {
  let schoolName = 'School';
  try {
    const schoolDoc = await firebase.firestore().collection('schools').doc(userId).get();
    if (schoolDoc.exists) schoolName = schoolDoc.data().schoolName || 'School';
  } catch(e) {}

  const cls     = (className   || 'Unknown').replace(/[^a-zA-Z0-9 _-]/g, '');
  const sName   = (studentName || studentId).replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '');
  const ext     = file.type.includes('png') ? 'png' : 'jpg';
  const safeSch = schoolName.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '');

  const path = `student_photos/${safeSch}/${cls}/${sName}_${studentId}.${ext}`;
  const storageRef = firebase.storage().ref(path);
  const snapshot = await storageRef.put(file);
  return await snapshot.ref.getDownloadURL();
};

/**
 * Delete photo from Firebase Storage
 * Extracts path from photo URL and deletes the file
 */
window.deletePhoto = async function(photoUrl) {
  if (!photoUrl) return;
  try {
    // Check if user is logged in
    const user = firebase.auth().currentUser;
    if (!user) {
      console.warn('User not logged in, skipping photo delete');
      return;
    }
    
    const storageRef = firebase.storage().refFromURL(photoUrl);
    await storageRef.delete();
  } catch (error) {
    console.warn('Photo delete failed:', error.message);
    // Don't throw error - continue with student deletion
  }
};

/**
 * Generate unique student ID using Firestore transaction (race condition safe)
 * Format: {SCHOOLCODE}-{YEAR}-{0001}
 */
window.generateStudentId = async function(schoolId) {
  const year = new Date().getFullYear();
  const db = firebase.firestore();

  let schoolCode = 'SCH';
  try {
    const schoolDoc = await db.collection('schools').doc(schoolId).get();
    if (schoolDoc.exists) {
      schoolCode = (schoolDoc.data().schoolName || '')
        .split(/\s+/).filter(w => w.length > 0)
        .map(w => w[0].toUpperCase()).join('').slice(0, 4) || 'SCH';
    }
  } catch(e) {}

  // Counter document use karo — race condition safe
  const counterRef = db.collection('schools').doc(schoolId)
    .collection('counters').doc(String(year));

  const newSerial = await db.runTransaction(async tx => {
    const doc = await tx.get(counterRef);
    const next = doc.exists ? doc.data().count + 1 : 1;
    tx.set(counterRef, { count: next });
    return next;
  });

  return `${schoolCode}-${year}-${String(newSerial).padStart(4, '0')}`;
};

window.dbStudents = function(schoolId, className) {
  return firebase.firestore()
    .collection('schools').doc(schoolId)
    .collection('classes').doc(className)
    .collection('students');
};

window.dbGetAllStudents = async function(schoolId, filters = {}) {
  const targetClasses = filters.class ? [filters.class] : window.ALL_CLASSES;

  const snapshots = await Promise.all(
    targetClasses.map(cls => {
      let q = window.dbStudents(schoolId, cls);
      if (filters.section) q = q.where('section', '==', filters.section);
      return q.get().then(snap =>
        snap.docs.map(d => ({ docId: d.id, ...d.data() }))
      ).catch(() => []);
    })
  );

  let results = snapshots.flat().sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

  if (filters.search) {
    const q = filters.search.toLowerCase();
    results = results.filter(s =>
      s.name?.toLowerCase().includes(q) || s.id?.toLowerCase().includes(q)
    );
  }

  return results;
};
