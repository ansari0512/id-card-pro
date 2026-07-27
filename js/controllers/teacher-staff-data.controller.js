/**
 * Teacher/Staff Data Controller
 */

window.allTeacherStaff = [];
window.selectedTeacherStaff = new Set();
window.isTeacherStaffLoading = false;

// Firestore collection layout:
// schools/{schoolId}/teachers/{teacherDocId}
// where teacherDocId is generated Teacher/Staff ID (tId)

window.dbTeachersCollection = function(schoolId) {
  return firebase.firestore().collection('schools').doc(schoolId).collection('teachers');
};

window.dbGetAllTeacherStaff = async function(schoolId, filters = {}) {
  const qSearch = (filters.search || '').trim().toLowerCase();

  if (window.isMockMode()) {
    const list = JSON.parse(localStorage.getItem('mock_teachers') || '[]');
    let results = list.filter(x => x.schoolId === schoolId);
    if (qSearch) {
      results = results.filter(x =>
        (x.name || '').toLowerCase().includes(qSearch) ||
        (x.mobile || '').toLowerCase().includes(qSearch) ||
        (x.teacherId || '').toLowerCase().includes(qSearch) ||
        (x.id || '').toLowerCase().includes(qSearch)
      );
    }
    return results.sort((a,b)=> (b.createdAt||0)-(a.createdAt||0));
  }

  const snapshot = await window.dbTeachersCollection(schoolId).orderBy('createdAt','desc').get();
  let results = snapshot.docs.map(d => ({ docId: d.id, ...d.data() }));

  if (qSearch) {
    results = results.filter(x =>
      (x.name || '').toLowerCase().includes(qSearch) ||
      (x.mobile || '').toLowerCase().includes(qSearch) ||
      (x.teacherId || '').toLowerCase().includes(qSearch) ||
      (x.id || '').toLowerCase().includes(qSearch)
    );
  }

  return results;
};

window.dbTeacherById = async function(schoolId, teacherDocId) {
  if (window.isMockMode()) {
    const list = JSON.parse(localStorage.getItem('mock_teachers') || '[]');
    return list.find(x => x.docId === teacherDocId) || null;
  }

  const doc = await window.dbTeachersCollection(schoolId).doc(teacherDocId).get();
  return doc.exists ? { docId: doc.id, ...doc.data() } : null;
};

// Teacher photo upload (used by teacher edit flow)
// Defined here because teacher-staff.html does not load id-form.controller.js
window.uploadTeacherPhoto = async function(schoolId, teacherId, file, teacherName, designation) {
  let schoolName = 'School';
  try {
    const doc = await firebase.firestore().collection('schools').doc(schoolId).get();
    if (doc.exists) schoolName = doc.data().schoolName || 'School';
  } catch (e) {}

  const safeSchoolName = String(schoolName).replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '');
  const safeTeacherName = String(teacherName || teacherId).replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '');
  const ext = file.type.includes('png') ? 'png' : 'jpg';
  // Path includes schoolId for storage rule school isolation: teacher_photos/{schoolId}/{schoolName}/{fileName}
  const path = `teacher_photos/${schoolId}/${safeSchoolName}/${safeTeacherName}_${teacherId}.${ext}`;

  const storageRef = firebase.storage().ref().child(path);
  const snapshot = await storageRef.put(file, { contentType: file.type });
  return await snapshot.ref.getDownloadURL();
};

window.deleteTeacherStaff = async function(docId) {
  const user = firebase.auth().currentUser;
  if (!user) throw new Error('Authentication required');

  const teacher = window.allTeacherStaff.find(t => (t.docId || t.id) === docId);
  if (!teacher) throw new Error('Teacher not found');

  // Soft delete: move to deleted_teachers collection
  const deletedRef = firebase.firestore().collection('deleted_teachers').doc();
  
  // Get school name (try from teacher data first, then fetch from school doc)
  let schoolName = teacher?.schoolName;
  if (!schoolName) {
    try {
      const schoolDoc = await firebase.firestore().collection('schools').doc(user.uid).get();
      if (schoolDoc.exists) schoolName = schoolDoc.data().schoolName || 'Unknown School';
    } catch (e) {
      schoolName = 'Unknown School';
    }
  }
  
  const deletedData = {
    ...teacher,
    schoolName: schoolName || 'Unknown School',
    deletedAt: Date.now(),
    deletedBy: user?.email || 'unknown_user_or_admin_operation',
    deletedByRole: 'school',
    originalDocId: docId,
    originalPath: `schools/${user.uid}/teachers/${docId}`
  };

  // Batch: create deleted copy, delete original
  const batch = firebase.firestore().batch();
  batch.set(deletedRef, deletedData);
  batch.delete(window.dbTeachersCollection(user.uid).doc(docId));
  await batch.commit();

  return true;
};

