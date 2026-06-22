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
     document.getElementById('totalTeachersAll').textContent = '-';

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

      // Attach handlers programmatically to avoid inline onclick XSS risks.
      const td1 = document.createElement('td');
      td1.innerHTML = `<strong>${safeName}</strong>${safeCity ? `<br><small style="color:var(--text-muted)">${safeCity}</small>` : ''}`;

      const td2 = document.createElement('td');
      td2.style.fontSize = '13px';
      td2.textContent = safeEmail;

      const td3 = document.createElement('td');
      td3.innerHTML = `<strong id="count_${school.id}">...</strong>`;

      const td4 = document.createElement('td');
      td4.innerHTML = `<strong id="tcount_${school.id}">...</strong>`;

      const td5 = document.createElement('td');
      td5.style.cssText = 'font-size:12px;color:var(--text-muted)';
      td5.textContent = school.createdAt ? new Date(school.createdAt).toLocaleDateString('en-IN') : '-';

      const td6 = document.createElement('td');
      td6.innerHTML = `<span class="badge ${active ? 'badge-active' : 'badge-inactive'}">${active ? 'Active' : 'Inactive'}</span>`;

       const td7 = document.createElement('td');
       td7.className = 'actions-cell';
       
       const buttonGroup = document.createElement('div');
       buttonGroup.className = 'button-group';
       
       const btnView = document.createElement('button');
       btnView.className = 'btn-print';
       btnView.textContent = '👁️ View';
       btnView.addEventListener('click', () => window.viewStudents(school.id, school.schoolName || ''));

       const btnEdit = document.createElement('button');
       btnEdit.className = 'primary';
       btnEdit.textContent = '✏️ Edit';
       btnEdit.addEventListener('click', () => window.editSchool(school.id));

       const btnToggle = document.createElement('button');
       btnToggle.className = active ? 'warning' : 'success';
       btnToggle.textContent = active ? '🔒 Disable' : '✅ Enable';
       btnToggle.addEventListener('click', () => window.toggleStatus(school.id, active));

       const btnDel = document.createElement('button');
       btnDel.className = 'danger';
       btnDel.textContent = '🗑️ Delete';
       btnDel.addEventListener('click', () => window.deleteSchool(school.id, school.schoolName || ''));
       
       buttonGroup.append(btnView, btnEdit, btnToggle, btnDel);
       td7.appendChild(buttonGroup);


      tr.append(td1, td2, td3, td4, td5, td6, td7);
      tbody.appendChild(tr);
    });

    document.getElementById('loadingSchools').style.display = 'none';
    document.getElementById('schoolsTable').style.display = 'table';

    // Fetch student and teacher counts in the background (parallelized per school).
    let total = 0;
    let totalTeachers = 0;
    for (const school of schools) {
      const [studentsResult, teachersResult] = await Promise.all([
        (async () => {
          try {
            const students = await window.dbGetAllStudents(school.id);
            const count = students.length;
            const el = document.getElementById('count_' + school.id);
            if (el) el.textContent = count;
            return count;
          } catch(e) {
            const el = document.getElementById('count_' + school.id);
            if (el) el.textContent = '0';
            return 0;
          }
        })(),
        (async () => {
          try {
            const teachers = await window.dbGetAllTeacherStaff(school.id);
            const tcount = teachers.length;
            const tel = document.getElementById('tcount_' + school.id);
            if (tel) tel.textContent = tcount;
            return tcount;
          } catch(e) {
            const tel = document.getElementById('tcount_' + school.id);
            if (tel) tel.textContent = '0';
            return 0;
          }
        })()
      ]);
      total += studentsResult;
      totalTeachers += teachersResult;
    }
    document.getElementById('totalStudentsAll').textContent = total;
    document.getElementById('totalTeachersAll').textContent = totalTeachers;

  } catch (err) {
    window.showToast('Schools load failed: ' + err.message, 'error');
    document.getElementById('loadingSchools').textContent = 'Failed to load. Please refresh.';
  }
};

/**
 * Open add school modal
 */
