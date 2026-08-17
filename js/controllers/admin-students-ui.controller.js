/**
 * Admin Students UI Controller
 * Handles UI rendering and DOM interactions for admin-students.html
 * Handles both Students and Teachers/Staff modes
 */

// Selection state (shared between students and teachers)
window.selectedStudentIds = new Set();

// School filter change handler
window.onSchoolFilterChange = function() {
  document.getElementById('classFilter').value = '';
  window.loadAdminStudents();
};

/**
 * Dynamically update the class filter with available classes only.
 */
window.updateClassAndSectionFilters = function(students, selectedClass, selectedSection) {
  const classOrder = ['Nursery','LKG','UKG','KG','1','2','3','4','5','6','7','8','9','10','11','12'];

  // Class dropdown should be built from the full (single-school) dataset, not from the filtered `students` array.
  // In single-school mode, loadAdminStudents keeps window.adminAllClassStudents as the full set for that school.
  const sourceForClasses = (window.adminMode === 'all')
    ? ((window.adminAllStudentsFullSchoolCache && window.adminAllStudentsFullSchoolCache.length > 0)
      ? window.adminAllStudentsFullSchoolCache
      : students)
    : ((window.adminAllClassStudents && window.adminAllClassStudents.length > 0)
      ? window.adminAllClassStudents
      : students);

  const availableClasses = [...new Set(sourceForClasses.map(s => s.class).filter(Boolean))]
    .sort((a, b) => {
      const ai = classOrder.indexOf(a);
      const bi = classOrder.indexOf(b);
      if (ai === -1 && bi === -1) return a.localeCompare(b);
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });

  const classSelect = document.getElementById('classFilter');
  if (classSelect) {
    classSelect.innerHTML = '<option value="">All Classes</option>';
    availableClasses.forEach(cls => {
      const opt = document.createElement('option');
      opt.value = cls;
      opt.textContent = isNaN(cls) ? cls : 'Class ' + cls;
      if (cls === selectedClass) opt.selected = true;
      classSelect.appendChild(opt);
    });
  }

  // Build sections list based on selected class
  const sectionSelect = document.getElementById('sectionFilter');
  if (sectionSelect) {
    const baseList = selectedClass ? students.filter(s => s.class === selectedClass) : students;
    const availableSections = [...new Set(baseList.map(s => s.section).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));

    sectionSelect.innerHTML = '<option value="">All Sections</option>';
    availableSections.forEach(sec => {
      const opt = document.createElement('option');
      opt.value = sec;
      opt.textContent = sec;
      if (sec === selectedSection) opt.selected = true;
      sectionSelect.appendChild(opt);
    });
  }

  // FIX: class dropdown must never shrink; keep ALL class options always
  // (so selecting a class doesn't remove other classes)
  if (classSelect && selectedClass) {
    // When we have full student list for selected school, `students` already contains all classes.
    // However, in single-school mode with caching, we pass only current filtered students.
    // Therefore we rebuild classSelect from the global student list when possible.
    // If not possible, fall back to keeping current options.
  }
};

// Backward compatibility wrapper
window.updateClassFilter = function(students, selectedClass) {
  const sectionEl = document.getElementById('sectionFilter');
  const selectedSection = sectionEl ? sectionEl.value : '';
  window.updateClassAndSectionFilters(students, selectedClass, selectedSection);
};

/**
 * Get current data array (students or teachers) for selection operations
 */
window.getCurrentDataArray = function() {
  if (window.adminDataType === 'teachers') {
    return window.adminAllTeachers || [];
  }
  return window.adminAllStudents || [];
};

/**
 * Update the unified count badge and Select All checkbox state.
 */
window.updateSelectionUI = function() {
  const dataArr = window.getCurrentDataArray();
  const total = dataArr.length;
  const selCount = window.selectedStudentIds.size;
  const el = document.getElementById('studentCount');
  const icon = window.adminDataType === 'teachers' ? '\uD83E\uDDD1\u200D\uD83C\uDFEB' : '\uD83D\uDC65';
  const label = window.adminDataType === 'teachers' ? 'Teachers' : 'Students';

  if (selCount === 0) {
    el.textContent = icon + ' ' + total + ' ' + label;
  } else {
    el.textContent = icon + ' ' + selCount + ' / ' + total + ' Selected';
  }

  // Sync Select All checkbox
  const allVisibleIds = dataArr.map(s => s.id);
  const allSelected = allVisibleIds.length > 0 && allVisibleIds.every(id => window.selectedStudentIds.has(id));
  const selectChk = document.getElementById('selectAllChk');
  if (selectChk) selectChk.checked = allSelected;
};

