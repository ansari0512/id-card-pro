/**
 * Teacher/Staff UI Controller
 */

window.switchTeacherStaffTab = function() {
  // single tab for now
};

window.updateTeacherSelectedCount = function() {
  const count = window.selectedTeacherStaff.size;
  const total = window.allTeacherStaff?.length || 0;
  const countEl = document.getElementById('teacherCount');

  if (countEl) {
    countEl.textContent = count > 0
      ? `👥 ${total} Staff (${count} Selected)`
      : `👥 ${total} Staff`;
    countEl.style.display = 'inline-flex';
  }

  const selectAll = document.getElementById('teacherSelectAllCheckbox');
  if (selectAll) {
    selectAll.checked = total > 0 && count === total;
    selectAll.indeterminate = count > 0 && count < total;
  }
};

window.clearTeacherStaffFilters = function() {
  const input = document.getElementById('teacherSearchInput');
  if (input) input.value = '';
  window.loadTeacherStaff();
};

window.renderTeacherStaff = function(list) {
  const grid = document.getElementById('teacherGrid');
  grid.innerHTML = '';
  window.selectedTeacherStaff.clear();
  window.updateTeacherSelectedCount();

  list.forEach(t => {
    const card = document.createElement('div');
    card.className = 'student-card';
    card.innerHTML = `
      <div class="student-id-header">
        <div class="student-id-text">ID: ${t.id || 'N/A'}</div>
        <input type="checkbox" class="header-checkbox teacher-checkbox" data-id="${t.docId || t.id}" id="teacher-${t.docId || t.id}">
      </div>
      <div class="student-content">
        <img class="student-photo" src="${t.photo || 'assets/placeholder.png'}" alt="${t.name || 'Teacher'}" onerror="this.src='assets/placeholder.png'" loading="lazy">
        <h3 class="student-name">${t.name || 'Unknown'}</h3>
        <div class="student-class">${t.designation || '-'} </div>
        <div class="student-info-grid">
          <div class="info-row"><span class="info-label">Mobile:</span><span class="info-value">${t.mobile || '-'}</span></div>
          <div class="info-row"><span class="info-label">Teacher ID:</span><span class="info-value">${t.teacherId || '-'}</span></div>
          <div class="info-row"><span class="info-label">Blood:</span><span class="info-value">${t.bloodGroup || '-'}</span></div>
        </div>
        <div class="student-actions">
          <button class="btn-edit" onclick="window.openTeacherEditModal('${t.docId || t.id}')" title="Edit">
            ✏️ Edit
          </button>
          <button class="btn-delete" onclick="window.deleteTeacherSingle('${t.docId || t.id}')" title="Delete">
            🗑️ Delete
          </button>
        </div>
      </div>
    `;
    grid.appendChild(card);
  });

  document.querySelectorAll('.teacher-checkbox').forEach(cb => {
    cb.addEventListener('change', e => {
      if (e.target.checked) window.selectedTeacherStaff.add(e.target.dataset.id);
      else window.selectedTeacherStaff.delete(e.target.dataset.id);
      window.updateTeacherSelectedCount();
    });
  });

  const selectAll = document.getElementById('teacherSelectAllCheckbox');
  if (selectAll) {
    selectAll.checked = false;
    selectAll.indeterminate = false;
    selectAll.onchange = function() {
      document.querySelectorAll('.teacher-checkbox').forEach(cb => {
        cb.checked = this.checked;
        if (this.checked) window.selectedTeacherStaff.add(cb.dataset.id);
        else window.selectedTeacherStaff.delete(cb.dataset.id);
      });
      window.updateTeacherSelectedCount();
    };
  }
};

// Cache for teacher list to reduce Firestore reads
window.teachersListCache = null;
window.teachersListCacheTime = 0;
const TEACHERS_CACHE_TTL = 5000; // 5 seconds cache

