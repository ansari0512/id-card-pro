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
  
  try {
    // Delete photo from storage first (non-blocking)
    if (student?.photo) {
      await window.deletePhoto(student.photo);
    }
  } catch (error) {
    console.warn('Photo cleanup failed, continuing with student deletion:', error.message);
  }
  
  // Delete student record
  await window.dbStudents(user.uid, cls).doc(studentId).delete();
  return true;
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

    const students = await window.getStudents(filters);
    window.allStudents = students;

    loading.style.display = 'none';

    if (students.length === 0) {
      empty.style.display = 'block';
    } else {
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
        <input type="checkbox" class="header-checkbox student-checkbox" data-id="${student.id}" id="student-${student.id}">
      </div>
      <div class="student-content">
        <img class="student-photo" src="${student.photo || 'assets/placeholder.png'}" alt="${student.name}" onerror="this.src='assets/placeholder.png'">
        <h3 class="student-name">${student.name || 'Unknown'}</h3>
        <div class="student-class">${student.class || '-'} - ${student.section || '-'}</div>
        
        <div class="student-info-grid">
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
          <button class="btn-print" onclick="window.printSingle('${student.id}')" title="Print ID Card">
            🖨️ Print
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

    const student = window.allStudents.find(s => (s.docId || s.id) === docId);
    const oldPhotoUrl = student?.photo;

    // Photo upload if new
    const photoFile = document.getElementById('editPhoto').files[0];
    if (photoFile) {
      if (!photoFile.type.startsWith('image/')) throw new Error('Only image files allowed');
      if (photoFile.size > 5 * 1024 * 1024) throw new Error('Photo must be less than 5MB');

      // Delete old photo first
      if (oldPhotoUrl) {
        await window.deletePhoto(oldPhotoUrl);
      }

      const photoUrl = await window.uploadPhoto(user.uid, docId, photoFile, document.getElementById('editClass').value, document.getElementById('editName').value.trim());
      updates.photo = photoUrl;
    }

    // Handle class change (move between subcollections)
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

  Promise.all(ids.map(async id => {
    const student = window.allStudents.find(s => s.id === id);
    if (student?.photo) {
      await window.deletePhoto(student.photo);
    }
    return window.dbStudents(user.uid, student?.class).doc(id).delete();
  })).then(() => {
    window.showToast(`Deleted ${ids.length} students`, 'success');
    window.selectedStudents.clear();
    window.updateSelectedCount();
    window.loadStudents();
  }).catch(err => window.showToast('Bulk delete failed: ' + err.message, 'error'));
};

// Short school name helper
window.shortName = function(name) {
  return name.split(/\s+/).map(w => w[0].toUpperCase()).join('').slice(0, 6);
};

/**
 * Export CSV
 */