/**
 * Toggle a single student/teacher selection
 */
window.toggleStudentSelection = function(id) {
  if (window.selectedStudentIds.has(id)) {
    window.selectedStudentIds.delete(id);
  } else {
    window.selectedStudentIds.add(id);
  }
  const card = document.querySelector('.student-card[data-id="' + id + '"]');
  if (card) {
    card.classList.toggle('student-card-selected', window.selectedStudentIds.has(id));
  }
  window.updateSelectionUI();
};

/**
 * Toggle select all / deselect all for visible cards.
 */
window.toggleSelectAll = function() {
  const selectChk = document.getElementById('selectAllChk');
  const shouldSelect = selectChk.checked;
  const dataArr = window.getCurrentDataArray();
  const visibleIds = dataArr.map(s => s.id);

  visibleIds.forEach(id => {
    if (shouldSelect) {
      window.selectedStudentIds.add(id);
    } else {
      window.selectedStudentIds.delete(id);
    }
    const card = document.querySelector('.student-card[data-id="' + id + '"]');
    if (card) card.classList.toggle('student-card-selected', shouldSelect);
  });

  // Sync all card checkboxes
  visibleIds.forEach(id => {
    const card = document.querySelector('.student-card[data-id="' + id + '"]');
    if (card) {
      const chk = card.querySelector('.student-select-checkbox');
      if (chk) chk.checked = shouldSelect;
    }
  });

  window.updateSelectionUI();
};

/**
 * Check if a student is locked (for admin view) — student-ID based
 * Uses student.id (display ID) consistently, matching what lockSelectedCards stores.
 */
window.isStudentLockedForAdmin = function(student) {
  if (!student) return false;
  // Use _schoolId if available (View All mode), otherwise use current adminSchoolId (single school mode)
  const schoolId = student._schoolId || window.adminSchoolId;
  if (!schoolId) return false;
  const school = window.adminSchoolsList.find(s => s.id === schoolId);
  if (!school) return false;
  const studentId = String(student.id || '');
  // Check lockedStudentIds (student-level lock) — array stores display student.id values
  if (school.lockedStudentIds && school.lockedStudentIds.length > 0 && studentId) {
    if (school.lockedStudentIds.map(String).includes(studentId)) return true;
  }
  return false;
};

/**
 * Render student cards with lock indicator
 */
window.renderAdminStudents = function(students) {
  const grid = document.getElementById('studentsGrid');
  grid.innerHTML = '';

  window.selectedStudentIds.clear();

  students.forEach(student => {
    const isLocked = window.isStudentLockedForAdmin(student);
    const schoolBadge = student._schoolName
      ? '<div class="info-row"><span class="info-label">School:</span><span class="info-value" style="color:var(--primary);font-weight:600;">\uD83C\uDFEB ' + student._schoolName + '</span></div>'
      : '';
    const lockBadge = isLocked
      ? '<span style="background:#e94560;color:#fff;font-size:10px;padding:2px 6px;border-radius:4px;margin-left:8px;">🔒 LOCKED</span>'
      : '';
    const card = document.createElement('div');
    card.className = 'student-card' + (isLocked ? ' locked' : '');
    card.dataset.id = student.id;
    if (isLocked) {
      card.style.border = '2px solid #e94560';
    }
    var dobVal = window.normalizeDateValue(student.dob);
    card.innerHTML = '<div class="student-id-header"><div class="student-id-text">Student ID: ' + (student.id || 'N/A') + '</div>' + lockBadge + '<input type="checkbox" class="student-select-checkbox" title="Select student" onclick="event.stopPropagation(); window.toggleStudentSelection(\'' + student.id + '\')"></div><div class="student-content"><img class="student-photo" src="' + (student.photo || 'assets/placeholder.png') + '" alt="' + (student.name || '') + '" onerror="this.src=\'assets/placeholder.png\'"><h3 class="student-name">' + (student.name || 'Unknown') + '</h3><div class="student-class">' + (student.class || '-') + ' - ' + (student.section || '-') + '</div><div class="student-info-grid">' + schoolBadge + '<div class="info-row"><span class="info-label">DOB:</span><span class="info-value">' + (dobVal || 'Not provided') + '</span></div><div class="info-row"><span class="info-label">Father:</span><span class="info-value">' + (student.father || 'Not provided') + '</span></div><div class="info-row"><span class="info-label">Mobile:</span><span class="info-value">' + (student.mobile || 'Not provided') + '</span></div><div class="info-row"><span class="info-label">Address:</span><span class="info-value">' + (student.address || 'Not provided') + '</span></div><div class="info-row"><span class="info-label">Added:</span><span class="info-value">' + (student.createdAt ? new Date(student.createdAt).toLocaleDateString('en-IN') : '-') + '</span></div></div><div class="student-actions"><button class="btn-print" onclick="window.printStudent(\'' + student.id + '\', \'' + (student._schoolId || window.adminSchoolId || '') + '\')">\uD83D\uDDA8\uFE0F Print</button></div></div>';
    grid.appendChild(card);
  });

  window.updateSelectionUI();
};

