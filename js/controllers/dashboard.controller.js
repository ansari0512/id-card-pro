/**
 * Dashboard Controller
 * Handles dashboard page (dashboard.html)
 */

window.dashboardUser = null;

/**
 * Initialize dashboard
 */
window.initDashboard = function() {
  window.initAuth(async (user, role) => {
     if (!user) {
       window.location.href = 'index.html';
       return;
     }

    if (role === 'admin') {
      window.location.href = 'admin-panel.html';
      return;
    }

    window.dashboardUser = user;
    document.getElementById('userEmail').textContent = user.email;
    await window.loadStats(user);

    // Setup event listeners
    // (no longer needed - empty placeholder removed)
  });
};

/**
 * Load statistics
 */
window.loadStats = async function(user) {
  try {
    // Fetch the school name.
    const schoolDoc = await firebase.firestore().collection('schools').doc(user.uid).get();
    const schoolName = schoolDoc.exists ? (schoolDoc.data().schoolName || '') : '';

    // Show it on the dashboard.
    const nameEl = document.getElementById('schoolNameDisplay');
    if (nameEl) nameEl.textContent = schoolName ? '🏫 ' + schoolName : 'Dashboard';

    const students = await window.dbGetAllStudents(user.uid);
    document.getElementById('totalStudents').textContent = students.length;

    // With photos count
    const withPhotos = students.filter(s => s.photo).length;
    const activeEl = document.getElementById('activeStudents');
    if (activeEl) activeEl.textContent = withPhotos;

    // Pending count
    const pendingSnap = await firebase.firestore().collection('schools').doc(user.uid).collection('pending_students').get();
    const pendingEl = document.getElementById('pendingStudents');
    if (pendingEl) pendingEl.textContent = pendingSnap.size;

    // Staff count
    const staffSnap = await firebase.firestore().collection('schools').doc(user.uid).collection('teachers').get();
    const staffEl = document.getElementById('totalStaff');
    if (staffEl) staffEl.textContent = staffSnap.size;
  } catch (e) {
    console.error('Stats load failed:', e);
  }
};

/**
 * Export students CSV
 */
window.exportStudents = async function() {
  try {
    const user = firebase.auth().currentUser;
    const students = await window.dbGetAllStudents(user.uid);
    if (!students.length) {
      window.showToast('No students to export', 'error');
      return;
    }

    const headers = ['Student ID', 'Name', 'Father Name', 'Class', 'Section', 'Mobile', 'Address', 'Added On'];
    const rows = students.map(s => [
      s.id || '',
      s.name || '',
      s.father || '',
      s.class || '',
      s.section || '',
      s.mobile || '',
      s.address || '',
      s.createdAt ? new Date(s.createdAt).toLocaleDateString('en-IN') : ''
    ]);

    window.csvDownload(headers, rows, 'students_' + new Date().toISOString().slice(0, 10) + '.csv');

    window.showToast(`Exported ${students.length} students`, 'success');
  } catch (e) {
    window.showToast('Export failed: ' + e.message, 'error');
  }
};

/**
 * Bulk delete all students
 */
window.confirmBulkDelete = async function() {
  if (!confirm('Delete ALL students? This cannot be undone!')) return;
  try {
    const user = firebase.auth().currentUser;
    const students = await window.dbGetAllStudents(user.uid);
    if (!students.length) {
      window.showToast('No students to delete', 'error');
      return;
    }
    await Promise.all(students.map(s =>
      window.dbStudents(user.uid, s.class).doc(s.docId || s.id).delete()
    ));
    window.showToast(`Deleted ${students.length} students`, 'success');
    window.loadStats(user);
  } catch (e) {
    window.showToast('Delete failed: ' + e.message, 'error');
  }
};

/**
 * Override switchTab to redirect to students page
 * (Original importCSV calls this after successful import)
 */
window.switchTab = function(tab) {
  window.location.href = 'students.html?tab=' + tab;
};

/**
 * Logout
 */
window.logout = async function() {
  try {
   await firebase.auth().signOut();
   window.location.href = 'index.html';
  } catch (e) {
    window.showToast('Logout failed: ' + e.message, 'error');
  }
};

// Auto-init on page load
document.addEventListener('DOMContentLoaded', function() {
  window.initDashboard();
});