window.exportCSV = async function() {
  if (window.allStudents.length === 0) {
    window.showToast('No students to export', 'error');
    return;
  }
  const user = firebase.auth().currentUser;
  let schoolName = 'School';
  try {
    const doc = await firebase.firestore().collection('schools').doc(user.uid).get();
    if (doc.exists) schoolName = doc.data().schoolName || 'School';
  } catch(e) {}

  const headers = ['Student ID', 'Name', 'Father Name', 'Class', 'Section', 'Mobile', 'Address', 'Added On'];
  const rows = window.allStudents.map(s => [
    s.id||'', s.name||'', s.father||'', s.class||'',
    s.section||'', s.mobile||'', s.address||'',
    s.createdAt ? new Date(s.createdAt).toLocaleDateString('en-IN') : ''
  ]);
  const csv = [
    [`School: ${schoolName} (Downloaded: ${new Date().toLocaleDateString('en-IN')})`],
    headers,
    ...rows
  ].map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${window.shortName(schoolName)}_students_${new Date().toISOString().slice(0,10)}.csv`;
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
    const user = firebase.auth().currentUser;
    let schoolName = 'School';
    try {
      const doc = await firebase.firestore().collection('schools').doc(user.uid).get();
      if (doc.exists) schoolName = doc.data().schoolName || 'School';
    } catch(e) {}

    const photosFolder = zip.folder('photos');
    
    // Download photos with proper error handling
    const photoPromises = targets
      .filter(s => s.photo)
      .map(s => new Promise(async (resolve) => {
        try {
          // Get fresh download URL from Firebase Storage
          const storageRef = firebase.storage().refFromURL(s.photo);
          const freshUrl = await storageRef.getDownloadURL();
          
          // Use fetch with proper headers
          const response = await fetch(freshUrl, {
            method: 'GET',
            mode: 'cors',
            credentials: 'omit'
          });
          
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }
          
          const blob = await response.blob();
          const ext = blob.type.includes('png') ? 'png' : 'jpg';
          const classFolder = photosFolder.folder(s.class || 'Unknown');
          const fileName = `${s.id}_${(s.name || 'student').replace(/\s+/g, '_')}.${ext}`;
          classFolder.file(fileName, blob);
          
          console.log(`Photo downloaded: ${fileName}`);
        } catch (e) {
          console.warn('Photo download failed for student:', s.id, e.message);
          // Add placeholder for failed photos
          const classFolder = photosFolder.folder(s.class || 'Unknown');
          const fileName = `${s.id}_${(s.name || 'student').replace(/\s+/g, '_')}_FAILED.txt`;
          classFolder.file(fileName, `Photo download failed: ${e.message}`);
        }
        resolve();
      }));

    const shortCode = window.shortName(schoolName);
    const dateStr = new Date().toISOString().slice(0, 10);
    const headers = ['Student ID', 'Name', 'Father Name', 'Class', 'Section', 'Mobile', 'Address', 'Added On'];
    const rows = targets.map(s => [
      s.id||'', s.name||'', s.father||'', s.class||'',
      s.section||'', s.mobile||'', s.address||'',
      s.createdAt ? new Date(s.createdAt).toLocaleDateString('en-IN') : ''
    ]);
    const csv = [
      [`School: ${schoolName} (Downloaded: ${new Date().toLocaleDateString('en-IN')})`],
      headers,
      ...rows
    ].map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
    zip.file(`${shortCode}_students_${dateStr}.csv`, csv);

    // Wait for all photos to download
    await Promise.all(photoPromises);

    const content = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(content);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${window.shortName(schoolName)}_students_${new Date().toISOString().slice(0,10)}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    window.showToast('ZIP downloaded successfully!', 'success');
  } catch (err) {
    window.showToast('Download failed: ' + err.message, 'error');
  }
};

// ── IMPORT & PENDING ─────────────────────────────────────

window.currentTab = 'complete';

// Pending students collection
window.dbPending = function(schoolId) {
  return firebase.firestore().collection('schools').doc(schoolId).collection('pending_students');
};

// Load pending students
window.loadPendingStudents = async function() {
  document.getElementById('loading').style.display = 'block';
  document.getElementById('pendingGrid').style.display = 'none';
  try {
    const user = firebase.auth().currentUser;
    const snap = await window.dbPending(user.uid).orderBy('createdAt', 'desc').get();
    const students = snap.docs.map(d => ({ docId: d.id, ...d.data() }));
    document.getElementById('loading').style.display = 'none';
    if (students.length === 0) {
      document.getElementById('emptyState').style.display = 'block';
      document.getElementById('emptyState').querySelector('h3').textContent = 'No Pending Students';
      document.getElementById('emptyState').querySelector('p').textContent = 'Sab students complete hain!';
    } else {
      window.renderPendingStudents(students);
      document.getElementById('pendingGrid').style.display = 'grid';
    }
  } catch(e) {
    document.getElementById('loading').style.display = 'none';
    window.showToast('Failed to load: ' + e.message, 'error');
  }
};

// Render pending student cards with new design
window.renderPendingStudents = function(students) {
  const grid = document.getElementById('pendingGrid');
  grid.innerHTML = '';
  students.forEach(s => {
    const card = document.createElement('div');
    card.className = 'student-card';
    card.innerHTML = `
      <div class="student-id-header">
        <div class="student-id-text">Student ID: ${s.id || 'N/A'}</div>
      </div>
      <div class="student-content">
        <img class="student-photo" src="assets/placeholder.png" alt="No Photo" style="opacity:0.4;">
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
};

// Update pending badge count
window.updatePendingBadge = async function() {
  try {
    const user = firebase.auth().currentUser;
    if (!user) return;
    const snap = await window.dbPending(user.uid).get();
    const count = snap.size;
    const badge = document.getElementById('pendingBadge');
    if (badge) {
      badge.textContent = count;
      badge.style.display = count > 0 ? 'inline' : 'none';
    }
  } catch(e) {}
};

// Delete pending student
window.deletePending = async function(docId) {
  if (!confirm('Delete this pending student?')) return;
  const user = firebase.auth().currentUser;
  await window.dbPending(user.uid).doc(docId).delete();
  window.showToast('Deleted', 'success');
  window.loadPendingStudents();
  window.updatePendingBadge();
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

// Parse CSV or Excel
window.parseImportFile = function(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      try {
        let students = [];
        if (file.name.endsWith('.csv')) {
          students = window.parseCSV(e.target.result);
        } else {
          // Excel
          const wb = XLSX.read(e.target.result, { type: 'binary' });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
          students = rows.slice(1).map(cols => ({
            name: String(cols[0] || '').trim(),
            father: String(cols[1] || '').trim(),
            class: String(cols[2] || '').trim(),
            section: String(cols[3] || '').trim(),
            mobile: String(cols[4] || '').trim(),
            address: String(cols[5] || '').trim()
          })).filter(s => s.name && s.class);
        }
        resolve(students);
      } catch(e) { reject(e); }
    };
    if (file.name.endsWith('.csv')) reader.readAsText(file);
    else reader.readAsBinaryString(file);
  });
};

