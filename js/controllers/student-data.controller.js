/**
 * Student Data Controller
 * Handles student data operations, import/export, and business logic
 */

// Global state
window.allStudents = [];
window.selectedStudents = new Set();
window.isLoading = false;
window.currentTab = 'complete';
window.allPendingStudents = [];
window.selectedPending = new Set();
window.allPromoteStudents = [];
window.selectedPromoteStudents = new Set();
window.dropdownSelections = {};

/**
 * Mock mode detector - delegates to shared implementation in helpers.js
 */
window.isMockMode = function() {
  return window.commonIsMockMode && window.commonIsMockMode();
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
  
  // Frontend deletion log (so deletedBy me email aata rahe)
  try {
    const deletedByEmail = user?.email || 'unknown_user_or_admin_operation';
    await firebase.firestore().collection('deletion_logs').add({
      collectionName: 'schools/classes/students',
      documentPath: `schools/${user.uid}/classes/${cls}/students/${studentId}`,
      documentId: studentId,
      deletedData: { studentId },
      deletedAt: Date.now(),
      deletedBy: deletedByEmail,
      reason: 'Student document deleted (frontend log)'
    });
  } catch (logErr) {
    console.warn('Failed to write student deletion log:', logErr.message);
  }

  // Delete student record
  await window.dbStudents(user.uid, cls).doc(studentId).delete();
  return true;
};

