/**
 * Admin Controller
 * Handles admin panel operations (admin-panel.html, admin-students.html)
 */

// Admin state
window.adminUser = null;

/**
 * Initialize admin panel
 */
window.initAdminPanel = function() {
  window.initAuth(async (user, role) => {
     if (!user) {
       window.location.href = 'index.html';
       return;
     }

    if (role !== 'admin') {
      window.location.href = 'dashboard.html';
      return;
    }

    window.adminUser = user;
    document.getElementById('adminEmail').textContent = user.email;
    window.loadSchools();
  });
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

     document.getElementById('totalSchools').textContent = schools.length;
     document.getElementById('activeSchools').textContent = schools.filter(s => s.active !== false).length;
     document.getElementById('inactiveSchools').textContent = schools.filter(s => s.active === false).length;
     document.getElementById('totalStudentsAll').textContent = '-';

    const tbody = document.getElementById('schoolsBody');
    tbody.innerHTML = '';

    if (schools.length === 0) {
      document.getElementById('loadingSchools').style.display = 'none';
      document.getElementById('emptySchools').style.display = 'block';
      return;
    }

    schools.forEach(school => {
      const active = school.active !== false;
      const safeName = window.sanitize(school.schoolName || 'N/A');
      const safeCity = window.sanitize(school.city || '');
      const safeEmail = window.sanitize(school.email || '-');
      const tr = document.createElement('tr');

      // Buttons data-* attributes se attach karo — inline onclick XSS se bachao
      const td1 = document.createElement('td');
      td1.innerHTML = `<strong>${safeName}</strong>${safeCity ? `<br><small style="color:var(--text-muted)">${safeCity}</small>` : ''}`;

      const td2 = document.createElement('td');
      td2.style.fontSize = '13px';
      td2.textContent = safeEmail;

      const td3 = document.createElement('td');
      td3.innerHTML = `<strong id="count_${school.id}">...</strong>`;

      const td4 = document.createElement('td');
      td4.style.cssText = 'font-size:12px;color:var(--text-muted)';
      td4.textContent = school.createdAt ? new Date(school.createdAt).toLocaleDateString('en-IN') : '-';

      const td5 = document.createElement('td');
      td5.innerHTML = `<span class="badge ${active ? 'badge-active' : 'badge-inactive'}">${active ? 'Active' : 'Inactive'}</span>`;

       const td6 = document.createElement('td');
       td6.className = 'actions-cell';
       
       const buttonGroup = document.createElement('div');
       buttonGroup.className = 'button-group';
       
       const btnView = document.createElement('button');
       btnView.className = 'secondary';
       btnView.textContent = '👁️ View';
       btnView.addEventListener('click', () => window.viewStudents(school.id, school.schoolName || ''));

       const btnToggle = document.createElement('button');
       btnToggle.className = 'secondary';
       btnToggle.textContent = active ? '🔒 Disable' : '✅ Enable';
       btnToggle.addEventListener('click', () => window.toggleStatus(school.id, active));

       const btnDel = document.createElement('button');
       btnDel.className = 'danger';
       btnDel.textContent = '🗑️ Delete';
       btnDel.addEventListener('click', () => window.deleteSchool(school.id, school.schoolName || ''));
       
       buttonGroup.append(btnView, btnToggle, btnDel);
       td6.appendChild(buttonGroup);

      tr.append(td1, td2, td3, td4, td5, td6);
      tbody.appendChild(tr);
    });

    document.getElementById('loadingSchools').style.display = 'none';
    document.getElementById('schoolsTable').style.display = 'table';

    // Student counts fetch karo background mein
    let total = 0;
    for (const school of schools) {
      try {
        const students = await window.dbGetAllStudents(school.id);
        const count = students.length;
        total += count;
        const el = document.getElementById('count_' + school.id);
        if (el) el.textContent = count;
      } catch(e) {
        const el = document.getElementById('count_' + school.id);
        if (el) el.textContent = '0';
      }
    }
    document.getElementById('totalStudentsAll').textContent = total;

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
      window.dbStudents(schoolId, s.class).doc(s.docId || s.id).delete()
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
   window.location.href = 'index.html';
};
