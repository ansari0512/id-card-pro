/**
 * Student UI Controller
 * Handles UI rendering, modals, and DOM interactions for students.html
 */

// Store dropdown selections globally to persist across renders
window.dropdownSelections = window.dropdownSelections || {};

// Cache for student list to reduce Firestore reads
window.studentsListCache = null;
window.studentsListCacheTime = 0;
const STUDENTS_CACHE_TTL = 5000; // 5 seconds cache

// ── COMPLETE STUDENTS ──────────────────────────────────────

/**
 * Load students list
 */
window.loadStudents = async function() {
  if (window.isLoading) return;
  window.isLoading = true;

  const loading = document.getElementById('loading');
  const grid = document.getElementById('studentsGrid');
  const empty = document.getElementById('emptyState');

  loading.style.display = 'block';
  grid.style.display = 'none';
  grid.classList.remove('hidden');
  empty.style.display = 'none';
  empty.classList.remove('hidden');

  try {
    const user = firebase.auth().currentUser;
    const search = document.getElementById('searchInput').value.trim().toLowerCase();
    const classVal = document.getElementById('classFilter').value;
    const sectionVal = document.getElementById('sectionFilter').value;

    const filters = {
      class: classVal || '',
      section: sectionVal || '',
      search: search || ''
    };

    // Use cache only if filters haven't changed
    const now = Date.now();
    const cacheKey = JSON.stringify({ class: classVal, section: sectionVal });
    const cachedData = window.studentsListCache?.key === cacheKey && 
                       (now - window.studentsListCacheTime) < STUDENTS_CACHE_TTL
                       ? window.studentsListCache.data : null;
    
    let students;
    if (cachedData && !search) {
      // Use cached data for class/section filters, but always apply search client-side
      students = cachedData;
      if (search) {
        students = students.filter(s =>
          (s.name || '').toLowerCase().includes(search) ||
          (s.id || '').toLowerCase().includes(search)
        );
      }
    } else {
      students = await window.getStudents(filters);
      // Cache the full unfiltered result for this class/section combo
      if (!search) {
        window.studentsListCache = { key: cacheKey, data: students };
        window.studentsListCacheTime = now;
      }
    }
    
    window.allStudents = students;

    loading.style.display = 'none';

    // Student count update karo
    const countEl = document.getElementById('studentCount');
    if (countEl) {
      countEl.textContent = `👥 ${students.length} Students`;
      countEl.style.display = 'inline-flex';
    }

    if (students.length === 0) {
      empty.style.display = 'block';
    } else {
      // Populate class dropdown with available classes
      window.populateClassDropdown(students, 'classFilter');
      window.populateSectionDropdown(students, 'sectionFilter');
      window.renderStudents(students);
      grid.style.display = 'grid';
      grid.classList.remove('hidden');
    }
  } catch (error) {
    window.showToast('Failed to load students: ' + error.message, 'error');
    loading.style.display = 'none';
  } finally {
    window.isLoading = false;
  }
};

/**
 * Render student cards with professional design
 */
window.renderStudents = function(students) {
  const grid = document.getElementById('studentsGrid');
  grid.innerHTML = '';
  window.selectedStudents.clear();
  window.updateSelectedCount();

  students.forEach(student => {
    const card = document.createElement('div');
    card.className = 'student-card';
    card.innerHTML = `
      <div class="student-id-header">
        <div class="student-id-text">Student ID: ${student.id || 'N/A'}</div>
        <input type="checkbox" class="header-checkbox student-checkbox" data-id="${student.docId || student.id}" id="student-${student.docId || student.id}">
      </div>
      <div class="student-content">
        <img class="student-photo" src="${student.photo || 'assets/placeholder.png'}" alt="${student.name}" onerror="this.src='assets/placeholder.png'" loading="lazy">
        <h3 class="student-name">${student.name || 'Unknown'}</h3>
        <div class="student-class">${student.class || '-'} - ${student.section || '-'}</div>
        
        <div class="student-info-grid">
          <div class="info-row">
            <span class="info-label">DOB:</span>
            <span class="info-value">${student.dob || 'Not provided'}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Father:</span>
            <span class="info-value">${student.father || 'Not provided'}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Mobile:</span>
            <span class="info-value">${student.mobile || 'Not provided'}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Address:</span>
            <span class="info-value">${student.address || 'Not provided'}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Added:</span>
            <span class="info-value">${new Date(student.createdAt).toLocaleDateString('en-IN')}</span>
          </div>
        </div>
        
        <div class="student-actions">
          <button class="btn-edit" onclick="window.openEditModal('${student.docId || student.id}')" title="Edit Student">
            ✏️ Edit
          </button>

          <button class="btn-delete" onclick="window.deleteSingle('${student.docId || student.id}')" title="Delete Student">
            🗑️ Delete
          </button>
        </div>
      </div>
    `;
    grid.appendChild(card);
  });

    // Checkbox handlers
    document.querySelectorAll('.student-checkbox').forEach(cb => {
      cb.addEventListener('change', e => {
        if (e.target.checked) window.selectedStudents.add(e.target.dataset.id);
        else window.selectedStudents.delete(e.target.dataset.id);
        window.updateSelectedCount();
      });
    });


  // Select All
  const selectAll = document.getElementById('selectAllCheckbox');
  if (selectAll) {
    selectAll.checked = false;
    selectAll.indeterminate = false;
    selectAll.onchange = function() {
      document.querySelectorAll('.student-checkbox').forEach(cb => {
        cb.checked = this.checked;
        if (this.checked) window.selectedStudents.add(cb.dataset.id);
        else window.selectedStudents.delete(cb.dataset.id);
      });
      window.updateSelectedCount();
    };
  }
};

