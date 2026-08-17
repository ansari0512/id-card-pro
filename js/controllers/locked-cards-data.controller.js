/**
 * Locked Cards Data Controller
 * Handles locked ID cards page (locked-cards.html)
 * Shows all locked students across schools in table format
 * Allows filtering by school, class, section
 * Allows unlocking individual or bulk
 */

window.lockedSchoolsList = [];
window.lockedStudents = [];
window.selectedLockedIds = new Set();

/**
 * Initialize locked cards page
 */
window.initLockedCardsPage = function() {
  window.initAuth(async (user, role) => {
    if (!user) { window.location.href = 'index.html'; return; }
    if (role !== 'admin') { window.location.href = 'dashboard.html'; return; }
    await window.loadSchoolsDropdownForLocks();
    window.loadLockedCards();
  });
};

/**
 * Populate school dropdown — only schools that have lockedStudentIds
 */
window.loadSchoolsDropdownForLocks = async function() {
  try {
    const snap = await firebase.firestore().collection('schools').orderBy('schoolName').get();
    window.lockedSchoolsList = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    const select = document.getElementById('schoolFilter');
    select.innerHTML = '<option value="">All Schools</option>';

    // Show schools that have lockedStudentIds
    window.lockedSchoolsList.forEach(school => {
      const hasStudentLocks = school.lockedStudentIds && school.lockedStudentIds.length > 0;
      if (hasStudentLocks) {
        const opt = document.createElement('option');
        opt.value = school.id;
        opt.textContent = school.schoolName || school.email || school.id;
        select.appendChild(opt);
      }
    });
  } catch(e) {
    window.showToast('Failed to load schools: ' + e.message, 'error');
  }
};

/**
 * Handle school filter change — reset class/section dropdowns
 */
window.onSchoolFilterChange = function() {
  const classFilter = document.getElementById('classFilter');
  const sectionFilter = document.getElementById('sectionFilter');
  classFilter.innerHTML = '<option value="">All Classes</option>';
  sectionFilter.innerHTML = '<option value="">All Sections</option>';
  window.loadLockedCards();
};

/**
 * Load all locked students across schools
 */
window.loadLockedCards = async function() {
  const loading = document.getElementById('loading');
  const tableWrapper = document.getElementById('lockedTableWrapper');
  const empty = document.getElementById('emptyState');
  const bulkBtn = document.getElementById('bulkUnlockBtn');

  loading.style.display = 'block';
  tableWrapper.classList.add('hidden');
  tableWrapper.style.display = 'none';
  empty.style.display = 'none';
  // Don't hide the button - keep it visible with disabled state
  // It will be enabled/disabled by updateSelectedCount()

  try {
    const schoolFilter = document.getElementById('schoolFilter').value;
    const classFilter = document.getElementById('classFilter').value;
    const sectionFilter = document.getElementById('sectionFilter').value;

    let schools = window.lockedSchoolsList.filter(s =>
      s.lockedStudentIds && s.lockedStudentIds.length > 0
    );

    if (schoolFilter) {
      schools = schools.filter(s => s.id === schoolFilter);
    }

    const allLockedStudents = [];

    for (const school of schools) {
      const lockedStudentIds = (school.lockedStudentIds || []).map(String);
      const lockDate = school.lockedAt ? new Date(school.lockedAt).toLocaleDateString('en-IN') : '-';
      const lockedBy = school.lockedBy || '-';

      try {
        const students = await window.dbGetAllStudents(school.id);

        // Student-ID level lock — lockedStudentIds stores display student.id values
        const filteredStudents = students.filter(s =>
          lockedStudentIds.includes(String(s.id || ''))
        );

        let classFiltered = filteredStudents;
        if (classFilter) {
          classFiltered = classFiltered.filter(s => String(s.class) === classFilter);
        }

        if (sectionFilter) {
          classFiltered = classFiltered.filter(s => String(s.section) === sectionFilter);
        }

        classFiltered.forEach(s => {
          allLockedStudents.push({
            ...s,
            _schoolName: school.schoolName || school.email || 'N/A',
            _schoolId: school.id,
            _lockDate: lockDate,
            _lockedBy: lockedBy,
            _classSection: String(s.class) + '-' + String(s.section)
          });
        });
      } catch(e) {}
    }

    window.lockedStudents = allLockedStudents;
    window.selectedLockedIds.clear();

    const countEl = document.getElementById('lockedCount');
    if (countEl) {
      countEl.textContent = '🔒 ' + allLockedStudents.length + ' Locked Students';
    }

    loading.style.display = 'none';

    if (allLockedStudents.length === 0) {
      empty.classList.remove('hidden');
      empty.style.display = 'block';
      return;
    }

    window.renderLockedStudentsTable(allLockedStudents);
    tableWrapper.classList.remove('hidden');
    tableWrapper.style.display = 'block';
    
    // Initialize button state after table is rendered
    window.updateSelectedCount();
  } catch (err) {
    loading.style.display = 'none';
    window.showToast('Failed to load locked cards: ' + err.message, 'error');
  }
};

