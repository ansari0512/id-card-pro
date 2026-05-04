/**
 * Student Controller
 * Handles student CRUD for students.html
 */

// Global state
window.allStudents = [];
window.selectedStudents = new Set();
window.isLoading = false;

/**
 * Mock mode detector
 */
window.isMockMode = function() {
  return !window.firebase?.firestore;
};

/**
 * Get students
 */
window.getStudents = async function(filters = {}) {
  const user = firebase.auth().currentUser;
  if (!user) throw new Error('Authentication required');

  if (window.isMockMode()) {
    const students = JSON.parse(localStorage.getItem('mock_students') || '[]');
    let results = students.filter(s => s.schoolId === user.uid);

    if (filters.class) results = results.filter(s => s.class === filters.class);
    if (filters.section) results = results.filter(s => s.section === filters.section);
    if (filters.search) {
      const q = filters.search.toLowerCase();
      results = results.filter(s =>
        s.name?.toLowerCase().includes(q) || s.id?.toLowerCase().includes(q)
      );
    }

    return results
      .map(s => ({ ...s, docId: s.docId || s.id }))
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  // Real Firebase
  return window.dbGetAllStudents(user.uid, filters);
};

/**
 * Delete student
 */
window.deleteStudent = async function(studentId, studentClass) {
  const user = firebase.auth().currentUser;
  if (!user) throw new Error('Authentication required');
  const student = window.allStudents.find(s => (s.docId || s.id) === studentId);
  const cls = studentClass || student?.class;
  if (!cls) throw new Error('Student class not found');
  await window.dbStudents(user.uid, cls).doc(studentId).delete();
  return true;
};

/**
 * Upload photo — path: students/{schoolName}/{className}/{studentName}_{studentId}.ext
 */
window.uploadPhoto = async function(userId, studentId, file, className, studentName) {
  let schoolName = 'School';
  try {
    const schoolDoc = await firebase.firestore().collection('schools').doc(userId).get();
    if (schoolDoc.exists) schoolName = schoolDoc.data().schoolName || 'School';
  } catch(e) {}

  const cls     = (className   || 'Unknown').replace(/[^a-zA-Z0-9 _-]/g, '');
  const sName   = (studentName || studentId).replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '');
  const ext     = file.type.includes('png') ? 'png' : 'jpg';
  const safeSch = schoolName.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '');

  const path = `students/${safeSch}/${cls}/${sName}_${studentId}.${ext}`;
  const storageRef = firebase.storage().ref(path);
  const snapshot = await storageRef.put(file);
  return await snapshot.ref.getDownloadURL();
};

/**
 * Apply proper case to input
 */
window.applyProperCase = function(input) {
  const pos = input.selectionStart;
  input.value = window.toProperCase(input.value);
  input.setSelectionRange(pos, pos);
};

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
  empty.style.display = 'none';

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

    const students = await window.getStudents(filters);
    window.allStudents = students;

    loading.style.display = 'none';

    if (students.length === 0) {
      empty.style.display = 'block';
    } else {
      window.renderStudents(students);
      grid.style.display = 'grid';
    }
  } catch (error) {
    window.showToast('Failed to load students: ' + error.message, 'error');
    loading.style.display = 'none';
  } finally {
    window.isLoading = false;
  }
};

/**
 * Render student cards
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
      <div class="header">Student ID: ${student.id || 'N/A'}</div>
      <div class="body">
        <img class="photo" src="${student.photo || 'assets/placeholder.png'}" alt="Photo" onerror="this.src='assets/placeholder.png'">
        <h4 style="margin:5px 0;">${student.name || 'Unknown'}</h4>
        <p style="font-size:13px;color:var(--text-muted);">${student.class || ''} - ${student.section || ''}</p>
        <div class="details">
          <p><strong>Father:</strong> <span>${student.father || '-'}</span></p>
          <p><strong>Mobile:</strong> <span>${student.mobile || '-'}</span></p>
          <p><strong>Added:</strong> <span>${new Date(student.createdAt).toLocaleDateString('en-IN')}</span></p>
        </div>
        <div class="actions">
          <button onclick="window.openEditModal('${student.docId || student.id}')">✏️ Edit</button>
          <button onclick="window.printSingle('${student.id}')">🖨️ Print</button>
          <button class="danger" onclick="window.deleteSingle('${student.docId || student.id}')">🗑️ Delete</button>
        </div>
        <div style="margin-top:8px;">
          <label style="font-size:12px;display:flex;align-items:center;gap:4px;">
            <input type="checkbox" class="student-checkbox" data-id="${student.id}"> Select
          </label>
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
  document.getElementById('selectedCount').textContent =
    count === 0 ? '0 selected' : `${count} selected`;
  const selectAll = document.getElementById('selectAllCheckbox');
  if (selectAll) {
    selectAll.checked = window.allStudents.length > 0 && count === window.allStudents.length;
    selectAll.indeterminate = count > 0 && count < window.allStudents.length;
  }
};

/**
 * Clear filters
 */