window.saveTeacherStaffEdit = async function(e) {
  e.preventDefault();
  const btn = document.getElementById('teacherEditSaveBtn');
  const btnText = btn.querySelector('.btn-text');
  const errEl = document.getElementById('teacherEditError');

  btn.disabled = true;
  btnText.textContent = '⏳ Saving...';
  errEl.style.display = 'none';

  try {
    const user = firebase.auth().currentUser;
    if (!user) throw new Error('Not logged in');

    const docId = document.getElementById('teacherEditDocId').value;

    const updates = {
      name: window.sanitize(document.getElementById('teacherEditName').value.trim()),
      designation: window.sanitize(document.getElementById('teacherEditDesignation').value.trim()),
      fatherName: window.sanitize(document.getElementById('teacherEditFather').value.trim()),
      dob: window.dateInputToDob(document.getElementById('teacherEditDob').value.trim()),
      bloodGroup: window.sanitize(document.getElementById('teacherEditBlood').value.trim()),
      address: window.sanitize(document.getElementById('teacherEditAddress').value.trim()),
      mobile: document.getElementById('teacherEditMobile').value.trim(),
      otherDetails: window.sanitize(document.getElementById('teacherEditOtherDetails').value.trim()),
      husbandName: window.sanitize(document.getElementById('teacherEditHusband').value.trim()),
      teacherId: window.sanitize(document.getElementById('teacherEditTeacherId').value.trim()),
      updatedAt: Date.now()
    };

    const mobile = updates.mobile;
    if (!/^\d{10}$/.test(mobile)) throw new Error('Mobile number must be 10 digits');
    if (!updates.name || !updates.designation || !updates.fatherName || !updates.dob || !updates.bloodGroup || !updates.address) {
      throw new Error('Required fields must not be empty');
    }

    const teacher = window.allTeacherStaff.find(t => (t.docId || t.id) === docId);
    const oldPhotoUrl = teacher?.photo || null;

    const photoFile = document.getElementById('teacherEditPhoto').files[0];
    if (photoFile) {
      if (!photoFile.type.startsWith('image/')) throw new Error('Only image files allowed');
      if (photoFile.size > 3 * 1024 * 1024) throw new Error('Photo must be less than 3MB');

      if (oldPhotoUrl) {
        await window.deletePhoto(oldPhotoUrl);
      }

      const photoUrl = await window.uploadTeacherPhoto(user.uid, docId, photoFile, updates.name, updates.designation);
      updates.photo = photoUrl;
    }

    await window.dbTeachersCollection(user.uid).doc(docId).update(updates);

    window.showToast('✅ Record updated successfully!', 'success');
    window.closeTeacherEditModal();
    window.loadTeacherStaff();
  } catch (err) {
    errEl.textContent = err.message;
    errEl.style.display = 'block';
  } finally {
    btn.disabled = false;
    btnText.textContent = '✅ Save Changes';
  }
};

window.bulkDeleteTeacherStaff = async function() {
  if (window.selectedTeacherStaff.size === 0) {
    window.showToast('Select at least one record', 'error');
    return;
  }
  if (!confirm(`Delete ${window.selectedTeacherStaff.size} selected records? This cannot be undone.`)) return;

  const ids = Array.from(window.selectedTeacherStaff);
  try {
    await Promise.all(ids.map(docId => window.deleteTeacherStaff(docId)));
    window.showToast(`Deleted ${ids.length} records`, 'success');
    window.selectedTeacherStaff.clear();
    window.updateTeacherSelectedCount();
    window.loadTeacherStaff();
  } catch (err) {
    window.showToast('Bulk delete failed: ' + err.message, 'error');
  }
};