/**
 * Render locked students in table
 */
window.renderLockedStudentsTable = function(students) {
  const tbody = document.getElementById('lockedTableBody');
  tbody.innerHTML = '';

  students.forEach((student, index) => {
    const tr = document.createElement('tr');
    tr.style.cssText = 'height:28px;cursor:pointer;';
    tr.dataset.index = index;

    const td0 = document.createElement('td');
    td0.style.cssText = 'width:30px;text-align:center;padding:3px;';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.style.cssText = 'width:14px;height:14px;cursor:pointer;';
    checkbox.className = 'locked-student-checkbox';
    checkbox.dataset.index = index;
    td0.appendChild(checkbox);

    // Click anywhere on row toggles checkbox
    tr.addEventListener('click', function(e) {
      if (e.target.type === 'checkbox') return;
      checkbox.checked = !checkbox.checked;
      if (checkbox.checked) {
        window.selectedLockedIds.add(index);
      } else {
        window.selectedLockedIds.delete(index);
      }
      window.updateSelectedCount();
    });

    const td1 = document.createElement('td');
    td1.innerHTML = '<strong>' + window.sanitize(student._schoolName) + '</strong>';

    const td2 = document.createElement('td');
    td2.textContent = window.sanitize(student.name || 'N/A');

    const td3 = document.createElement('td');
    td3.textContent = String(student.class || '-');

    const td4 = document.createElement('td');
    td4.textContent = String(student.section || '-');

    const td5 = document.createElement('td');
    td5.style.cssText = 'font-size:12px;color:var(--text-muted)';
    td5.textContent = student._lockDate;

    tr.append(td0, td1, td2, td3, td4, td5);
    tbody.appendChild(tr);
  });
};

/**
 * Update selected count and enable/disable bulk unlock button
 */
window.updateSelectedCount = function() {
  const count = window.selectedLockedIds.size;
  const bulkBtn = document.getElementById('bulkUnlockBtn');

  if (bulkBtn) {
    bulkBtn.textContent = '🔓 Unlock Selected (' + count + ')';
    // Don't use disabled attribute - use visual state only
    if (count > 0) {
      bulkBtn.style.opacity = '1';
      bulkBtn.style.cursor = 'pointer';
      bulkBtn.removeAttribute('disabled');
    } else {
      bulkBtn.style.opacity = '0.5';
      bulkBtn.style.cursor = 'not-allowed';
      bulkBtn.setAttribute('disabled', 'disabled');
    }
  }

  const selectAll = document.getElementById('selectAllLocked');
  if (selectAll) {
    selectAll.checked = count === window.lockedStudents.length && count > 0;
    selectAll.indeterminate = count > 0 && count < window.lockedStudents.length;
  }
};

/**
 * Toggle select all
 */