/**
 * Update selected count
 */
window.updateSelectedCount = function() {
  const count = window.selectedStudents.size;
  const total = window.allStudents.length;

  const countEl = document.getElementById('studentCount');
  if (countEl) {
    // Badge always visible on Complete tab
    countEl.textContent = count > 0 ? `👥 ${total} Students (${count} Selected)` : `👥 ${total} Students`;
    countEl.style.display = 'inline-flex';
  }

  const selectAll = document.getElementById('selectAllCheckbox');
  if (selectAll) {
    selectAll.checked = total > 0 && count === total;
    selectAll.indeterminate = count > 0 && count < total;
  }
};


/**
 * Clear filters
 */
window.clearFilters = function() {
  document.getElementById('searchInput').value = '';
  document.getElementById('classFilter').value = '';
  document.getElementById('sectionFilter').value = '';
  
  const selectAll = document.getElementById('selectAllCheckbox');
  if (selectAll) {
    selectAll.checked = false;
    selectAll.indeterminate = false;
  }
  window.loadStudents();
};

// ── EDIT MODAL ─────────────────────────────────────────────

/**
 * Open edit modal
 */
window.openEditModal = function(docId) {
  const student = window.allStudents.find(s => (s.docId || s.id) === docId);
  if (!student) return;

  document.getElementById('editDocId').value = docId;
  document.getElementById('editName').value = student.name || '';
  document.getElementById('editFather').value = student.father || '';
  document.getElementById('editClass').value = student.class || '';
  document.getElementById('editSection').value = student.section || '';
  document.getElementById('editMobile').value = student.mobile || '';
  document.getElementById('editAddress').value = student.address || '';

  // New fields (backward compatible)
  const setEditValue = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.value = (val ?? '') + '';
  };

  setEditValue('editAddition', student.addition);
  setEditValue('editAdmissionNo', student.admissionNo);
  setEditValue('editRollNo', student.rollNo);
  setEditValue('editMotherName', student.motherName);
  setEditValue('editBloodGroup', student.bloodGroup);
  setEditValue('editOtherInfo', student.otherInfo);

  document.getElementById('editPhoto').value = '';
  document.getElementById('editPhotoName').textContent = 'No new photo selected';
  document.getElementById('editPhotoPreview').src = student.photo || 'assets/placeholder.png';
  document.getElementById('editError').style.display = 'none';
  document.getElementById('editModal').classList.add('open');


  // Photo preview
  document.getElementById('editPhoto').onchange = function() {
    const file = this.files[0];
    if (!file) return;
    document.getElementById('editPhotoName').textContent = file.name;
    const reader = new FileReader();
    reader.onload = e => document.getElementById('editPhotoPreview').src = e.target.result;
    reader.readAsDataURL(file);
  };
};

/**
 * Close edit modal
 */
window.closeEditModal = function() {
  document.getElementById('editModal').classList.remove('open');
};

/**
 * Delete single student
 */
window.deleteSingle = async function(docId) {
  if (!confirm('Delete this student? This cannot be undone.')) return;

  try {
    await window.deleteStudent(docId);
    window.showToast('Student deleted', 'success');
    window.loadStudents();
  } catch (err) {
    window.showToast('Delete failed: ' + err.message, 'error');
  }
};




