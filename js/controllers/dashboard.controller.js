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
    window.setupDashboardListeners();
  });
};

/**
 * Load statistics
 */
window.loadStats = async function(user) {
  try {
    const students = await window.dbGetAllStudents(user.uid);
    document.getElementById('totalStudents').textContent = students.length;
  } catch (e) {
    console.error('Stats load failed:', e);
  }
};

/**
 * Setup dashboard event listeners
 */
window.setupDashboardListeners = function() {};

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

    const csv = [headers, ...rows]
      .map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `students_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

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
 * Open delete by class modal
 */
window.openDeleteClassModal = function() {
  document.getElementById('deleteClassSelect').value = '';
  document.getElementById('deleteClassCount').textContent = '';
  document.getElementById('deleteClassModal').style.display = 'flex';
};

/**
 * Close delete by class modal
 */
window.closeDeleteClassModal = function() {
  document.getElementById('deleteClassModal').style.display = 'none';
};

/**
 * Class selection change handler — DOMContentLoaded ke baad attach karo
 */
function attachDeleteClassListener() {
  document.getElementById('deleteClassSelect')?.addEventListener('change', async function() {
    const cls = this.value;
    const countEl = document.getElementById('deleteClassCount');
    if (!cls) { countEl.textContent = ''; return; }
    try {
      const user = firebase.auth().currentUser;
      const students = await window.dbGetAllStudents(user.uid, { class: cls });
      countEl.textContent = students.length > 0
        ? `⚠️ ${students.length} student(s) will be deleted from Class ${cls}`
        : `No students found in Class ${cls}`;
      countEl.style.color = students.length > 0 ? '#ef4444' : 'var(--text-muted)';
    } catch (e) {
      countEl.textContent = 'Error loading count';
    }
  });
}

/**
 * Confirm delete by class
 */
window.confirmDeleteByClass = async function() {
  const cls = document.getElementById('deleteClassSelect').value;
  if (!cls) {
    window.showToast('Please select a class', 'error');
    return;
  }

  try {
    const user = firebase.auth().currentUser;
    const students = await window.dbGetAllStudents(user.uid, { class: cls });
    if (!students.length) {
      window.showToast(`No students in Class ${cls}`, 'error');
      return;
    }

    if (!confirm(`Delete all ${students.length} students from Class ${cls}?`)) return;

    const btn = document.getElementById('confirmDeleteClassBtn');
    const btnText = document.getElementById('deleteClassBtnText');
    btn.disabled = true;
    btnText.textContent = '⏳ Deleting...';

    await Promise.all(students.map(s =>
      window.dbStudents(user.uid, cls).doc(s.docId || s.id).delete()
    ));

    window.showToast(`✅ Deleted ${students.length} students from Class ${cls}`, 'success');
    window.closeDeleteClassModal();
    window.loadStats(user);
  } catch (e) {
    window.showToast('Delete failed: ' + e.message, 'error');
  } finally {
    btn.disabled = false;
    btnText.textContent = '🗑️ Delete';
  }
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
  attachDeleteClassListener();
});