window.loadTeacherStaff = async function() {
  if (window.isTeacherStaffLoading) return;
  window.isTeacherStaffLoading = true;

  const loading = document.getElementById('teacherLoading');
  const grid = document.getElementById('teacherGrid');
  const empty = document.getElementById('teacherEmptyState');

  loading.style.display = 'block';
  grid.style.display = 'none';
  empty.style.display = 'none';

  try {
    const user = firebase.auth().currentUser;
    const schoolId = user.uid;
    const search = document.getElementById('teacherSearchInput')?.value?.trim() || '';

    // Use cache if available and fresh (only when no search)
    const now = Date.now();
    const cachedList = window.teachersListCache && 
                       (now - window.teachersListCacheTime) < TEACHERS_CACHE_TTL &&
                       !search
                       ? window.teachersListCache : null;
    
    let list;
    if (cachedList) {
      list = cachedList;
    } else {
      list = await window.dbGetAllTeacherStaff(schoolId, { search });
      // Cache only when not searching
      if (!search) {
        window.teachersListCache = list;
        window.teachersListCacheTime = now;
      }
    }
    
    window.allTeacherStaff = list;

    window.updateTeacherSelectedCount();
    if (!list.length) {
      empty.style.display = 'block';
      grid.style.display = 'none';
    } else {
      empty.style.display = 'none';
      grid.style.display = 'grid';
      grid.classList.remove('hidden');
      window.renderTeacherStaff(list);
    }
  } catch (e) {
    window.showToast('Failed to load records: ' + e.message, 'error');
  } finally {
    loading.style.display = 'none';
    window.isTeacherStaffLoading = false;
  }
};

window.openTeacherEditModal = function(docId) {
  const record = window.allTeacherStaff.find(t => (t.docId || t.id) === docId);
  if (!record) return;

  document.getElementById('teacherEditDocId').value = docId;
  document.getElementById('teacherEditName').value = record.name || '';
  document.getElementById('teacherEditDesignation').value = record.designation || '';
  document.getElementById('teacherEditFather').value = record.fatherName || '';
  document.getElementById('teacherEditDob').value = record.dob || '';
  document.getElementById('teacherEditBlood').value = record.bloodGroup || '';
  document.getElementById('teacherEditMobile').value = record.mobile || '';
  document.getElementById('teacherEditAddress').value = record.address || '';
  document.getElementById('teacherEditOtherDetails').value = record.otherDetails || '';
  document.getElementById('teacherEditHusband').value = record.husbandName || '';
  document.getElementById('teacherEditTeacherId').value = record.teacherId || '';

  document.getElementById('teacherEditPhoto').value = '';
  document.getElementById('teacherEditPhotoName').textContent = 'No new photo selected';
  document.getElementById('teacherEditPhotoPreview').src = record.photo || 'assets/placeholder.png';
  document.getElementById('teacherEditError').style.display = 'none';

  document.getElementById('teacherEditModal').classList.add('open');

  document.getElementById('teacherEditPhoto').onchange = function() {
    const file = this.files[0];
    if (!file) return;
    document.getElementById('teacherEditPhotoName').textContent = file.name;
    const reader = new FileReader();
    reader.onload = e => document.getElementById('teacherEditPhotoPreview').src = e.target.result;
    reader.readAsDataURL(file);
  };
};

window.closeTeacherEditModal = function() {
  document.getElementById('teacherEditModal').classList.remove('open');
};

window.deleteTeacherSingle = async function(docId) {
  if (!confirm('Delete this record? This cannot be undone.')) return;
  try {
    await window.deleteTeacherStaff(docId);
    window.showToast('Deleted', 'success');
    await window.loadTeacherStaff();
  } catch (e) {
    window.showToast('Delete failed: ' + e.message, 'error');
  }
};

window.initTeacherStaffPage = function() {
  document.addEventListener('DOMContentLoaded', function() {
    firebase.auth().onAuthStateChanged(async user => {
      if (!user) {
        window.location.href = 'index.html';
        return;
      }
      await window.loadTeacherStaff();
    });

    let searchTimeout;
    document.getElementById('teacherSearchInput')?.addEventListener('input', () => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(window.loadTeacherStaff, 400);
    });

    document.getElementById('teacherEditForm')?.addEventListener('submit', window.saveTeacherStaffEdit);

    // Setup modal behavior: ESC + outside click
    if (window.CommonFunctions && typeof window.CommonFunctions.setupModal === 'function') {
      window.CommonFunctions.setupModal('teacherEditModal', window.closeTeacherEditModal);
    }

    // Clear filters button
    document.getElementById('clearTeacherFiltersBtn')?.addEventListener('click', function() {
      window.clearTeacherStaffFilters();
    });

    // Bulk delete button
    document.getElementById('bulkDeleteTeacherBtn')?.addEventListener('click', function() {
      window.bulkDeleteTeacherStaff();
    });

    // Close edit modal button
    document.getElementById('closeTeacherEditModalBtn')?.addEventListener('click', function() {
      window.closeTeacherEditModal();
    });

    // Teacher edit mobile input filter
    document.getElementById('teacherEditMobile')?.addEventListener('input', function() {
      this.value = this.value.replace(/[^0-9]/g, '').slice(0, 10);
    });
  });
};

window.initTeacherStaffPage();