// ── PENDING STUDENTS ───────────────────────────────────────

// Update pending selection count & checkboxes state
window.updatePendingSelectedCount = function() {
  const count = window.selectedPending.size;
  const total = window.allPendingStudents.length;

  const studentCountEl = document.getElementById('pendingStudentCount');
  if (studentCountEl) {
    studentCountEl.textContent = count > 0 ? `👥 ${total} Students (${count} Selected)` : `👥 ${total} Students`;
    studentCountEl.style.display = 'inline-flex';
  }

  const selectAll = document.getElementById('pendingSelectAllCheckbox');
  if (selectAll) {
    selectAll.checked = total > 0 && count === total;
    selectAll.indeterminate = count > 0 && count < total;
  }
};


/**
 * Populate section dropdown with only available sections from student list
 */
window.populateSectionDropdown = function(students, dropdownId) {
  const dropdown = document.getElementById(dropdownId);
  if (!dropdown) return;
  
  const availableSections = [...new Set(students.map(s => s.section).filter(Boolean))].sort();
  const currentValue = dropdown.value || window.dropdownSelections[dropdownId] || '';
  
  dropdown.innerHTML = '<option value="">All Sections</option>';
  
  availableSections.forEach(sec => {
    const option = document.createElement('option');
    option.value = sec;
    option.textContent = sec;
    dropdown.appendChild(option);
  });
  
  if (currentValue && (currentValue === '' || availableSections.includes(currentValue))) {
    dropdown.value = currentValue;
    window.dropdownSelections[dropdownId] = currentValue;
  }
};

// Render pending student cards
window.renderPendingStudents = function(students) {
  const grid = document.getElementById('pendingGrid');
  grid.innerHTML = '';
  window.selectedPending.clear();

  // Get selected class filter (don't rebuild dropdown, just filter)
  const classFilterElement = document.getElementById('pendingClassFilter');
  const selectedClass = classFilterElement ? classFilterElement.value : '';
  
  // Get selected filters
  const classVal = document.getElementById('pendingClassFilter')?.value || '';
  const sectionVal = document.getElementById('pendingSectionFilter')?.value || '';
  
  const search = document.getElementById('pendingSearchInput')?.value?.trim()?.toLowerCase() || '';

  // Filter students (no row-level validation; only UI filtering)
  const filteredStudents = students.filter(s => {
    const matchClass = !classVal || s.class === classVal;
    const matchSection = !sectionVal || s.section === sectionVal;
    if (!matchClass || !matchSection) return false;

    if (!search) return true;
    const name = (s.name || '').toLowerCase();
    const sid = (s.id || '').toLowerCase();
    return name.includes(search) || sid.includes(search);
  });


  filteredStudents.forEach(s => {
    const card = document.createElement('div');
    card.className = 'student-card';
    card.innerHTML = `
      <div class="student-id-header">
        <div class="student-id-text">Student ID: ${s.id || 'N/A'}</div>
        <input type="checkbox" class="header-checkbox pending-checkbox" data-docid="${s.docId}" id="pending-${s.docId}">
      </div>
      <div class="student-content">
        <div class="student-photo-wrapper">
          <img class="student-photo" src="assets/placeholder.png" alt="" style="opacity:0.4;">
          <span class="student-photo-placeholder-text">No Photo</span>
        </div>
        <h3 class="student-name">${s.name || 'Unknown'}</h3>
        <div class="student-class">${s.class || '-'} - ${s.section || '-'}</div>
        
        <div class="student-info-grid">
          <div class="info-row">
            <span class="info-label">Father:</span>
            <span class="info-value">${s.father || 'Not provided'}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Mobile:</span>
            <span class="info-value">${s.mobile || 'Not provided'}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Address:</span>
            <span class="info-value">${s.address || 'Not provided'}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Status:</span>
            <span class="info-value" style="color: #f59e0b; font-weight: 600;">Photo Required</span>
          </div>
        </div>
        
        <div class="student-actions">
          <button class="btn-upload" onclick="window.openPhotoUploadModal('${s.docId}', '${s.name}', '${s.class}', '${s.section}')" title="Upload Photo">
            📷 Upload Photo
          </button>
          <button class="btn-delete" onclick="window.deletePending('${s.docId}')" title="Delete Student">
            🗑️ Delete
          </button>
        </div>
      </div>
    `;
    grid.appendChild(card);
  });

  // Manual checkbox handlers
  document.querySelectorAll('.pending-checkbox').forEach(cb => {
    cb.addEventListener('change', e => {
      if (e.target.checked) window.selectedPending.add(e.target.dataset.docid);
      else window.selectedPending.delete(e.target.dataset.docid);
      window.updatePendingSelectedCount();
    });
  });

  // Select All checkbox
  const selectAll = document.getElementById('pendingSelectAllCheckbox');
  if (selectAll) {
    selectAll.checked = false;
    selectAll.indeterminate = false;
    selectAll.onchange = function() {
      document.querySelectorAll('.pending-checkbox').forEach(cb => {
        cb.checked = this.checked;
        if (this.checked) window.selectedPending.add(cb.dataset.docid);
        else window.selectedPending.delete(cb.dataset.docid);
      });
      window.updatePendingSelectedCount();
    };
  }

  // Class-wise select dropdown
  const classFilter = document.getElementById('pendingClassFilter');
  if (classFilter) {
    classFilter.onchange = function() {
      // Re-render students with the new filter
      window.renderPendingStudents(window.allPendingStudents);
      window.updatePendingSelectedCount();
    };
  }

  window.updatePendingSelectedCount();
};