/**
 * Render teacher/staff cards
 */
window.renderAdminTeachers = function(teachers) {
  const grid = document.getElementById('studentsGrid');
  grid.innerHTML = '';

  window.selectedStudentIds.clear();

  teachers.forEach(teacher => {
    const schoolBadge = teacher._schoolName
      ? '<div class="info-row"><span class="info-label">School:</span><span class="info-value" style="color:var(--primary);font-weight:600;">\uD83C\uDFEB ' + teacher._schoolName + '</span></div>'
      : '';
    const photoHtml = teacher.photo
      ? '<img class="student-photo" src="' + teacher.photo + '" alt="' + (teacher.name || '') + '" onerror="this.src=\'assets/placeholder.png\'">'
      : '<div class="student-photo" style="display:flex;align-items:center;justify-content:center;background:var(--bg-dark);font-size:2rem;">\uD83E\uDDD1\u200D\uD83C\uDFEB</div>';
    const card = document.createElement('div');
    card.className = 'student-card';
    card.dataset.id = teacher.id;
    var dobVal = window.normalizeDateValue(teacher.dob);
    card.innerHTML = '<div class="student-id-header"><div class="student-id-text">Teacher ID: ' + (teacher.id || 'N/A') + '</div><input type="checkbox" class="student-select-checkbox" title="Select teacher" onclick="event.stopPropagation(); window.toggleStudentSelection(\'' + teacher.id + '\')"></div><div class="student-content">' + photoHtml + '<h3 class="student-name">' + (teacher.name || 'Unknown') + '</h3><div class="student-class">' + (teacher.designation || 'Staff') + '</div><div class="student-info-grid">' + schoolBadge + '<div class="info-row"><span class="info-label">Mobile:</span><span class="info-value">' + (teacher.mobile || 'Not provided') + '</span></div><div class="info-row"><span class="info-label">DOB:</span><span class="info-value">' + (dobVal || 'Not provided') + '</span></div><div class="info-row"><span class="info-label">Father:</span><span class="info-value">' + (teacher.fatherName || 'Not provided') + '</span></div><div class="info-row"><span class="info-label">Added:</span><span class="info-value">' + (teacher.createdAt ? new Date(teacher.createdAt).toLocaleDateString('en-IN') : '-') + '</span></div></div></div>';
    grid.appendChild(card);
  });

  window.updateSelectionUI();
};

/**
 * Clear all filters
 */
window.clearAdminFilters = function() {
  document.getElementById('classFilter').value = '';
  if (window.adminMode === 'all') {
    document.getElementById('schoolFilter').value = '';
    document.getElementById('pageTitle').textContent = 'All Students';
    window.adminSchoolId = null;
  } else {
    window.adminAllClassStudents = [];
  }
  window.loadAdminStudents();
};

/**
 * Print single student
 */
window.printStudent = function(studentId, schoolId) {
  const sid = schoolId || window.adminSchoolId || '';
  window.open('print.html?id=' + studentId + '&schoolId=' + sid, '_blank', 'width=800,height=600');
};

/**
 * Print all/bulk — respects selection and data type
 */
window.adminBulkPrint = function() {
  let targetData;
  if (window.adminDataType === 'teachers') {
    if (window.selectedStudentIds.size > 0) {
      targetData = window.adminAllTeachers.filter(t => window.selectedStudentIds.has(t.id));
    } else {
      targetData = window.adminAllTeachers;
    }
  } else {
    if (window.selectedStudentIds.size > 0) {
      targetData = window.adminAllStudents.filter(s => window.selectedStudentIds.has(s.id));
    } else {
      targetData = window.adminAllStudents;
    }
  }
  if (!targetData || targetData.length === 0) {
    window.showToast('No records to print', 'error');
    return;
  }
  const ids = targetData.map(s => s.id).join(',');
  const schoolId = window.adminSchoolId || '';
  const printPage = window.adminDataType === 'teachers' ? 'teacher-staff-card-print.html' : 'print.html';
  window.open(printPage + '?ids=' + ids + '&schoolId=' + schoolId + '&type=' + window.adminDataType, '_blank', 'width=800,height=600');
};