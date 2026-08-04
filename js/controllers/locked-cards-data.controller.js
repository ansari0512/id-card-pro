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
 * Populate school dropdown — only schools that have lockedClassSections
 */
window.loadSchoolsDropdownForLocks = async function() {
  try {
    const snap = await firebase.firestore().collection('schools').orderBy('schoolName').get();
    window.lockedSchoolsList = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    const select = document.getElementById('schoolFilter');
    select.innerHTML = '<option value="">All Schools</option>';

    // Only show schools that have lockedClassSections
    window.lockedSchoolsList.forEach(school => {
      if (school.lockedClassSections && school.lockedClassSections.length > 0) {
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
 * Handle school filter change — populate class dropdown
 */
window.onSchoolFilterChange = function() {
  const classFilter = document.getElementById('classFilter');
  const sectionFilter = document.getElementById('sectionFilter');
  classFilter.innerHTML = '<option value="">All Classes</option>';
  sectionFilter.innerHTML = '<option value="">All Sections</option>';

  const schoolId = document.getElementById('schoolFilter').value;
  if (schoolId) {
    const school = window.lockedSchoolsList.find(s => s.id === schoolId);
    if (school && school.lockedClassSections) {
      const classes = [...new Set(
        school.lockedClassSections.map(cs => cs.split('-')[0])
      )].sort();

      classes.forEach(cls => {
        const opt = document.createElement('option');
        opt.value = cls;
        opt.textContent = cls === 'Nursery' ? 'Nursery' : cls === 'LKG' ? 'LKG' : cls === 'UKG' ? 'UKG' : cls === 'KG' ? 'KG' : 'Class ' + cls;
        classFilter.appendChild(opt);
      });
    }
  }

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
      s.lockedClassSections && s.lockedClassSections.length > 0
    );

    if (schoolFilter) {
      schools = schools.filter(s => s.id === schoolFilter);
    }

    const allLockedStudents = [];

    for (const school of schools) {
      const lockedSections = school.lockedClassSections || [];
      const lockDate = school.lockedAt ? new Date(school.lockedAt).toLocaleDateString('en-IN') : '-';
      const lockedBy = school.lockedBy || '-';

      try {
        const students = await window.dbGetAllStudents(school.id);

        const filteredStudents = students.filter(s => {
          const cs = String(s.class) + '-' + String(s.section);
          return lockedSections.includes(cs);
        });

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
 * Unlock a single student's class-section
 */
window.unlockSingleStudent = async function(schoolId, classSection) {
  if (!confirm('Unlock class-section "' + classSection + '"?\n\nThe school will be able to edit and delete students in this class-section again.')) return;

  try {
    const school = window.lockedSchoolsList.find(s => s.id === schoolId);
    if (!school) {
      window.showToast('School not found', 'error');
      return;
    }

    const currentLocks = school.lockedClassSections || [];
    const updatedLocks = currentLocks.filter(cs => cs !== classSection);

    const updateData = {
      lockedClassSections: updatedLocks
    };

    if (updatedLocks.length === 0) {
      updateData.lockedAt = firebase.firestore.FieldValue.delete();
      updateData.lockedBy = firebase.firestore.FieldValue.delete();
    }

    await firebase.firestore().collection('schools').doc(schoolId).update(updateData);
    school.lockedClassSections = updatedLocks;

    window.showToast('🔓 Class-section ' + classSection + ' unlocked', 'success');
    window.loadLockedCards();
  } catch (err) {
    window.showToast('Failed to unlock: ' + err.message, 'error');
  }
};

/**
 * Bulk unlock selected students' class-sections
 */
window.bulkUnlock = async function() {
  if (window.selectedLockedIds.size === 0) {
    window.showToast('Please select students first', 'error');
    return;
  }

  const unlockPairs = new Map();

  window.selectedLockedIds.forEach(idx => {
    const student = window.lockedStudents[idx];
    if (student) {
      const schoolId = student._schoolId;
      const cs = student._classSection;
      if (!unlockPairs.has(schoolId)) {
        unlockPairs.set(schoolId, new Set());
      }
      unlockPairs.get(schoolId).add(cs);
    }
  });

  const totalSections = [...unlockPairs.values()].reduce((sum, set) => sum + set.size, 0);

  if (!confirm('Unlock ' + totalSections + ' class-section(s) across ' + unlockPairs.size + ' school(s)?\n\nThe schools will be able to edit and delete these students again.')) return;

  try {
    for (const [schoolId, classSections] of unlockPairs) {
      const school = window.lockedSchoolsList.find(s => s.id === schoolId);
      if (!school) continue;

      const currentLocks = school.lockedClassSections || [];
      const updatedLocks = currentLocks.filter(cs => !classSections.has(cs));

      const updateData = {
        lockedClassSections: updatedLocks
      };

      if (updatedLocks.length === 0) {
        updateData.lockedAt = firebase.firestore.FieldValue.delete();
        updateData.lockedBy = firebase.firestore.FieldValue.delete();
      }

      await firebase.firestore().collection('schools').doc(schoolId).update(updateData);
      school.lockedClassSections = updatedLocks;
    }

    window.showToast('🔓 ' + totalSections + ' class-section(s) unlocked successfully', 'success');
    window.selectedLockedIds.clear();
    window.loadLockedCards();
  } catch (err) {
    window.showToast('Failed to unlock: ' + err.message, 'error');
  }
};