// Clear pending filters
window.clearPendingFilters = function() {
  document.getElementById('pendingClassFilter').value = '';
  document.getElementById('pendingSectionFilter').value = '';
  
  const selectAll = document.getElementById('pendingSelectAllCheckbox');
  if (selectAll) {
    selectAll.checked = false;
    selectAll.indeterminate = false;
  }

  if (window.allPendingStudents) {
    window.renderPendingStudents(window.allPendingStudents);
  }
};

// Open import modal
window.openImportModal = function() {
  document.getElementById('importFile').value = '';
  document.getElementById('importPreview').style.display = 'none';
  document.getElementById('importError').style.display = 'none';
  document.getElementById('importModal').classList.add('open');
};

window.closeImportModal = function() {
  document.getElementById('importModal').classList.remove('open');
};

// Open photo upload modal for pending student
window.openPhotoUploadModal = function(docId, name, cls, section) {
  document.getElementById('pendingDocId').value = docId;
  document.getElementById('pendingStudentInfo').textContent = `${name} | ${cls} - ${section}`;
  document.getElementById('pendingPhotoPreview').src = 'assets/placeholder.png';
  document.getElementById('pendingPhotoFile').value = '';
  document.getElementById('photoUploadError').style.display = 'none';
  document.getElementById('photoUploadModal').classList.add('open');
};

window.closePhotoUploadModal = function() {
  document.getElementById('photoUploadModal').classList.remove('open');
};

// ── PROMOTE STUDENTS ────────────────────────────────────────

/**
 * Load all students for promotion table
 */
window.loadPromoteStudentsTable = async function() {
  const promoteLoading = document.getElementById('promoteLoading');
  const promoteGrid = document.getElementById('promoteGrid');
  const emptyPromoteState = document.getElementById('emptyPromoteState');
  const promoteActionsBar = document.getElementById('promoteActionsBar');

  promoteLoading.style.display = 'block';
  promoteGrid.style.display = 'none';
  emptyPromoteState.style.display = 'none';
  promoteActionsBar.style.display = 'none';

  try {
    const user = firebase.auth().currentUser;
    const classFilter = document.getElementById('promoteClassFilter').value;
    const sectionFilter = document.getElementById('promoteSectionFilter').value;
    const search = document.getElementById('promoteSearchInput')?.value?.trim()?.toLowerCase() || '';

    // Get all students
    const filters = {
      class: classFilter || '',
      section: sectionFilter || ''
    };


    let students = await window.getStudents(filters);

    if (search) {
      students = students.filter(s => {
        const name = (s.name || '').toLowerCase();
        const sid = (s.id || '').toLowerCase();
        return name.includes(search) || sid.includes(search);
      });
    }

    window.allPromoteStudents = students;
    window.selectedPromoteStudents.clear();


    // Update count badge
    const countEl = document.getElementById('promoteStudentCount');
    if (countEl) {
      countEl.textContent = `👥 ${students.length} Students`;
    }


    promoteLoading.style.display = 'none';

    if (students.length === 0) {
      emptyPromoteState.style.display = 'block';
      promoteActionsBar.style.display = 'none';
    } else {
      window.populateClassDropdown(students, 'promoteClassFilter');
      window.populateSectionDropdown(students, 'promoteSectionFilter');
      
      window.renderPromoteTable(students);
      promoteGrid.classList.remove('hidden');
      promoteGrid.style.display = 'grid';
      promoteActionsBar.style.display = 'flex';
      promoteActionsBar.classList.remove('hidden');

      window.updatePromoteCounts();




    }
  } catch (error) {
    promoteLoading.style.display = 'none';
    window.showToast('Failed to load students: ' + error.message, 'error');
  }
};

