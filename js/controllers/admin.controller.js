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
      // Show Login ID for new schools, fallback to email for old schools
      const displayLogin = school.loginId || school.email || '-';
      const safeDisplay = window.sanitize(displayLogin);
      const tr = document.createElement('tr');

      // Attach handlers programmatically to avoid inline onclick XSS risks.
      const td1 = document.createElement('td');
      td1.innerHTML = `<strong>${safeName}</strong>${safeCity ? `<br><small style="color:var(--text-muted)">${safeCity}</small>` : ''}`;

      const td2 = document.createElement('td');
      td2.style.fontSize = '13px';
      td2.textContent = safeDisplay;

      const td3 = document.createElement('td');
      td3.innerHTML = `<strong id="count_${school.id}">...</strong>`;

      const td4 = document.createElement('td');
      td4.innerHTML = `<strong id="tcount_${school.id}">...</strong>`;

      const td5 = document.createElement('td');
      td5.style.cssText = 'font-size:12px;color:var(--text-muted)';
      td5.textContent = school.createdAt ? new Date(school.createdAt).toLocaleDateString('en-IN') : '-';

      const td6 = document.createElement('td');
      td6.innerHTML = `<span class="badge ${active ? 'badge-active' : 'badge-inactive'}">${active ? 'Active' : 'Inactive'}</span>`;

      // Card Lock Status column — student-level lock only
      const tdLock = document.createElement('td');
      tdLock.innerHTML = `<span class="badge badge-active" id="lockStatus_${school.id}">🔓 All Unlocked</span>`;

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


      tr.append(td1, td2, td3, td4, td5, td6, tdLock, td7);
      tbody.appendChild(tr);
    });

    document.getElementById('loadingSchools').style.display = 'none';
    document.getElementById('schoolsTable').style.display = 'table';

    // Fetch student and teacher counts for all schools in parallel.
    const counts = await Promise.all(schools.map(async (school) => {
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
      return { students: studentsResult, teachers: teachersResult };
    }));

    // Update lock status for each school based on locked count vs total students
    schools.forEach((school, idx) => {
      const lockEl = document.getElementById('lockStatus_' + school.id);
      if (!lockEl) return;
      const lockedCount = (school.lockedStudentIds || []).length;
      const totalStudents = counts[idx] ? counts[idx].students : 0;
      if (lockedCount === 0) {
        lockEl.className = 'badge badge-active';
        lockEl.textContent = '🔓 All Unlocked';
      } else if (totalStudents > 0 && lockedCount >= totalStudents) {
        lockEl.className = 'badge badge-inactive';
        lockEl.textContent = '🔒 All Locked (' + lockedCount + ')';
      } else {
        lockEl.className = 'badge badge-inactive';
        lockEl.textContent = '🔒 Some Locked (' + lockedCount + '/' + totalStudents + ')';
      }
    });

    const total = counts.reduce((sum, c) => sum + c.students, 0);
    const totalTeachers = counts.reduce((sum, c) => sum + c.teachers, 0);
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
 * Validate Login ID format
 */
window.validateLoginId = function(loginId) {
  const trimmed = (loginId || '').trim();
  if (trimmed.length < 4) return { valid: false, error: 'Login ID must be at least 4 characters' };
  if (trimmed.length > 20) return { valid: false, error: 'Login ID must not exceed 20 characters' };
  if (!/^[A-Za-z0-9\-_]+$/.test(trimmed)) return { valid: false, error: 'Login ID can only contain letters, numbers, hyphen (-), and underscore (_)' };
  return { valid: true, error: null };
};

/**
 * Check Login ID availability in real-time
 */
window.checkLoginIdAvailability = async function() {
  const input = document.getElementById('newSchoolLoginId');
  const availability = document.getElementById('loginIdAvailability');
  const rawValue = input.value.trim();
  const loginId = rawValue.toUpperCase();
  
  // Auto-convert to uppercase while typing
  if (input.value !== rawValue.toUpperCase()) {
    input.value = rawValue.toUpperCase();
  }

  const validation = window.validateLoginId(loginId);
  if (!validation.valid) {
    availability.style.display = 'none';
    return;
  }

  try {
    const snapshot = await firebase.firestore()
      .collection('schools')
      .where('loginId', '==', loginId)
      .limit(1)
      .get();

    if (!snapshot.empty) {
      availability.style.display = 'block';
      availability.style.color = 'var(--color-error, #e74c3c)';
      availability.textContent = '❌ Login ID "' + loginId + '" already exists';
    } else {
      availability.style.display = 'block';
      availability.style.color = 'var(--color-success, #2ecc71)';
      availability.textContent = '✔ Login ID "' + loginId + '" is available';
    }
  } catch (e) {
    availability.style.display = 'none';
  }
};