window.openAddModal = function() {
  // Close edit modal first if open
  if (typeof window.closeEditSchoolModal === 'function') {
    window.closeEditSchoolModal();
  }
  var modal = document.getElementById('addModal');
  if (modal) modal.classList.add('open');
};

/**
 * Close add school modal
 */
window.closeAddModal = function() {
  var modal = document.getElementById('addModal');
  if (modal) modal.classList.remove('open');
  var err = document.getElementById('addError');
  if (err) err.style.display = 'none';
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
    // Deletion log (frontend) - so deletedBy me email aata rahe
    try {
      const user = firebase.auth().currentUser;
      const deletedByEmail = user?.email || 'unknown_user_or_admin_operation';
      await firebase.firestore().collection('deletion_logs').add({
        collectionName: 'schools',
        documentPath: `schools/${schoolId}`,
        documentId: schoolId,
        deletedData: { schoolId },
        deletedAt: Date.now(),
        deletedBy: deletedByEmail,
        reason: 'School document deleted (frontend log)'
      });
    } catch (logErr) {
      console.warn('Failed to write school deletion log:', logErr.message);
    }

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
 * Open edit modal + prefill school data
 */
window.editSchool = async function(schoolId) {
  try {
    if (!schoolId) {
      throw new Error('School ID is missing');
    }

    const editModal = document.getElementById('editModal');
    const editError = document.getElementById('editError');
    const editSchoolIdEl = document.getElementById('editSchoolId');
    const editSchoolNameEl = document.getElementById('editSchoolName');
    const editSchoolEmailEl = document.getElementById('editSchoolEmail');
    const editSchoolCityEl = document.getElementById('editSchoolCity');

    if (!editModal || !editSchoolIdEl || !editSchoolNameEl || !editSchoolEmailEl) {
      throw new Error('Modal form elements not found in DOM');
    }

    const snap = await firebase.firestore().collection('schools').doc(schoolId).get();

    if (!snap.exists) {
      throw new Error('School not found in database');
    }

    const data = snap.data() || {};

    editSchoolIdEl.value = schoolId;
    editSchoolNameEl.value = data.schoolName || '';
    editSchoolEmailEl.value = data.email || '';
    if (editSchoolCityEl) {
      editSchoolCityEl.value = data.city || '';
    }

    if (typeof window.closeAddModal === 'function') {
      window.closeAddModal();
    }

    if (editError) {
      editError.style.display = 'none';
      editError.textContent = '';
      editError.classList.remove('open');
    }

    editModal.classList.add('open');

  } catch (err) {
    const editError = document.getElementById('editError');
    if (editError) {
      editError.textContent = '❌ Error: ' + err.message;
      editError.style.display = 'block';
    }
    window.showToast('⚠️ Edit failed: ' + err.message, 'error');
  }
};

/**
 * Update school details (only schoolName, email, city)
 */
window.updateSchool = async function(e) {
  if (e && typeof e.preventDefault === 'function') {
    e.preventDefault();
  }

  const schoolId = document.getElementById('editSchoolId')?.value || '';
  const errEl = document.getElementById('editError');
  try {
    if (errEl) {
      errEl.style.display = 'none';
      errEl.textContent = '';
    }

    if (!schoolId) {
      throw new Error('School ID is missing');
    }

    const schoolName = document.getElementById('editSchoolName')?.value.trim() || '';
    const email = document.getElementById('editSchoolEmail')?.value.trim() || '';
    const city = document.getElementById('editSchoolCity')?.value.trim() || '';

    if (!schoolName) throw new Error('School Name is required');
    if (!email) throw new Error('Email is required');

    const updatePayload = {
      schoolName,
      email,
      city
    };

    await firebase.firestore().collection('schools').doc(schoolId).update(updatePayload);
    window.showToast('✅ School updated successfully', 'success');
    document.getElementById('editModal').classList.remove('open');
    window.loadSchools();
  } catch (err) {
    if (errEl) {
      errEl.textContent = '❌ ' + err.message;
      errEl.style.display = 'block';
    }
    window.showToast('Update failed: ' + err.message, 'error');
  }
};


/**
 * Admin logout
 */
window.adminLogout = async function() {
   await firebase.auth().signOut();
   window.location.href = 'index.html';
};