// Preview CSV on file select
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

// Import CSV
window.importCSV = async function() {
  const file = document.getElementById('importFile').files[0];
  const errEl = document.getElementById('importError');
  const btn = document.getElementById('importBtn');
  const btnText = document.getElementById('importBtnText');

  if (!file) { errEl.textContent = 'Please select a CSV file'; errEl.style.display = 'block'; return; }

  btn.disabled = true;
  btnText.textContent = '⏳ Importing...';
  errEl.style.display = 'none';

  try {
    const user = firebase.auth().currentUser;
    const students = await window.parseImportFile(file);

    if (students.length === 0) throw new Error('No valid students found in CSV/Excel');

    // Get school code for ID generation
    let schoolCode = 'SCH';
    try {
      const doc = await firebase.firestore().collection('schools').doc(user.uid).get();
      if (doc.exists) schoolCode = (doc.data().schoolName || '').split(/\s+/).filter(w=>w).map(w=>w[0].toUpperCase()).join('').slice(0,4) || 'SCH';
    } catch(e) {}

    const year = new Date().getFullYear();
    const existing = await window.dbGetAllStudents(user.uid);
    const pending = await window.dbPending(user.uid).get();
    let serial = existing.length + pending.size;

    const batch = firebase.firestore().batch();
    students.forEach(s => {
      serial++;
      const id = `${schoolCode}-${year}-${String(serial).padStart(4,'0')}`;
      const ref = window.dbPending(user.uid).doc();
      batch.set(ref, {
        id, name: s.name, father: s.father,
        class: s.class, section: s.section,
        mobile: s.mobile, address: s.address,
        schoolId: user.uid, status: 'pending',
        createdAt: Date.now()
      });
    });
    await batch.commit();

    window.showToast(`✅ ${students.length} students imported! Ab photo upload karein.`, 'success');
    window.closeImportModal();
    window.updatePendingBadge();
    window.switchTab('pending');
  } catch(e) {
    errEl.textContent = e.message;
    errEl.style.display = 'block';
  } finally {
    btn.disabled = false;
    btnText.textContent = '✅ Import';
  }
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

// Upload photo and move pending → complete
window.uploadPendingPhoto = async function() {
  const docId = document.getElementById('pendingDocId').value;
  const file = document.getElementById('pendingPhotoFile').files[0];
  const errEl = document.getElementById('photoUploadError');
  const btn = document.getElementById('photoUploadBtn');
  const btnText = document.getElementById('photoUploadBtnText');

  if (!file) { errEl.textContent = 'Photo select karein'; errEl.style.display = 'block'; return; }
  if (!file.type.startsWith('image/')) { errEl.textContent = 'Only image files allowed'; errEl.style.display = 'block'; return; }
  if (file.size > 5 * 1024 * 1024) { errEl.textContent = 'Photo must be less than 5MB'; errEl.style.display = 'block'; return; }

  btn.disabled = true;
  btnText.textContent = '⏳ Uploading...';
  errEl.style.display = 'none';

  try {
    const user = firebase.auth().currentUser;
    const pendingDoc = await window.dbPending(user.uid).doc(docId).get();
    if (!pendingDoc.exists) throw new Error('Student not found');
    const s = pendingDoc.data();

    // Upload photo
    const photoUrl = await window.uploadPhoto(user.uid, s.id, file, s.class, s.name);

    // Add to complete students
    await window.dbStudents(user.uid, s.class).add({
      id: s.id, uid: user.uid, schoolId: user.uid,
      name: s.name, father: s.father, class: s.class,
      section: s.section, mobile: s.mobile, address: s.address,
      photo: photoUrl, createdAt: s.createdAt, updatedAt: Date.now()
    });

    // Delete from pending
    await window.dbPending(user.uid).doc(docId).delete();

    window.showToast('✅ Student complete ho gaya!', 'success');
    window.closePhotoUploadModal();
    window.updatePendingBadge();
    window.loadPendingStudents();
  } catch(e) {
    errEl.textContent = e.message;
    errEl.style.display = 'block';
  } finally {
    btn.disabled = false;
    btnText.textContent = '✅ Upload & Complete';
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
    window.updatePendingBadge();

    // Auto open import modal if ?tab=import
    if (new URLSearchParams(window.location.search).get('tab') === 'import') {
      window.openImportModal();
    }
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
  document.getElementById('importModal')?.addEventListener('click', function(e) {
    if (e.target === e.currentTarget) window.closeImportModal();
  });
  document.getElementById('photoUploadModal')?.addEventListener('click', function(e) {
    if (e.target === e.currentTarget) window.closePhotoUploadModal();
  });
});
