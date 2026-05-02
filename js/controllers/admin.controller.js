/**
 * Admin Controller
 * Handles admin panel operations (admin-panel.html, admin-students.html)
 */

// Admin state
window.adminUser = null;

/**
 * Initialize admin panel
 */
window.initAdminPanel = async function() {
  const user = firebase.auth().currentUser;
  if (!user) {
    window.location.href = 'login.html';
    return;
  }

  const userDoc = await firebase.firestore().collection('users').doc(user.uid).get();
  if (!userDoc.exists || userDoc.data().role !== 'admin') {
    window.location.href = 'dashboard.html';
    return;
  }

  window.adminUser = user;
  document.getElementById('adminEmail').textContent = user.email;
  window.loadSchools();
};

/**
 * Load all schools with student counts
 */
window.loadSchools = async function() {
  try {
    const snapshot = await firebase.firestore()
      .collection('schools')
      .orderBy('createdAt', 'desc')
      .get();

    const schools = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    const totalCount = 0;
    const studentCounts = {};

    // Fetch student counts for each school
    for (const school of schools) {
      const students = await window.dbGetAllStudents(school.id);
      studentCounts[school.id] = students.length;
      totalCount += students.length;
    }

    document.getElementById('totalSchools').textContent = schools.length;
    document.getElementById('activeSchools').textContent = schools.filter(s => s.active !== false).length;
    document.getElementById('totalStudentsAll').textContent = totalCount;

    const tbody = document.getElementById('schoolsBody');
    tbody.innerHTML = '';

    if (schools.length === 0) {
      document.getElementById('loadingSchools').style.display = 'none';
      document.getElementById('emptySchools').style.display = 'block';
      return;
    }

    schools.forEach(school => {
      const count = studentCounts[school.id] || 0;
      const active = school.active !== false;
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${school.schoolName || 'N/A'}</strong>${school.city ? `<br><small style="color:var(--text-muted)">${school.city}</small>` : ''}</td>
        <td style="font-size:13px;">${school.email || '-'}</td>
        <td><strong>${count}</strong></td>
        <td style="font-size:12px;color:var(--text-muted);">${school.createdAt ? new Date(school.createdAt).toLocaleDateString('en-IN') : '-'}</td>
        <td><span class="badge ${active ? 'badge-active' : 'badge-inactive'}">${active ? 'Active' : 'Inactive'}</span></td>
        <td>
          <button class="secondary" style="padding:4px 10px;font-size:12px;" onclick="window.viewStudents('${school.id}', '${(school.schoolName||'').replace(/'/g,'')}')">👁️ Students</button>
          <button class="secondary" style="padding:4px 10px;font-size:12px;margin-left:4px;" onclick="window.toggleStatus('${school.id}', ${active})">${active ? '🔒 Disable' : '✅ Enable'}</button>
          <button class="danger" style="padding:4px 10px;font-size:12px;margin-left:4px;" onclick="window.deleteSchool('${school.id}', '${(school.schoolName||'').replace(/'/g,'')}')">🗑️</button>
        </td>
      `;
      tbody.appendChild(tr);
    });

    document.getElementById('loadingSchools').style.display = 'none';
    document.getElementById('schoolsTable').style.display = 'table';
  } catch (err) {
    window.showToast('Schools load failed: ' + err.message, 'error');
    document.getElementById('loadingSchools').textContent = 'Failed to load. Please refresh.';
  }
};

/**
 * Open add school modal
 */
window.openAddModal = function() {
  document.getElementById('addModal').classList.add('open');
};

/**
 * Close add school modal
 */
window.closeAddModal = function() {
  document.getElementById('addModal').classList.remove('open');
  document.getElementById('addError').style.display = 'none';
};

/**
 * Create new school
 */
window.createSchool = async function(e) {
  e.preventDefault();
  const btn = document.getElementById('addBtn');
  const btnText = btn.querySelector('.btn-text');
  const errEl = document.getElementById('addError');

  errEl.style.display = 'none';

  const name = document.getElementById('newSchoolName').value.trim();
  const email = document.getElementById('newSchoolEmail').value.trim();
  const password = document.getElementById('newSchoolPassword').value;
  const city = document.getElementById('newSchoolCity').value.trim();

  btn.disabled = true;
  btnText.textContent = '⏳ Creating...';

  try {
    await window.createSchoolAccount(email, password, {
      schoolName: name,
      city,
      active: true
    });

    window.showToast(`✅ Account created for "${name}"!`, 'success');
    window.closeAddModal();
    document.getElementById('addSchoolForm').reset();
    window.loadSchools();
  } catch (err) {
    const errMap = {
      'auth/email-already-in-use': 'This email is already registered',
      'auth/invalid-email': 'Invalid email address',
      'auth/weak-password': 'Password must be at least 6 characters'
    };
    errEl.textContent = errMap[err.code] || err.message;
    errEl.style.display = 'block';
  } finally {
    btn.disabled = false;
    btnText.textContent = '✅ Create Account';
  }
};

/**
 * Toggle school status
 */
window.toggleStatus = async function(schoolId, currentActive) {
  try {
    await firebase.firestore().collection('schools').doc(schoolId).update({
      active: !currentActive
    });
    window.showToast(currentActive ? 'School disabled' : 'School enabled', 'success');
    window.loadSchools();
  } catch (err) {
    window.showToast('Update failed: ' + err.message, 'error');
  }
};

/**
 * Delete school
 */
window.deleteSchool = async function(schoolId, schoolName) {
  if (!confirm(`Are you sure you want to delete "${schoolName}"? This action cannot be undone.`)) return;

  try {
    const students = await window.dbGetAllStudents(schoolId);
    await Promise.all(students.map(s =>
      window.dbStudents(schoolId, s.class).doc(s.docId).delete()
    ));

    await firebase.firestore().collection('schools').doc(schoolId).delete();

    window.showToast('School deleted successfully', 'success');
    window.loadSchools();
  } catch (err) {
    window.showToast('Delete failed: ' + err.message, 'error');
  }
};

/**
 * View school students (admin-students page)
 */
window.viewStudents = function(schoolId, schoolName) {
  window.location.href = `admin-students.html?schoolId=${schoolId}&schoolName=${encodeURIComponent(schoolName)}`;
};

/**
 * Admin logout
 */
window.adminLogout = async function() {
  await firebase.auth().signOut();
  window.location.href = 'login.html';
};