// Pending students collection
window.dbPending = function(schoolId) {
  return firebase.firestore().collection('schools').doc(schoolId).collection('pending_students');
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

      // New fields (backward compatible)
      addition: (document.getElementById('editAddition')?.value || '').trim(),
      admissionNo: (document.getElementById('editAdmissionNo')?.value || '').trim(),
      rollNo: (document.getElementById('editRollNo')?.value || '').trim(),
      motherName: (document.getElementById('editMotherName')?.value || '').trim(),
      bloodGroup: (document.getElementById('editBloodGroup')?.value || '').trim(),
      otherInfo: (document.getElementById('editOtherInfo')?.value || '').trim(),

      updatedAt: Date.now()
    };


    const user = firebase.auth().currentUser;
    if (!user) throw new Error('Not logged in');

    // Include schoolId to pass Firestore security validation
    updates.schoolId = user.uid;

    const student = window.allStudents.find(s => (s.docId || s.id) === docId);
    const oldPhotoUrl = student?.photo;

    // Photo upload if new
    const photoFile = document.getElementById('editPhoto').files[0];
    if (photoFile) {
      if (!photoFile.type.startsWith('image/')) throw new Error('Only image files allowed');
      if (photoFile.size > 3 * 1024 * 1024) throw new Error('Photo must be less than 3MB');

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
 * Bulk delete
 */
window.bulkDelete = async function() {
  if (window.selectedStudents.size === 0) {
    window.showToast('Select at least one student', 'error');
    return;
  }
  if (!confirm(`Delete ${window.selectedStudents.size} selected students? This cannot be undone.`)) return;

  const docIds = Array.from(window.selectedStudents);
  const user = firebase.auth().currentUser;

  try {
    // Frontend deletion logs (bulk)
    const deletedByEmail = user?.email || 'unknown_user_or_admin_operation';
    try {
      await Promise.all(docIds.map(async (docId) => {
        const student = window.allStudents.find(s => (s.docId || s.id) === docId);
        const cls = student?.class;
        await firebase.firestore().collection('deletion_logs').add({
          collectionName: 'schools/classes/students',
          documentPath: cls ? `schools/${user.uid}/classes/${cls}/students/${docId}` : `schools/${user.uid}/classes/unknown/students/${docId}`,
          documentId: docId,
          deletedData: { studentId: docId, class: cls || null },
          deletedAt: Date.now(),
          deletedBy: deletedByEmail,
          reason: 'Student documents deleted (bulk frontend log)'
        });
      }));
    } catch (logErr) {
      console.warn('Failed to write bulk student deletion logs:', logErr.message);
    }

    await Promise.all(docIds.map(async docId => {
      const student = window.allStudents.find(s => (s.docId || s.id) === docId);
      if (student?.photo) await window.deletePhoto(student.photo);
      return window.dbStudents(user.uid, student?.class).doc(docId).delete();
    }));

    window.showToast(`Deleted ${docIds.length} students`, 'success');
    window.selectedStudents.clear();
    window.updateSelectedCount();
    window.loadStudents();
  } catch(err) {
    window.showToast('Bulk delete failed: ' + err.message, 'error');
  }
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

  const headers = [
    'Student ID', 'Name', 'Father Name', 'Class', 'Section', 'Mobile', 'Address',
    'Addition', 'Admission No', 'Roll No', 'Mother Name', 'Blood Group', 'Other Info',
    'Added On'
  ];
  const rows = window.allStudents.map(s => [
    s.id||'', s.name||'', s.father||'', s.class||'',
    s.section||'', s.mobile||'', s.address||'',
    s.addition||'', s.admissionNo||'', s.rollNo||'',
    s.motherName||'', s.bloodGroup||'', s.otherInfo||'',
    s.createdAt ? new Date(s.createdAt).toLocaleDateString('en-IN') : ''
  ]);

  const prefixRow = [`School: ${schoolName} (Downloaded: ${new Date().toLocaleDateString('en-IN')})`];
  window.csvDownload(headers, rows, window.shortName(schoolName) + '_students_' + new Date().toISOString().slice(0,10) + '.csv', [prefixRow]);
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

// Load pending students
window.loadPendingStudents = async function() {
  document.getElementById('loading').style.display = 'block';
  document.getElementById('pendingGrid').style.display = 'none';
  try {
    const user = firebase.auth().currentUser;
    const snap = await window.dbPending(user.uid).orderBy('createdAt', 'desc').get();
    const students = snap.docs.map(d => ({ docId: d.id, ...d.data() }));
    window.allPendingStudents = students;
    window.selectedPending.clear();
    document.getElementById('loading').style.display = 'none';

    const filtersBar = document.getElementById('pendingFiltersBar');
    const emptyState = document.getElementById('emptyPendingState');

    if (students.length === 0) {
      if (filtersBar) filtersBar.style.display = 'none';
      if (emptyState) { emptyState.classList.remove('hidden'); emptyState.style.display = 'block'; }
    } else {
      if (filtersBar) filtersBar.style.display = 'flex';
      if (emptyState) { emptyState.classList.add('hidden'); emptyState.style.display = 'none'; }
      // Populate dropdown with available classes (only once when loading)
      window.populateClassDropdown(students, 'pendingClassFilter');
      window.renderPendingStudents(students);
      const pendingGrid = document.getElementById('pendingGrid');
      pendingGrid.classList.remove('hidden');
      pendingGrid.style.display = 'grid';
    }
    window.updatePendingSelectedCount();
  } catch(e) {
    document.getElementById('loading').style.display = 'none';
    window.showToast('Failed to load: ' + e.message, 'error');
  }
};

// Populate class dropdown with only available classes
window.populateClassDropdown = function(students, dropdownId) {
  const dropdown = document.getElementById(dropdownId);
  if (!dropdown) return;
  
  // Get unique classes from students
  const availableClasses = [...new Set(students.map(s => s.class).filter(Boolean))];
  
  // Store current selection before clearing
  const currentValue = dropdown.value || window.dropdownSelections[dropdownId] || '';
  
  // Clear and rebuild options
  dropdown.innerHTML = '';
  
  // Add "All Classes" option
  const allOption = document.createElement('option');
  allOption.value = '';
  allOption.textContent = 'All Classes';
  dropdown.appendChild(allOption);
  
  // Add available classes in order
  const classOrder = ['Nursery','LKG','UKG','KG','1','2','3','4','5','6','7','8','9','10','11','12'];
  classOrder.forEach(cls => {
    if (availableClasses.includes(cls)) {
      const option = document.createElement('option');
      option.value = cls;
      option.textContent = cls === 'Nursery' ? 'Nursery' : cls === 'LKG' ? 'LKG' : cls === 'UKG' ? 'UKG' : cls === 'KG' ? 'KG' : 'Class ' + cls;
      dropdown.appendChild(option);
    }
  });
  
  // Restore previous selection if still available
  if (currentValue && (currentValue === '' || availableClasses.includes(currentValue))) {
    dropdown.value = currentValue;
    window.dropdownSelections[dropdownId] = currentValue;
  }
};

// Bulk delete pending students
window.bulkDeletePending = async function() {
  if (window.selectedPending.size === 0) {
    window.showToast('Please select students first.', 'error');
    return;
  }
  if (!confirm(`Delete ${window.selectedPending.size} pending students? This cannot be undone.`)) return;

  const user = firebase.auth().currentUser;
  const ids = Array.from(window.selectedPending);
  try {
    await Promise.all(ids.map(docId => window.dbPending(user.uid).doc(docId).delete()));
    window.showToast(`${ids.length} students deleted`, 'success');
    window.selectedPending.clear();
    window.loadPendingStudents();
    window.updatePendingBadge();
  } catch(e) {
    window.showToast('Delete failed: ' + e.message, 'error');
  }
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

  try {
    // Frontend deletion log (pending)
    const deletedByEmail = user?.email || 'unknown_user_or_admin_operation';
    let pendingData = null;
    try {
      const snap = await window.dbPending(user.uid).doc(docId).get();
      pendingData = snap.exists ? snap.data() : null;
    } catch(e) {}

    await firebase.firestore().collection('deletion_logs').add({
      collectionName: 'schools/pending_students',
      documentPath: `schools/${user.uid}/pending_students/${docId}`,
      documentId: docId,
      deletedData: pendingData ? { ...pendingData } : { studentId: docId },
      deletedAt: Date.now(),
      deletedBy: deletedByEmail,
      reason: 'Pending student document deleted (frontend log)'
    });
  } catch (logErr) {
    console.warn('Failed to write pending deletion log:', logErr.message);
  }

  await window.dbPending(user.uid).doc(docId).delete();
  window.showToast('Deleted', 'success');
  window.loadPendingStudents();
  window.updatePendingBadge();
};

// Parse CSV or Excel
window.parseImportFile = function(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      try {
        let students = [];
        if (file.name.endsWith('.csv')) {
          const rawRows = window.parseCSV(e.target.result);
          students = rawRows.map(row => {
            const normalized = {};
            Object.entries(row).forEach(([key, value]) => {
              const normalizedKey = String(key || '').trim().toLowerCase()
                .replace(/\s+/g, '')
                .replace(/[^a-z]/g, '');
              normalized[normalizedKey] = String(value || '').trim();
            });
            return {
              name: normalized.name || normalized.fullname || '',
              father: normalized.fathername || normalized.father || '',
              dob: normalized.dob || normalized.dateofbirth || '',
              class: normalized.class || normalized.classname || '',
              section: normalized.section || '',
              mobile: normalized.mobile || normalized.phone || '',
              address: normalized.address || '',

              // New fields (optional)
              addition: normalized.addition || '',
              admissionno: normalized.admissionno || normalized.admission || '',
              rollno: normalized.rollno || normalized.roll || '',
              mothername: normalized.mothername || normalized.mother || '',
              bloodgroup: normalized.bloodgroup || normalized.blood || '',
              otherinfo: normalized.otherinfo || normalized.otherinfofull || normalized.otherinfoinfo || normalized.other || ''
            };
          }).filter(s => s.name && s.class);

        } else {
          // Excel (position-based, header-row validated only)
          const wb = XLSX.read(e.target.result, { type: 'binary' });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

          // Validate HEADER ROW only (row 0)
          const expected = [
            'Addition',
            'Admission No.',
            'Student Name',
            'Roll No.',
            'Date of Birth',
            "Father's Name",
            "Mother's Name",
            'Blood Group',
            'Class',
            'Section',
            'Mobile No.',
            'Address',
            'Other Info.'
          ];

          const headerRow = rows[0] || [];
          const found = expected.map((_, idx) => String(headerRow[idx] || '').trim());

          // User-friendly match: POSITION-based but ignore case, leading/trailing spaces, and punctuation.
          // Still enforces correct column order.
          // Normalize for user-friendly synonym matching (still POSITION-based).
          // Treat these as identical:
          // - DOB <-> Date of Birth
          // - Admission No <-> Admission No.
          // - Roll No <-> Roll No.
          // - Mobile No <-> Mobile No.
          // - Other Info <-> Other Info.
          const norm = s => {
            return String(s || '')
              .toLowerCase()
              .trim()
              // Remove punctuation: ., :, ', "
              .replace(/[\.:\'\"]/g, '')
              // Collapse multiple spaces
              .replace(/\s+/g, ' ');
          };

          const expectedNorm = expected.map(norm);
          const foundNorm = found.map(norm);

          const mismatchAt = expectedNorm.findIndex((expN, idx) => foundNorm[idx] !== expN);
          if (mismatchAt !== -1) {
            const errorEl = document.getElementById('importError');
            if (errorEl) errorEl.style.display = 'block';

            const expectedLines = expected.map((c, i) => `${String.fromCharCode('A'.charCodeAt(0) + i)} = ${c}`).join('\n');
            const foundLines = found
              .map((v, i) => `${String.fromCharCode('A'.charCodeAt(0) + i)} = ${v || ' '}`)
              .join('\n');

            throw new Error(
              '❌ Invalid Excel Format\n\nExpected:\n' + expectedLines +
              '\n\nFound:\n' + foundLines +
              '\n\nPlease use the correct Excel format.'
            );
          }

          // Map student data rows by fixed positions.
          // IMPORTANT: keep existing import positional mapping (do not refactor) —
          // current mapping in this file uses:
          // 0 Name,1 Father,2 DOB,3 Class,4 Section,5 Mobile,6 Address,7 Addition,8 AdmissionNo,9 RollNo,10 MotherName,11 BloodGroup,12 OtherInfo
          // This audit-time standard requires header validation for columns A..N.
          students = rows.slice(1).map(cols => ({
            addition: String(cols[0] || '').trim(),
            admissionNo: String(cols[1] || '').trim(),
            name: String(cols[2] || '').trim(),
            rollNo: String(cols[3] || '').trim(),
            dob: String(cols[4] || '').trim(),
            father: String(cols[5] || '').trim(),
            motherName: String(cols[6] || '').trim(),
            bloodGroup: String(cols[7] || '').trim(),
            class: String(cols[8] || '').trim(),
            section: String(cols[9] || '').trim(),
            mobile: String(cols[10] || '').trim(),
            address: String(cols[11] || '').trim(),
            otherInfo: String(cols[12] || '').trim()
          })).filter(s => (s.name || '').trim() && (s.class || '').trim());

        }
        resolve(students);
      } catch(e) { reject(e); }
    };
    if (file.name.endsWith('.csv')) reader.readAsText(file);
    else reader.readAsBinaryString(file);
  });
};

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

    const db = firebase.firestore();
    const year = new Date().getFullYear();

    // School code fetch
    let schoolCode = 'SCH';
    try {
      const doc = await db.collection('schools').doc(user.uid).get();
      if (doc.exists) schoolCode = (doc.data().schoolName || '')
        .split(/\s+/).filter(w => w).map(w => w[0].toUpperCase()).join('').slice(0, 4) || 'SCH';
    } catch(e) {}

    // Reserve all serial numbers in one transaction to avoid race conditions.
    const counterRef = db.collection('schools').doc(user.uid)
      .collection('counters').doc(String(year));

    const startSerial = await db.runTransaction(async tx => {
      const doc = await tx.get(counterRef);
      const current = doc.exists ? doc.data().count : 0;
      tx.set(counterRef, { count: current + students.length });
      return current + 1; // First reserved serial number
    });

    // Write all pending students in one batch.
    const batch = db.batch();
    students.forEach((s, i) => {
      const id = `${schoolCode}-${year}-${String(startSerial + i).padStart(4, '0')}`;
      const ref = window.dbPending(user.uid).doc();
      batch.set(ref, {
        id, name: s.name, father: s.father,
        dob: s.dob || '',
        class: s.class, section: s.section,
        mobile: s.mobile, address: s.address,

        // New fields (optional)
        addition: s.addition || '',
        admissionNo: s.admissionNo || '',
        rollNo: s.rollNo || '',
        motherName: s.motherName || '',
        bloodGroup: s.bloodGroup || '',
        otherInfo: s.otherInfo || '',

        schoolId: user.uid, status: 'pending',
        createdAt: Date.now()
      });

    });
    await batch.commit();

    window.showToast(`✅ ${students.length} students imported. Upload photos to complete them.`, 'success');
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

// Upload photo and move pending → complete
window.uploadPendingPhoto = async function() {
  const docId = document.getElementById('pendingDocId').value;
  const file = document.getElementById('pendingPhotoFile').files[0];
  const errEl = document.getElementById('photoUploadError');
  const btn = document.getElementById('photoUploadBtn');
  const btnText = document.getElementById('photoUploadBtnText');

  if (!file) { errEl.textContent = 'Please select a photo'; errEl.style.display = 'block'; return; }
  if (!file.type.startsWith('image/')) { errEl.textContent = 'Only image files allowed'; errEl.style.display = 'block'; return; }
  if (file.size > 3 * 1024 * 1024) { errEl.textContent = 'Photo must be less than 3MB'; errEl.style.display = 'block'; return; }

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
      name: s.name, father: s.father || '', class: s.class,
      section: s.section || '', mobile: s.mobile || '0000000000', address: s.address || '',
      photo: photoUrl, createdAt: s.createdAt, updatedAt: Date.now()
    });

    // Delete from pending
    await window.dbPending(user.uid).doc(docId).delete();

    window.showToast('✅ Student completed successfully!', 'success');
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