/**
 * Render students in promote table
 */
window.renderPromoteTable = function(students) {
  const grid = document.getElementById('promoteGrid');
  grid.innerHTML = '';
  window.selectedPromoteStudents.clear();

  students.forEach(student => {
    const studentId = student.docId || student.id;
    const card = document.createElement('div');
    card.className = 'student-card';
    card.innerHTML = `
      <div class="student-id-header">
        <div class="student-id-text">ID: ${student.id || 'N/A'}</div>
        <input type="checkbox" class="header-checkbox promote-checkbox" data-id="${studentId}" id="promote-${studentId}">
      </div>
      <div class="student-content">
        <img class="student-photo" src="${student.photo || 'assets/placeholder.png'}" alt="${student.name}" onerror="this.src='assets/placeholder.png'">
        <h3 class="student-name">${student.name || 'Unknown'}</h3>
        <div class="student-class">${student.class || '-'} - ${student.section || '-'}</div>
        <div class="student-info-grid">
          <div class="info-row">
            <span class="info-label">Father:</span>
            <span class="info-value">${student.father || '-'}</span>
          </div>
        </div>
      </div>
    `;
    grid.appendChild(card);
  });

  // Setup checkbox handlers
  document.querySelectorAll('.promote-checkbox').forEach(cb => {
    cb.addEventListener('change', function() {
      if (this.checked) {
        window.selectedPromoteStudents.add(this.dataset.id);
      } else {
        window.selectedPromoteStudents.delete(this.dataset.id);
      }
      window.updatePromoteCounts();
    });
  });

  window.updatePromoteCounts();
};

/**
 * Toggle all selections
 */
window.promoteToggleAll = function(checked) {
  const checkboxes = document.querySelectorAll('.promote-checkbox');
  window.selectedPromoteStudents.clear();
  
  checkboxes.forEach(cb => {
    cb.checked = checked;
    if (checked) {
      window.selectedPromoteStudents.add(cb.dataset.id);
    }
  });
  
  window.updatePromoteCounts();
};

/**
 * Toggle all table rows
 */
window.promoteToggleAllRows = function(checked) {
  window.promoteToggleAll(checked);
};

/**
 * Update promotion counts and button state
 */
window.updatePromoteCounts = function() {
  const selectedCount = window.selectedPromoteStudents.size;
  const totalCount = window.allPromoteStudents.length;

  const studentCountEl = document.getElementById('promoteStudentCount');
  if (studentCountEl) {
    studentCountEl.textContent = selectedCount > 0
      ? `👥 ${totalCount} Students (${selectedCount} Selected)`
      : `👥 ${totalCount} Students`;
    studentCountEl.style.display = 'inline-flex';
  }

  const selectAllCheckbox = document.getElementById('promoteSelectAllCheckbox');
  if (selectAllCheckbox) {
    selectAllCheckbox.checked = selectedCount === totalCount && totalCount > 0;
    selectAllCheckbox.indeterminate = selectedCount > 0 && selectedCount < totalCount;
  }

  const confirmBtn = document.getElementById('promoteConfirmBtn');
  if (confirmBtn) {
    confirmBtn.disabled = selectedCount === 0;
  }
};


/**
 * Clear filters
 */
window.clearPromoteFilters = function() {
  document.getElementById('promoteClassFilter').value = '';
  document.getElementById('promoteSectionFilter').value = '';
  window.selectedPromoteStudents.clear();

  const selectAll = document.getElementById('promoteSelectAllCheckbox');
  if (selectAll) {
    selectAll.checked = false;
    selectAll.indeterminate = false;
  }
  window.loadPromoteStudentsTable();
};