window.clearFilters = function() {
  document.getElementById('searchInput').value = '';
  document.getElementById('classFilter').value = '';
  document.getElementById('sectionFilter').value = '';
  window.loadStudents();
};

// ── EDIT ──────────────────────────────────────────────────

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
 * Save student edit
 */
window.saveStudentEdit = async function(e) {
  e.preventDefault();
  const btn = document.getElementById('editSaveBtn');
  const btnText = btn.querySelector('.btn-text');
  const errEl = document.getElementById('editError');

  btn.disabled = true;
  btnText.textContent = '⏳ Saving...';
  errEl.style.display = 'none';

  try {
    const docId = document.getElementById('editDocId').value;
    const mobile = document.getElementById('editMobile').value.trim();

    if (!/^\d{10}$/.test(mobile)) throw new Error('Mobile number must be 10 digits');

    const updates = {
      name: document.getElementById('editName').value.trim(),
      father: document.getElementById('editFather').value.trim(),
      class: document.getElementById('editClass').value,
      section: document.getElementById('editSection').value,
      mobile,
      address: document.getElementById('editAddress').value.trim(),
      updatedAt: Date.now()
    };

    const user = firebase.auth().currentUser;
    if (!user) throw new Error('Not logged in');

    // Photo upload if new
    const photoFile = document.getElementById('editPhoto').files[0];
    if (photoFile) {
      if (!photoFile.type.startsWith('image/')) throw new Error('Only image files allowed');
      if (photoFile.size > 5 * 1024 * 1024) throw new Error('Photo must be less than 5MB');

      const photoUrl = await window.uploadPhoto(user.uid, docId, photoFile, document.getElementById('editClass').value, document.getElementById('editName').value.trim());
      updates.photo = photoUrl;
    }

    // Handle class change (move between subcollections)
    const student = window.allStudents.find(s => (s.docId || s.id) === docId);
    const oldClass = student?.class;
    const newClass = document.getElementById('editClass').value;

    if (oldClass && oldClass !== newClass) {
      await window.dbStudents(user.uid, oldClass).doc(docId).delete();
      await window.dbStudents(user.uid, newClass).add({
        ...student,
        ...updates,
        docId: undefined
      });
    } else {
      await window.dbStudents(user.uid, newClass).doc(docId).update(updates);
    }

    window.showToast('✅ Student updated successfully!', 'success');
    window.closeEditModal();
    window.loadStudents();
  } catch (err) {
    errEl.textContent = err.message;
    errEl.style.display = 'block';
  } finally {
    btn.disabled = false;
    btnText.textContent = '✅ Save Changes';
  }
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

/**
 * Print single student
 */
window.printSingle = function(studentId) {
  window.open('print.html?id=' + studentId, '_blank', 'width=800,height=600');
};

/**
 * Bulk print
 */
window.bulkPrint = function() {
  if (window.selectedStudents.size === 0) {
    window.showToast('Select at least one student', 'error');
    return;
  }
  window.open('print.html?ids=' + Array.from(window.selectedStudents).join(','), '_blank', 'width=800,height=600');
};

/**
 * Bulk delete
 */
window.bulkDelete = function() {
  if (window.selectedStudents.size === 0) {
    window.showToast('Select at least one student', 'error');
    return;
  }
  if (!confirm(`Delete ${window.selectedStudents.size} selected students? This cannot be undone.`)) return;

  const ids = Array.from(window.selectedStudents);
  const user = firebase.auth().currentUser;

  Promise.all(ids.map(id =>
    window.dbStudents(user.uid, window.allStudents.find(s => s.id === id)?.class).doc(id).delete()
  )).then(() => {
    window.showToast(`Deleted ${ids.length} students`, 'success');
    window.selectedStudents.clear();
    window.updateSelectedCount();
    window.loadStudents();
  }).catch(err => window.showToast('Bulk delete failed: ' + err.message, 'error'));
};

/**
 * Export CSV
 */
window.exportCSV = function() {
  if (window.allStudents.length === 0) {
    window.showToast('No students to export', 'error');
    return;
  }

  const headers = ['Student ID', 'Name', 'Father Name', 'Class', 'Section', 'Mobile', 'Address', 'Added On'];
  const rows = window.allStudents.map(s => [
    s.id || '',
    s.name || '',
    s.father || '',
    s.class || '',
    s.section || '',
    s.mobile || '',
    s.address || '',
    s.createdAt ? new Date(s.createdAt).toLocaleDateString('en-IN') : ''
  ]);

  const csvContent = [headers, ...rows]
    .map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `students_${new Date().toISOString().slice(0,10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  window.showToast(`Exported ${window.allStudents.length} students`, 'success');
};

/**
 * Bulk download ZIP
 */
window.bulkDownload = async function() {
  const targets = window.selectedStudents.size > 0
    ? window.allStudents.filter(s => window.selectedStudents.has(s.id))
    : window.allStudents;

  if (targets.length === 0) {
    window.showToast('No students to download', 'error');
    return;
  }

  window.showToast(`Preparing ZIP for ${targets.length} students...`, 'info');

  try {
    const zip = new JSZip();

    // CSV
    const headers = ['Student ID', 'Name', 'Father Name', 'Class', 'Section', 'Mobile', 'Address'];
    const rows = targets.map(s => [s.id||'', s.name||'', s.father||'', s.class||'', s.section||'', s.mobile||'', s.address||'']);
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    zip.file('students.csv', csv);

    // Photos
    const photosFolder = zip.folder('photos');
    const photoPromises = targets
      .filter(s => s.photo)
      .map(async s => {
        try {
          const response = await fetch(s.photo);
          const blob = await response.blob();
          const ext = blob.type.includes('png') ? 'png' : 'jpg';
          const filename = `${s.id}_${(s.name || 'student').replace(/\s+/g, '_')}.${ext}`;
          photosFolder.file(filename, blob);
        } catch (e) {
          // Skip failed
        }
      });

    await Promise.all(photoPromises);

    const content = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(content);
    const a = document.createElement('a');
    a.href = url;
    a.download = `students_${new Date().toISOString().slice(0,10)}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    window.showToast('ZIP downloaded successfully!', 'success');
  } catch (err) {
    window.showToast('Download failed: ' + err.message, 'error');
  }
};

// ── INITIALIZATION ─────────────────────────────────────────

document.addEventListener('DOMContentLoaded', function() {
  // Auth listener
  firebase.auth().onAuthStateChanged(user => {
    if (!user) {
      window.location.href = 'index.html';
      return;
    }

    // Auto-capitalize for edit form
    ['editName', 'editFather', 'editAddress'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('input', () => window.applyProperCase(el));
      }
    });

    // Load students
    window.loadStudents();
  });

  // Debounced search
  let searchTimeout;
  document.getElementById('searchInput')?.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(window.loadStudents, 500);
  });

  // Filter dropdowns
  document.getElementById('classFilter')?.addEventListener('change', window.loadStudents);
  document.getElementById('sectionFilter')?.addEventListener('change', window.loadStudents);

  // Clear filters button
  document.getElementById('clearFiltersBtn')?.addEventListener('click', window.clearFilters);

  // Edit form submit
  document.getElementById('editForm')?.addEventListener('submit', window.saveStudentEdit);

  // Modal close on overlay click
  document.getElementById('editModal')?.addEventListener('click', function(e) {
    if (e.target === e.currentTarget) window.closeEditModal();
  });
});