/**
 * Create new school with Login ID
 */
window.createSchool = async function(e) {
  e.preventDefault();
  const btn = document.getElementById('addBtn');
  const btnText = btn.querySelector('.btn-text');
  const errEl = document.getElementById('addError');

  errEl.style.display = 'none';

  const name = document.getElementById('newSchoolName').value.trim();
  const loginIdRaw = document.getElementById('newSchoolLoginId').value.trim();
  const loginId = loginIdRaw.toUpperCase();
  const email = document.getElementById('newSchoolEmail').value.trim();
  const password = document.getElementById('newSchoolPassword').value;
  const city = document.getElementById('newSchoolCity').value.trim();

  // Validate Login ID
  const validation = window.validateLoginId(loginId);
  if (!validation.valid) {
    errEl.textContent = validation.error;
    errEl.style.display = 'block';
    return;
  }

  btn.disabled = true;
  btnText.textContent = '⏳ Creating...';

  try {
    // Check uniqueness
    const dupCheck = await firebase.firestore()
      .collection('schools')
      .where('loginId', '==', loginId)
      .limit(1)
      .get();

    if (!dupCheck.empty) {
      throw new Error('Login ID "' + loginId + '" is already taken. Please choose another.');
    }

    await window.createSchoolAccount(loginId, email, password, {
      schoolName: name,
      city,
      active: true
    });

    window.showToast(`✅ Account created for "${name}"!`, 'success');
    window.closeAddModal();
    document.getElementById('addSchoolForm').reset();
    const availabilityEl = document.getElementById('loginIdAvailability');
    if (availabilityEl) availabilityEl.style.display = 'none';
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
 * Soft delete school - moves school + students + teachers + pending students to deleted collections
 * Also deletes counters, user doc, and photos
 */
window.deleteSchool = async function(schoolId, schoolName) {
  if (!confirm(`Are you sure you want to delete "${schoolName}"?\n\nSchool, all students, teachers, and pending students will be moved to deleted items. You can restore them later from Deleted Cards.`)) return;

  try {
    const user = firebase.auth().currentUser;
    const deletedByEmail = user?.email || 'unknown_user_or_admin_operation';
    const now = Date.now();

    // 1. Get school data
    const schoolSnap = await firebase.firestore().collection('schools').doc(schoolId).get();
    if (!schoolSnap.exists) {
      window.showToast('School not found', 'error');
      return;
    }
    const schoolData = schoolSnap.data();

    // 2. Get all students
    const students = await window.dbGetAllStudents(schoolId);

    // 3. Get all teachers/staff
    const teachers = await window.dbGetAllTeacherStaff(schoolId);

    // 4. Get all pending students
    let pendingStudents = [];
    try {
      const pendingSnap = await firebase.firestore().collection('schools').doc(schoolId).collection('pending_students').get();
      pendingStudents = pendingSnap.docs.map(d => ({ docId: d.id, ...d.data() }));
    } catch(e) {}

    // 5. Move school to deleted_schools
    await firebase.firestore().collection('deleted_schools').doc(schoolId).set({
      ...schoolData,
      schoolId: schoolId,
      deletedAt: now,
      deletedBy: deletedByEmail,
      deletedByRole: 'admin',
      deleteReason: 'Deleted by admin'
    });

    // 6. Move all students to deleted_students
    const studentBatch = firebase.firestore().batch();
    let batchCount = 0;
    const BATCH_LIMIT = 500;

    for (const student of students) {
      const studentRef = window.dbStudents(schoolId, student.class).doc(student.docId || student.id);
      const deletedStudentRef = firebase.firestore().collection('deleted_students').doc(student.docId || student.id);

      const deletedStudentData = {
        ...student,
        schoolId: schoolId,
        schoolName: schoolName,
        originalDocId: student.docId || student.id,
        originalClass: student.class,
        originalPath: `schools/${schoolId}/classes/${student.class}/students/${student.docId || student.id}`,
        deletedAt: now,
        deletedBy: deletedByEmail,
        deletedByRole: 'admin',
        deleteReason: 'School deleted by admin'
      };

      studentBatch.set(deletedStudentRef, deletedStudentData);
      studentBatch.delete(studentRef);
      batchCount += 2;

      if (batchCount >= BATCH_LIMIT) {
        await studentBatch.commit();
        batchCount = 0;
      }
    }
    if (batchCount > 0) {
      await studentBatch.commit();
    }

    // 7. Move all teachers to deleted_teachers
    const teacherBatch = firebase.firestore().batch();
    batchCount = 0;

    for (const teacher of teachers) {
      const teacherRef = firebase.firestore().collection('schools').doc(schoolId).collection('teachers').doc(teacher.docId || teacher.id);
      const deletedTeacherRef = firebase.firestore().collection('deleted_teachers').doc(teacher.docId || teacher.id);

      const deletedTeacherData = {
        ...teacher,
        schoolId: schoolId,
        schoolName: schoolName,
        originalDocId: teacher.docId || teacher.id,
        originalPath: `schools/${schoolId}/teachers/${teacher.docId || teacher.id}`,
        deletedAt: now,
        deletedBy: deletedByEmail,
        deletedByRole: 'admin',
        deleteReason: 'School deleted by admin'
      };

      teacherBatch.set(deletedTeacherRef, deletedTeacherData);
      teacherBatch.delete(teacherRef);
      batchCount += 2;

      if (batchCount >= BATCH_LIMIT) {
        await teacherBatch.commit();
        batchCount = 0;
      }
    }
    if (batchCount > 0) {
      await teacherBatch.commit();
    }

    // 8. Move all pending students to deleted_pending_students
    const pendingBatch = firebase.firestore().batch();
    batchCount = 0;

    for (const pending of pendingStudents) {
      const pendingRef = firebase.firestore().collection('schools').doc(schoolId).collection('pending_students').doc(pending.docId);
      const deletedPendingRef = firebase.firestore().collection('deleted_pending_students').doc(pending.docId);

      const deletedPendingData = {
        ...pending,
        schoolId: schoolId,
        schoolName: schoolName,
        originalDocId: pending.docId,
        originalPath: `schools/${schoolId}/pending_students/${pending.docId}`,
        deletedAt: now,
        deletedBy: deletedByEmail,
        deletedByRole: 'admin',
        deleteReason: 'School deleted by admin'
      };

      pendingBatch.set(deletedPendingRef, deletedPendingData);
      pendingBatch.delete(pendingRef);
      batchCount += 2;

      if (batchCount >= BATCH_LIMIT) {
        await pendingBatch.commit();
        batchCount = 0;
      }
    }
    if (batchCount > 0) {
      await pendingBatch.commit();
    }

    // 9. Delete counters subcollection
    try {
      const countersSnap = await firebase.firestore().collection('schools').doc(schoolId).collection('counters').get();
      const counterBatch = firebase.firestore().batch();
      countersSnap.docs.forEach(doc => counterBatch.delete(doc.ref));
      await counterBatch.commit();
    } catch(e) {}

    // 10. Delete user doc (auth account)
    try {
      await firebase.firestore().collection('users').doc(schoolId).delete();
    } catch(e) {}

    // 11. Delete student photos from storage
    try {
      await Promise.all(students
        .filter(s => s.photo)
        .map(s => window.deletePhoto(s.photo).catch(() => {}))
      );
    } catch(e) {}

    // 12. Delete teacher photos from storage
    try {
      await Promise.all(teachers
        .filter(t => t.photo)
        .map(t => window.deletePhoto(t.photo).catch(() => {}))
      );
    } catch(e) {}

    // 13. Delete original school document
    await firebase.firestore().collection('schools').doc(schoolId).delete();

    window.showToast(`School "${schoolName}" moved to deleted items`, 'success');
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
    const editSchoolLoginIdEl = document.getElementById('editSchoolLoginId');
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
    // Show Login ID if available (new schools), otherwise show email (old schools)
    if (editSchoolLoginIdEl) {
      editSchoolLoginIdEl.value = data.loginId || (data.email ? 'Email: ' + data.email : '');
    }
    // Use contactEmail for new schools, fallback to email for old schools
    editSchoolEmailEl.value = data.contactEmail || data.email || '';
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
 * Update school details (schoolName, contactEmail, city)
 * Login ID is immutable and cannot be changed.
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
    if (!email) throw new Error('Contact Email is required');

    // Build update payload - use contactEmail for new schools, email for old schools
    const updatePayload = {
      schoolName,
      city
    };
    
    // Check if school has loginId (new school) or email (old school)
    const schoolDoc = await firebase.firestore().collection('schools').doc(schoolId).get();
    const existingData = schoolDoc.data() || {};
    
    if (existingData.loginId) {
      // New school: update contactEmail
      updatePayload.contactEmail = email;
    } else {
      // Old school: update email field
      updatePayload.email = email;
    }

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

// Deleted Cards navigation
  document.addEventListener('DOMContentLoaded', function() {
  const deletedCardsBtn = document.getElementById('deletedCardsBtn');
  if (deletedCardsBtn) {
    deletedCardsBtn.addEventListener('click', function() {
      window.location.href = 'deleted-cards.html';
    });
  }

  const lockedCardsBtn = document.getElementById('lockedCardsBtn');
  if (lockedCardsBtn) {
    lockedCardsBtn.addEventListener('click', function() {
      window.location.href = 'locked-cards.html';
    });
  }
});