window.openPromoteTargetModal = function() {
  if (window.selectedPromoteStudents.size === 0) {
    window.showToast('Please select at least one student before promoting', 'error');
    return;
  }
  document.getElementById('promoteTargetError').style.display = 'none';
  document.getElementById('promoteTargetClass').value = '';
  document.getElementById('promoteTargetSection').value = '';
  const modalBtn = document.getElementById('promoteTargetConfirmBtn');
  if (modalBtn) {
    modalBtn.disabled = false;
    modalBtn.textContent = '✅ Confirm Promote';
  }
  document.getElementById('promoteTargetModal').classList.add('open');
};

window.closePromoteTargetModal = function() {
  document.getElementById('promoteTargetModal').classList.remove('open');
};

// ── INITIALIZATION ─────────────────────────────────────────

document.addEventListener('DOMContentLoaded', function() {
  // Auth listener
  firebase.auth().onAuthStateChanged(async user => {
    if (!user) {
      window.location.href = 'index.html';
      return;
    }

    // Show the school name badge.
    try {
      const doc = await firebase.firestore().collection('schools').doc(user.uid).get();
      const name = doc.exists ? (doc.data().schoolName || '') : '';
      const badge = document.getElementById('schoolNameSubtitle');
      const badgeText = document.getElementById('schoolNameText');
      if (badge && badgeText && name) {
        badgeText.textContent = name;
        badge.style.display = 'inline-flex';
      }
    } catch(e) {}

    // Auto-capitalize for edit form
    ['editName', 'editFather', 'editAddress'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('input', () => window.applyProperCase(el));
      }
    });

    // Load students
    window.loadStudents();
    window.updatePendingBadge();

    // Auto open import modal if ?tab=import
    if (new URLSearchParams(window.location.search).get('tab') === 'import') {
      window.openImportModal();
    }
  });

  // Debounced search (Complete tab)
  let searchTimeout;
  document.getElementById('searchInput')?.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(window.loadStudents, 500);
  });

  // Debounced search (Promote tab)
  let promoteSearchTimeout;
  document.getElementById('promoteSearchInput')?.addEventListener('input', () => {
    clearTimeout(promoteSearchTimeout);
    promoteSearchTimeout = setTimeout(window.loadPromoteStudentsTable, 300);
  });

  // Debounced search (Pending tab)
  let pendingSearchTimeout;
  document.getElementById('pendingSearchInput')?.addEventListener('input', () => {
    clearTimeout(pendingSearchTimeout);
    pendingSearchTimeout = setTimeout(() => {
      if (window.allPendingStudents) {
        window.renderPendingStudents(window.allPendingStudents);
      }
    }, 300);
  });

  // Filter dropdowns (Complete tab)
  document.getElementById('classFilter')?.addEventListener('change', window.loadStudents);
  document.getElementById('sectionFilter')?.addEventListener('change', window.loadStudents);

  // Pending tab filter dropdowns
  document.getElementById('pendingClassFilter')?.addEventListener('change', () => {
    if (window.allPendingStudents) {
      window.renderPendingStudents(window.allPendingStudents);
    }
  });

  document.getElementById('pendingSectionFilter')?.addEventListener('change', () => {
    if (window.allPendingStudents) {
      window.renderPendingStudents(window.allPendingStudents);
    }
  });


  // Edit form submit
  document.getElementById('editForm')?.addEventListener('submit', window.saveStudentEdit);

  // Modal close on overlay click
  document.getElementById('editModal')?.addEventListener('click', function(e) {
    if (e.target === e.currentTarget) window.closeEditModal();
  });
  document.getElementById('importModal')?.addEventListener('click', function(e) {
    if (e.target === e.currentTarget) window.closeImportModal();
  });
  document.getElementById('photoUploadModal')?.addEventListener('click', function(e) {
    if (e.target === e.currentTarget) window.closePhotoUploadModal();
  });
  document.getElementById('promoteTargetModal')?.addEventListener('click', function(e) {
    if (e.target === e.currentTarget) window.closePromoteTargetModal();
  });
});

// File input preview listeners
document.addEventListener('DOMContentLoaded', function() {
  document.getElementById('importFile')?.addEventListener('change', function() {
    const file = this.files[0];
    if (!file) return;
    window.parseImportFile(file).then(students => {
      document.getElementById('importCount').textContent = students.length;
      document.getElementById('importPreview').style.display = 'block';
    }).catch(() => {});
  });

  document.getElementById('pendingPhotoFile')?.addEventListener('change', function() {
    const file = this.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => document.getElementById('pendingPhotoPreview').src = e.target.result;
    reader.readAsDataURL(file);
  });
});