window.toggleSelectAllLocked = function() {
  const selectAll = document.getElementById('selectAllLocked');
  const checkboxes = document.querySelectorAll('.locked-student-checkbox');

  if (selectAll.checked) {
    checkboxes.forEach(cb => {
      cb.checked = true;
      window.selectedLockedIds.add(parseInt(cb.dataset.index));
    });
  } else {
    checkboxes.forEach(cb => {
      cb.checked = false;
    });
    window.selectedLockedIds.clear();
  }

  window.updateSelectedCount();
};

/**
 * Clear all filters
 */
window.clearLockedFilters = function() {
  document.getElementById('schoolFilter').value = '';
  document.getElementById('classFilter').innerHTML = '<option value="">All Classes</option>';
  document.getElementById('sectionFilter').innerHTML = '<option value="">All Sections</option>';
  window.loadLockedCards();
};

/**
 * Unlock a single student
 */
window.unlockSingleStudent = async function(schoolId, studentId) {
  if (!confirm('Unlock this student?\n\nThe school will be able to edit and delete this student again.')) return;

  try {
    const school = window.lockedSchoolsList.find(s => s.id === schoolId);
    if (!school) {
      window.showToast('School not found', 'error');
      return;
    }

    const currentLocks = (school.lockedStudentIds || []).map(String);
    const updatedLocks = currentLocks.filter(id => id !== String(studentId));

    const updateData = {
      lockedStudentIds: updatedLocks
    };

    if (updatedLocks.length === 0) {
      updateData.lockedAt = firebase.firestore.FieldValue.delete();
      updateData.lockedBy = firebase.firestore.FieldValue.delete();
    }

    await firebase.firestore().collection('schools').doc(schoolId).update(updateData);
    school.lockedStudentIds = updatedLocks;

    window.showToast('🔓 Student unlocked', 'success');
    window.loadLockedCards();
  } catch (err) {
    window.showToast('Failed to unlock: ' + err.message, 'error');
  }
};

/**
 * Bulk unlock selected students — removes student IDs from lockedStudentIds
 */
window.bulkUnlock = async function() {
  if (window.selectedLockedIds.size === 0) {
    window.showToast('Please select students first', 'error');
    return;
  }

  // Group by school: schoolId → Set of student IDs to unlock
  const unlockBySchool = new Map();

  window.selectedLockedIds.forEach(idx => {
    const student = window.lockedStudents[idx];
    if (student) {
      const schoolId = student._schoolId;
      // lockedStudentIds stores display student.id values
      const studentKey = String(student.id || '');
      if (!unlockBySchool.has(schoolId)) {
        unlockBySchool.set(schoolId, new Set());
      }
      unlockBySchool.get(schoolId).add(studentKey);
    }
  });

  const totalStudents = [...unlockBySchool.values()].reduce((sum, set) => sum + set.size, 0);

  if (!confirm('Unlock ' + totalStudents + ' student(s) across ' + unlockBySchool.size + ' school(s)?\n\nThe schools will be able to edit and delete these students again.')) return;

  try {
    for (const [schoolId, studentIds] of unlockBySchool) {
      const school = window.lockedSchoolsList.find(s => s.id === schoolId);
      if (!school) continue;

      // Remove from lockedStudentIds (student-level lock)
      const currentStudentLocks = (school.lockedStudentIds || []).map(String);
      const updatedStudentLocks = currentStudentLocks.filter(id => !studentIds.has(id));

      const updateData = {
        lockedStudentIds: updatedStudentLocks
      };

      // If no lockedStudentIds remain, remove lockedAt/lockedBy metadata
      if (updatedStudentLocks.length === 0) {
        updateData.lockedAt = firebase.firestore.FieldValue.delete();
        updateData.lockedBy = firebase.firestore.FieldValue.delete();
      }

      await firebase.firestore().collection('schools').doc(schoolId).update(updateData);
      school.lockedStudentIds = updatedStudentLocks;
    }

    window.showToast('🔓 ' + totalStudents + ' student(s) unlocked successfully', 'success');
    window.selectedLockedIds.clear();
    window.loadLockedCards();
  } catch (err) {
    window.showToast('Failed to unlock: ' + err.message, 'error');
  }
};