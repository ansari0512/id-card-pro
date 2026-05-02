/**
 * Helper Utilities
 * Common utility functions for the ID Card System
 */

// Debug: confirm helpers loaded
console.log('✅ helpers.js loaded');

/**
 * Generate unique student ID (RK + timestamp)
 */
window.generateStudentId = function() {
  return 'RK' + Date.now();
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

/**
 * Check if app is in mock mode
 */
window.isMockMode = function() {
  // Mock mode is active when window.MOCK_MODE flag is set (by mock-firebase.js)
  return window.MOCK_MODE === true;
};

/**
 * DB helpers (mock mode compatible)
 */
window.dbStudents = function(schoolId, className) {
  return window.firebase.firestore()
    .collection('schools').doc(schoolId)
    .collection('classes').doc(className)
    .collection('students');
};

window.dbGetAllStudents = async function(schoolId, filters = {}) {
  if (window.isMockMode()) {
    const students = JSON.parse(localStorage.getItem('mock_students') || '[]');
    let results = students.filter(s => s.schoolId === schoolId);

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
  }

  // Real Firebase - not implemented in mock mode
  return [];
};