/**
 * Confirm and execute promotion with new class and section dialog
 */
window.confirmPromotion = async function() {
  if (window.selectedPromoteStudents.size === 0) {
    window.showToast('Please select at least one student', 'error');
    return;
  }

  const toClass = document.getElementById('promoteTargetClass').value;
  const toSection = document.getElementById('promoteTargetSection').value;
  if (!toClass) {
    const errorEl = document.getElementById('promoteTargetError');
    if (errorEl) {
      errorEl.textContent = 'Please select the target class';
      errorEl.style.display = 'block';
    }
    return;
  }

  const selectedCount = window.selectedPromoteStudents.size;
  if (!confirm(`Promote ${selectedCount} students to ${toClass}${toSection ? ' - ' + toSection : ''}?\n\nThis action cannot be undone.`)) {
    return;
  }

  const actionBtn = document.getElementById('promoteConfirmBtn');
  const modalBtn = document.getElementById('promoteTargetConfirmBtn');
  if (actionBtn) {
    actionBtn.disabled = true;
    actionBtn.textContent = '⏳ Promoting...';
  }
  if (modalBtn) {
    modalBtn.disabled = true;
    modalBtn.textContent = '⏳ Promoting...';
  }

  try {
    const user = firebase.auth().currentUser;
    const selectedIds = Array.from(window.selectedPromoteStudents);
    const studentsToPromote = window.allPromoteStudents.filter(s => selectedIds.includes(s.docId || s.id));

    const batch = firebase.firestore().batch();

    for (const student of studentsToPromote) {
      const oldClass = student.class;
      const newClass = toClass;
      const newSection = toSection || student.section;

      if (oldClass !== newClass) {
        const oldRef = window.dbStudents(user.uid, oldClass).doc(student.docId || student.id);
        batch.delete(oldRef);
        const newRef = window.dbStudents(user.uid, newClass).doc();
        batch.set(newRef, {
          ...student,
          class: newClass,
          section: newSection,
          updatedAt: Date.now()
        });
      } else {
        const ref = window.dbStudents(user.uid, oldClass).doc(student.docId || student.id);
        batch.update(ref, {
          section: newSection,
          updatedAt: Date.now()
        });
      }
    }

    await batch.commit();
    window.showToast(`✅ Successfully promoted ${selectedCount} students to ${toClass}${toSection ? ' - ' + toSection : ''}!`, 'success');
    window.loadPromoteStudentsTable();
  } catch (error) {
    window.showToast('Promotion failed: ' + error.message, 'error');
  } finally {
    document.getElementById('promoteTargetModal')?.classList.remove('open');
    if (actionBtn) {
      actionBtn.disabled = false;
      actionBtn.textContent = `🎓 Promote Selected`;
    }
    if (modalBtn) {
      modalBtn.disabled = false;
      modalBtn.textContent = '✅ Confirm Promote';
    }
  }
};
