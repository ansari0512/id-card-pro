/**
 * Helper Utilities
 * Common utility functions for the ID Card System
 */

/**
 * Generate unique student ID: {SCHOOLCODE}-{YEAR}-{0001}
 */
window.generateStudentId = async function(schoolId) {
  const year = new Date().getFullYear();

  // School name fetch karo
  let schoolCode = 'SCH';
  try {
    const schoolDoc = await firebase.firestore().collection('schools').doc(schoolId).get();
    if (schoolDoc.exists) {
      const schoolName = schoolDoc.data().schoolName || '';
      // Har word ka pehla letter lo, max 4 letters, uppercase
      schoolCode = schoolName
        .split(/\s+/)
        .filter(w => w.length > 0)
        .map(w => w[0].toUpperCase())
        .join('')
        .slice(0, 4) || 'SCH';
    }
  } catch(e) {}

  // Is school ke is saal ke students count karo
  const allStudents = await window.dbGetAllStudents(schoolId);
  const thisYearCount = allStudents.filter(s => {
    const d = new Date(s.createdAt);
    return d.getFullYear() === year;
  }).length;

  const serial = String(thisYearCount + 1).padStart(4, '0');
  return `${schoolCode}-${year}-${serial}`;
};

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
