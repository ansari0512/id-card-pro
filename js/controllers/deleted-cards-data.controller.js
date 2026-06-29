/**
 * Deleted Cards Data Controller
 * Handles data loading, restore, permanent delete for deleted records
 */

// Pagination state
window.deletedStudentsPagination = {
  currentPage: 1,
  pageSize: 50,
  lastVisibleDoc: null,
  totalCount: 0,
  hasNextPage: false,
  hasPrevPage: false
};

window.deletedTeachersPagination = {
  currentPage: 1,
  pageSize: 50,
  lastVisibleDoc: null,
  totalCount: 0,
  hasNextPage: false,
  hasPrevPage: false
};

/**
 * Populate school dropdown from deleted records (only schools with deletions)
 */
window.populateSchoolDropdown = async function(dropdownId, includeAllOption = true) {
  const dropdown = document.getElementById(dropdownId);
  if (!dropdown) return;

  try {
    // Clear existing options
    dropdown.innerHTML = '';

    // Add "All Schools" option if needed
    if (includeAllOption) {
      const allOption = document.createElement('option');
      allOption.value = '';
      allOption.textContent = 'All Schools';
      dropdown.appendChild(allOption);
    }

    // For students tab - populate from deleted_students
    if (dropdownId === 'studentSchoolFilter') {
      const snapshot = await firebase.firestore()
        .collection('deleted_students')
        .get();

      const students = snapshot.docs.map(d => d.data());
      
      // Extract unique schools using Map to deduplicate by schoolId
      const schoolsMap = new Map();
      students.forEach(s => {
        if (s.schoolId && s.schoolName) {
          schoolsMap.set(s.schoolId, s.schoolName);
        }
      });

      // Add schools sorted by name
      const sortedSchools = Array.from(schoolsMap.entries()).sort((a, b) => 
        (a[1] || '').toLowerCase().localeCompare((b[1] || '').toLowerCase())
      );

      sortedSchools.forEach(([schoolId, schoolName]) => {
        const option = document.createElement('option');
        option.value = schoolId;
        option.textContent = schoolName;
        dropdown.appendChild(option);
      });
    }
    
    // For teachers tab - populate from deleted_teachers
    if (dropdownId === 'teacherSchoolFilter') {
      const snapshot = await firebase.firestore()
        .collection('deleted_teachers')
        .get();

      const teachers = snapshot.docs.map(d => d.data());
      
      // Extract unique schools using Map to deduplicate by schoolId
      const schoolsMap = new Map();
      teachers.forEach(t => {
        if (t.schoolId && t.schoolName) {
          schoolsMap.set(t.schoolId, t.schoolName);
        }
      });

      // Add schools sorted by name
      const sortedSchools = Array.from(schoolsMap.entries()).sort((a, b) => 
        (a[1] || '').toLowerCase().localeCompare((b[1] || '').toLowerCase())
      );

      sortedSchools.forEach(([schoolId, schoolName]) => {
        const option = document.createElement('option');
        option.value = schoolId;
        option.textContent = schoolName;
        dropdown.appendChild(option);
      });
    }
  } catch (error) {
    console.error('Error populating school dropdown:', error);
  }
};

/**
 * Load deleted students with filters and pagination
 */
window.loadDeletedStudents = async function() {
  const loading = document.getElementById('deletedStudentsLoading');
  const grid = document.getElementById('deletedStudentsGrid');
  const empty = document.getElementById('deletedStudentsEmpty');
  const pagination = document.getElementById('deletedStudentsPagination');

  loading.style.display = 'block';
  grid.style.display = 'none';
  grid.classList.add('hidden');
  empty.style.display = 'none';
  empty.classList.add('hidden');
  pagination.classList.add('hidden');

  try {
    const schoolFilter = document.getElementById('studentSchoolFilter')?.value || '';
    const classFilter = document.getElementById('studentClassFilter')?.value || '';
    const sectionFilter = document.getElementById('studentSectionFilter')?.value || '';
    const searchName = document.getElementById('studentSearchName')?.value?.trim().toLowerCase() || '';
    const searchId = document.getElementById('studentSearchId')?.value?.trim().toLowerCase() || '';

    let query = firebase.firestore().collection('deleted_students');

    // Apply filters
    if (schoolFilter) {
      query = query.where('schoolId', '==', schoolFilter);
    }
    if (classFilter) {
      query = query.where('originalClass', '==', classFilter);
    }
    if (sectionFilter) {
      query = query.where('section', '==', sectionFilter);
    }

    // Order by deletedAt descending
    query = query.orderBy('deletedAt', 'desc');

    // Pagination
    const pageSize = window.deletedStudentsPagination.pageSize;
    const currentPage = window.deletedStudentsPagination.currentPage;

    if (currentPage === 1) {
      query = query.limit(pageSize);
    } else {
      const lastDoc = window.deletedStudentsPagination.lastVisibleDoc;
      if (lastDoc) {
        query = query.startAfter(lastDoc).limit(pageSize);
      } else {
        query = query.limit(pageSize);
      }
    }

    const snapshot = await query.get();
    let students = snapshot.docs.map(d => ({ ...d.data(), docId: d.id }));
    
    // Debug: Log all students to verify docIds
    console.log('Query returned', students.length, 'students');
    console.log('All docIds:', students.map(s => ({ id: s.id, docId: s.docId })));
    
    // Debug: Log full first student object
    if (students.length > 0) {
      console.log('Full first student object:', JSON.stringify(students[0], null, 2));
    }

    // Apply search filters client-side
    if (searchName) {
      students = students.filter(s => (s.name || '').toLowerCase().includes(searchName));
    }
    if (searchId) {
      students = students.filter(s => (s.id || '').toLowerCase().includes(searchId));
    }

    // Update pagination state
    window.deletedStudentsPagination.totalCount = snapshot.size;
    window.deletedStudentsPagination.hasNextPage = snapshot.docs.length === pageSize;
    window.deletedStudentsPagination.hasPrevPage = currentPage > 1;
    window.deletedStudentsPagination.lastVisibleDoc = snapshot.docs[snapshot.docs.length - 1] || null;

    // Update UI
    const countEl = document.getElementById('deletedStudentCount');
    if (countEl) {
      countEl.textContent = `👨‍🎓 ${students.length} Deleted Students`;
    }

    if (students.length === 0) {
      empty.style.display = 'block';
      empty.classList.remove('hidden');
    } else {
      grid.style.display = 'grid';
      grid.classList.remove('hidden');
      window.renderDeletedStudents(students);
      pagination.classList.remove('hidden');
      window.updateDeletedStudentsPaginationUI();
    }

    loading.style.display = 'none';
  } catch (error) {
    loading.style.display = 'none';
    window.showToast('Failed to load deleted students: ' + error.message, 'error');
  }
};

/**
 * Load deleted teachers with filters and pagination
 */
window.loadDeletedTeachers = async function() {
  const loading = document.getElementById('deletedTeachersLoading');
  const grid = document.getElementById('deletedTeachersGrid');
  const empty = document.getElementById('deletedTeachersEmpty');
  const pagination = document.getElementById('deletedTeachersPagination');

  loading.style.display = 'block';
  grid.style.display = 'none';
  grid.classList.add('hidden');
  empty.style.display = 'none';
  empty.classList.add('hidden');
  pagination.classList.add('hidden');

  try {
    const schoolFilter = document.getElementById('teacherSchoolFilter')?.value || '';
    const searchName = document.getElementById('teacherSearchName')?.value?.trim().toLowerCase() || '';
    const searchId = document.getElementById('teacherSearchId')?.value?.trim().toLowerCase() || '';

    let query = firebase.firestore().collection('deleted_teachers');

    // Apply filters
    if (schoolFilter) {
      query = query.where('schoolId', '==', schoolFilter);
    }

    // Order by deletedAt descending
    query = query.orderBy('deletedAt', 'desc');

    // Pagination
    const pageSize = window.deletedTeachersPagination.pageSize;
    const currentPage = window.deletedTeachersPagination.currentPage;

    if (currentPage === 1) {
      query = query.limit(pageSize);
    } else {
      const lastDoc = window.deletedTeachersPagination.lastVisibleDoc;
      if (lastDoc) {
        query = query.startAfter(lastDoc).limit(pageSize);
      } else {
        query = query.limit(pageSize);
      }
    }

    const snapshot = await query.get();
    let teachers = snapshot.docs.map(d => ({ ...d.data(), docId: d.id }));

    // Apply search filters client-side
    if (searchName) {
      teachers = teachers.filter(t => (t.name || '').toLowerCase().includes(searchName));
    }
    if (searchId) {
      teachers = teachers.filter(t => (t.id || '').toLowerCase().includes(searchId));
    }

    // Update pagination state
    window.deletedTeachersPagination.totalCount = snapshot.size;
    window.deletedTeachersPagination.hasNextPage = snapshot.docs.length === pageSize;
    window.deletedTeachersPagination.hasPrevPage = currentPage > 1;
    window.deletedTeachersPagination.lastVisibleDoc = snapshot.docs[snapshot.docs.length - 1] || null;

    // Update UI
    const countEl = document.getElementById('deletedTeacherCount');
    if (countEl) {
      countEl.textContent = `👨‍🏫 ${teachers.length} Deleted Teachers`;
    }

    if (teachers.length === 0) {
      empty.style.display = 'block';
      empty.classList.remove('hidden');
    } else {
      grid.style.display = 'grid';
      grid.classList.remove('hidden');
      window.renderDeletedTeachers(teachers);
      pagination.classList.remove('hidden');
      window.updateDeletedTeachersPaginationUI();
    }

    loading.style.display = 'none';
  } catch (error) {
    loading.style.display = 'none';
    window.showToast('Failed to load deleted teachers: ' + error.message, 'error');
  }
};

/**
 * Load deleted schools
 */
window.loadDeletedSchools = async function() {
  const loading = document.getElementById('deletedSchoolsLoading');
  const grid = document.getElementById('deletedSchoolsGrid');
  const empty = document.getElementById('deletedSchoolsEmpty');

  loading.style.display = 'block';
  grid.style.display = 'none';
  grid.classList.add('hidden');
  empty.style.display = 'none';
  empty.classList.add('hidden');

  try {
    const snapshot = await firebase.firestore()
      .collection('deleted_schools')
      .orderBy('deletedAt', 'desc')
      .get();

    const schools = snapshot.docs.map(d => ({ docId: d.id, ...d.data() }));

    // Update UI
    const countEl = document.getElementById('deletedSchoolCount');
    if (countEl) {
      countEl.textContent = `🏫 ${schools.length} Deleted Schools`;
    }

    if (schools.length === 0) {
      empty.style.display = 'block';
      empty.classList.remove('hidden');
    } else {
      grid.style.display = 'grid';
      grid.classList.remove('hidden');
      window.renderDeletedSchools(schools);
    }

    loading.style.display = 'none';
  } catch (error) {
    console.warn('Deleted schools query failed:', error.message);
    loading.style.display = 'none';
    empty.style.display = 'block';
    empty.classList.remove('hidden');
  }
};

/**
 * Restore single student
 */
window.restoreStudent = async function(docId) {
  const user = firebase.auth().currentUser;
  if (!user) throw new Error('Not authenticated');

  try {
    console.log('Attempting to restore student with docId:', docId);
    
    // Get deleted student document
    const deletedDoc = await firebase.firestore().collection('deleted_students').doc(docId).get();
    console.log('Document exists:', deletedDoc.exists);
    
    if (!deletedDoc.exists) {
      // Try to find the document to see what's in the collection
      const allDocs = await firebase.firestore().collection('deleted_students').limit(5).get();
      console.log('Sample documents in deleted_students:', allDocs.docs.map(d => d.id));
      throw new Error('Deleted student not found');
    }

    const studentData = deletedDoc.data();

    // Validation: Check if school exists
    const schoolDoc = await firebase.firestore().collection('schools').doc(studentData.schoolId).get();
    if (!schoolDoc.exists) throw new Error('School no longer exists');

    // Validation: Check for duplicate ID
    const existingDoc = await firebase.firestore().collection('schools')
      .doc(studentData.schoolId)
      .collection('classes')
      .doc(studentData.originalClass)
      .collection('students')
      .doc(studentData.originalDocId)
      .get();

    if (existingDoc.exists) {
      throw new Error('Student with this ID already exists');
    }

    // Restore: Write back to original location
    const restoreData = { ...studentData };
    delete restoreData.deletedAt;
    delete restoreData.deletedBy;
    delete restoreData.deletedByRole;
    delete restoreData.originalDocId;
    delete restoreData.originalPath;
    delete restoreData.originalClass;
    delete restoreData.schoolName;

    const batch = firebase.firestore().batch();
    const originalRef = firebase.firestore().collection('schools')
      .doc(studentData.schoolId)
      .collection('classes')
      .doc(studentData.originalClass)
      .collection('students')
      .doc(studentData.originalDocId);

    batch.set(originalRef, restoreData);
    batch.delete(deletedDoc.ref);

    await batch.commit();

    // Audit log
    await firebase.firestore().collection('deletion_logs').add({
      type: 'restore',
      collectionName: 'deleted_students',
      documentPath: `deleted_students/${docId}`,
      documentId: docId,
      originalData: {
        id: studentData.id,
        name: studentData.name,
        class: studentData.originalClass,
        schoolId: studentData.schoolId
      },
      restoredTo: `schools/${studentData.schoolId}/classes/${studentData.originalClass}/students/${studentData.originalDocId}`,
      deletedAt: studentData.deletedAt,
      actionBy: user.email,
      actionAt: Date.now(),
      actionRole: 'admin',
      reason: 'Student restored by admin'
    });

    return true;
  } catch (error) {
    console.error('Restore failed:', error);
    throw error;
  }
};

/**
 * Restore single teacher
 */
window.restoreTeacher = async function(docId) {
  const user = firebase.auth().currentUser;
  if (!user) throw new Error('Not authenticated');

  try {
    const deletedDoc = await firebase.firestore().collection('deleted_teachers').doc(docId).get();
    if (!deletedDoc.exists) throw new Error('Deleted teacher not found');

    const teacherData = deletedDoc.data();

    // Validation: Check if school exists
    const schoolDoc = await firebase.firestore().collection('schools').doc(teacherData.schoolId).get();
    if (!schoolDoc.exists) throw new Error('School no longer exists');

    // Validation: Check for duplicate ID
    const existingDoc = await firebase.firestore().collection('schools')
      .doc(teacherData.schoolId)
      .collection('teachers')
      .doc(teacherData.originalDocId)
      .get();

    if (existingDoc.exists) {
      throw new Error('Teacher with this ID already exists');
    }

    // Restore
    const restoreData = { ...teacherData };
    delete restoreData.deletedAt;
    delete restoreData.deletedBy;
    delete restoreData.deletedByRole;
    delete restoreData.originalDocId;
    delete restoreData.originalPath;
    delete restoreData.schoolName;

    const batch = firebase.firestore().batch();
    const originalRef = firebase.firestore().collection('schools')
      .doc(teacherData.schoolId)
      .collection('teachers')
      .doc(teacherData.originalDocId);

    batch.set(originalRef, restoreData);
    batch.delete(deletedDoc.ref);

    await batch.commit();

    // Audit log
    await firebase.firestore().collection('deletion_logs').add({
      type: 'restore',
      collectionName: 'deleted_teachers',
      documentPath: `deleted_teachers/${docId}`,
      documentId: docId,
      originalData: {
        id: teacherData.id,
        name: teacherData.name,
        designation: teacherData.designation,
        schoolId: teacherData.schoolId
      },
      restoredTo: `schools/${teacherData.schoolId}/teachers/${teacherData.originalDocId}`,
      deletedAt: teacherData.deletedAt,
      actionBy: user.email,
      actionAt: Date.now(),
      actionRole: 'admin',
      reason: 'Teacher restored by admin'
    });

    return true;
  } catch (error) {
    console.error('Restore failed:', error);
    throw error;
  }
};

/**
 * Restore single school
 */
window.restoreSchool = async function(schoolId) {
  const user = firebase.auth().currentUser;
  if (!user) throw new Error('Not authenticated');

  try {
    const deletedDoc = await firebase.firestore().collection('deleted_schools').doc(schoolId).get();
    if (!deletedDoc.exists) throw new Error('Deleted school not found');

    const schoolData = deletedDoc.data();

    // Restore school document
    const restoreData = { ...schoolData };
    delete restoreData.deletedAt;
    delete restoreData.deletedBy;
    delete restoreData.deletedByRole;
    delete restoreData.originalPath;

    const batch = firebase.firestore().batch();

    // Restore school
    const schoolRef = firebase.firestore().collection('schools').doc(schoolId);
    batch.set(schoolRef, restoreData);

    // Delete from deleted_schools
    batch.delete(deletedDoc.ref);

    await batch.commit();

    // Audit log
    await firebase.firestore().collection('deletion_logs').add({
      type: 'restore',
      collectionName: 'deleted_schools',
      documentPath: `deleted_schools/${schoolId}`,
      documentId: schoolId,
      originalData: {
        schoolName: schoolData.schoolName,
        email: schoolData.email
      },
      restoredTo: `schools/${schoolId}`,
      deletedAt: schoolData.deletedAt,
      actionBy: user.email,
      actionAt: Date.now(),
      actionRole: 'admin',
      reason: 'School restored by admin'
    });

    return true;
  } catch (error) {
    console.error('Restore failed:', error);
    throw error;
  }
};

/**
 * Permanent delete single student
 */
window.permanentDeleteStudent = async function(docId) {
  const user = firebase.auth().currentUser;
  if (!user) throw new Error('Not authenticated');

  try {
    const deletedDoc = await firebase.firestore().collection('deleted_students').doc(docId).get();
    if (!deletedDoc.exists) throw new Error('Deleted student not found');

    const studentData = deletedDoc.data();

    // Delete photo from storage if exists
    if (studentData.photo) {
      try {
        await firebase.storage().refFromURL(studentData.photo).delete();
      } catch (e) {
        console.warn('Photo delete failed:', e.message);
      }
    }

    // Delete from deleted_students
    try {
      await deletedDoc.ref.delete();
    } catch (e) {
      console.warn('Delete failed, trying with admin bypass:', e.message);
      // If delete fails due to permissions, try direct delete
      await firebase.firestore().collection('deleted_students').doc(docId).delete();
    }

    // Audit log
    await firebase.firestore().collection('deletion_logs').add({
      type: 'permanent_delete',
      collectionName: 'deleted_students',
      documentPath: `deleted_students/${docId}`,
      documentId: docId,
      originalData: {
        id: studentData.id,
        name: studentData.name,
        schoolId: studentData.schoolId
      },
      deletedAt: studentData.deletedAt,
      actionBy: user.email,
      actionAt: Date.now(),
      actionRole: 'admin',
      reason: 'Student permanently deleted by admin',
      photoDeleted: !!studentData.photo
    });

    return true;
  } catch (error) {
    console.error('Permanent delete failed:', error);
    throw error;
  }
};

/**
 * Permanent delete single teacher
 */
window.permanentDeleteTeacher = async function(docId) {
  const user = firebase.auth().currentUser;
  if (!user) throw new Error('Not authenticated');

  try {
    const deletedDoc = await firebase.firestore().collection('deleted_teachers').doc(docId).get();
    if (!deletedDoc.exists) throw new Error('Deleted teacher not found');

    const teacherData = deletedDoc.data();

    // Delete photo from storage if exists
    if (teacherData.photo) {
      try {
        await firebase.storage().refFromURL(teacherData.photo).delete();
      } catch (e) {
        console.warn('Photo delete failed:', e.message);
      }
    }

    // Delete from deleted_teachers
    await deletedDoc.ref.delete();

    // Audit log
    await firebase.firestore().collection('deletion_logs').add({
      type: 'permanent_delete',
      collectionName: 'deleted_teachers',
      documentPath: `deleted_teachers/${docId}`,
      documentId: docId,
      originalData: {
        id: teacherData.id,
        name: teacherData.name,
        schoolId: teacherData.schoolId
      },
      deletedAt: teacherData.deletedAt,
      actionBy: user.email,
      actionAt: Date.now(),
      actionRole: 'admin',
      reason: 'Teacher permanently deleted by admin',
      photoDeleted: !!teacherData.photo
    });

    return true;
  } catch (error) {
    console.error('Permanent delete failed:', error);
    throw error;
  }
};

/**
 * Permanent delete single school
 */
window.permanentDeleteSchool = async function(schoolId) {
  const user = firebase.auth().currentUser;
  if (!user) throw new Error('Not authenticated');

  try {
    const deletedDoc = await firebase.firestore().collection('deleted_schools').doc(schoolId).get();
    if (!deletedDoc.exists) throw new Error('Deleted school not found');

    const schoolData = deletedDoc.data();

    // Delete all deleted students for this school
    const studentsSnapshot = await firebase.firestore()
      .collection('deleted_students')
      .where('schoolId', '==', schoolId)
      .get();

    for (const studentDoc of studentsSnapshot.docs) {
      const studentData = studentDoc.data();
      if (studentData.photo) {
        try {
          await firebase.storage().refFromURL(studentData.photo).delete();
        } catch (e) {
          console.warn('Student photo delete failed:', e.message);
        }
      }
      await studentDoc.ref.delete();
    }

    // Delete all deleted teachers for this school
    const teachersSnapshot = await firebase.firestore()
      .collection('deleted_teachers')
      .where('schoolId', '==', schoolId)
      .get();

    for (const teacherDoc of teachersSnapshot.docs) {
      const teacherData = teacherDoc.data();
      if (teacherData.photo) {
        try {
          await firebase.storage().refFromURL(teacherData.photo).delete();
        } catch (e) {
          console.warn('Teacher photo delete failed:', e.message);
        }
      }
      await teacherDoc.ref.delete();
    }

    // Delete school document
    await deletedDoc.ref.delete();

    // Audit log
    await firebase.firestore().collection('deletion_logs').add({
      type: 'permanent_delete',
      collectionName: 'deleted_schools',
      documentPath: `deleted_schools/${schoolId}`,
      documentId: schoolId,
      originalData: {
        schoolName: schoolData.schoolName,
        email: schoolData.email
      },
      deletedAt: schoolData.deletedAt,
      actionBy: user.email,
      actionAt: Date.now(),
      actionRole: 'admin',
      reason: 'School permanently deleted by admin'
    });

    return true;
  } catch (error) {
    console.error('Permanent delete failed:', error);
    throw error;
  }
};

/**
 * Bulk restore students
 */
window.bulkRestoreStudents = async function(docIds) {
  const user = firebase.auth().currentUser;
  if (!user) throw new Error('Not authenticated');

  const results = [];
  const batch = firebase.firestore().batch();
  let batchCount = 0;
  const BATCH_LIMIT = 500;

  for (const docId of docIds) {
    try {
      const deletedDoc = await firebase.firestore().collection('deleted_students').doc(docId).get();
      if (!deletedDoc.exists) continue;

      const studentData = deletedDoc.data();

      // Validation
      const schoolDoc = await firebase.firestore().collection('schools').doc(studentData.schoolId).get();
      if (!schoolDoc.exists) {
        results.push({ docId, success: false, error: 'School no longer exists' });
        continue;
      }

      const existingDoc = await firebase.firestore().collection('schools')
        .doc(studentData.schoolId)
        .collection('classes')
        .doc(studentData.originalClass)
        .collection('students')
        .doc(studentData.originalDocId)
        .get();

      if (existingDoc.exists) {
        results.push({ docId, success: false, error: 'Student already exists' });
        continue;
      }

      // Add to batch
      const restoreData = { ...studentData };
      delete restoreData.deletedAt;
      delete restoreData.deletedBy;
      delete restoreData.deletedByRole;
      delete restoreData.originalDocId;
      delete restoreData.originalPath;
      delete restoreData.originalClass;
      delete restoreData.schoolName;

      const originalRef = firebase.firestore().collection('schools')
        .doc(studentData.schoolId)
        .collection('classes')
        .doc(studentData.originalClass)
        .collection('students')
        .doc(studentData.originalDocId);

      batch.set(originalRef, restoreData);
      batch.delete(deletedDoc.ref);
      batchCount += 2;

      results.push({ docId, success: true });

      // Commit batch if limit reached
      if (batchCount >= BATCH_LIMIT) {
        await batch.commit();
        batchCount = 0;
      }
    } catch (error) {
      results.push({ docId, success: false, error: error.message });
    }
  }

  // Commit remaining
  if (batchCount > 0) {
    await batch.commit();
  }

  // Audit log
  const successCount = results.filter(r => r.success).length;
  await firebase.firestore().collection('deletion_logs').add({
    type: 'bulk_restore',
    collectionName: 'deleted_students',
    documentPath: 'bulk_restore',
    documentId: 'bulk_' + Date.now(),
    originalData: { count: docIds.length, success: successCount },
    actionBy: user.email,
    actionAt: Date.now(),
    actionRole: 'admin',
    reason: `Bulk restore ${successCount}/${docIds.length} students`
  });

  return results;
};

/**
 * Bulk permanent delete students
 */
window.bulkPermanentDeleteStudents = async function(docIds) {
  const user = firebase.auth().currentUser;
  if (!user) throw new Error('Not authenticated');

  const results = [];

  for (const docId of docIds) {
    try {
      const deletedDoc = await firebase.firestore().collection('deleted_students').doc(docId).get();
      if (!deletedDoc.exists) continue;

      const studentData = deletedDoc.data();

      // Delete photo
      if (studentData.photo) {
        try {
          await firebase.storage().refFromURL(studentData.photo).delete();
        } catch (e) {
          console.warn('Photo delete failed:', e.message);
        }
      }

      // Delete document
      await deletedDoc.ref.delete();
      results.push({ docId, success: true });
    } catch (error) {
      results.push({ docId, success: false, error: error.message });
    }
  }

  // Audit log
  const successCount = results.filter(r => r.success).length;
  await firebase.firestore().collection('deletion_logs').add({
    type: 'bulk_permanent_delete',
    collectionName: 'deleted_students',
    documentPath: 'bulk_permanent_delete',
    documentId: 'bulk_' + Date.now(),
    originalData: { count: docIds.length, success: successCount },
    actionBy: user.email,
    actionAt: Date.now(),
    actionRole: 'admin',
    reason: `Bulk permanent delete ${successCount}/${docIds.length} students`
  });

  return results;
};

/**
 * Bulk restore teachers
 */
window.bulkRestoreTeachers = async function(docIds) {
  const user = firebase.auth().currentUser;
  if (!user) throw new Error('Not authenticated');

  const results = [];
  const batch = firebase.firestore().batch();
  let batchCount = 0;
  const BATCH_LIMIT = 500;

  for (const docId of docIds) {
    try {
      const deletedDoc = await firebase.firestore().collection('deleted_teachers').doc(docId).get();
      if (!deletedDoc.exists) continue;

      const teacherData = deletedDoc.data();

      // Validation
      const schoolDoc = await firebase.firestore().collection('schools').doc(teacherData.schoolId).get();
      if (!schoolDoc.exists) {
        results.push({ docId, success: false, error: 'School no longer exists' });
        continue;
      }

      const existingDoc = await firebase.firestore().collection('schools')
        .doc(teacherData.schoolId)
        .collection('teachers')
        .doc(teacherData.originalDocId)
        .get();

      if (existingDoc.exists) {
        results.push({ docId, success: false, error: 'Teacher already exists' });
        continue;
      }

      // Add to batch
      const restoreData = { ...teacherData };
      delete restoreData.deletedAt;
      delete restoreData.deletedBy;
      delete restoreData.deletedByRole;
      delete restoreData.originalDocId;
      delete restoreData.originalPath;
      delete restoreData.schoolName;

      const originalRef = firebase.firestore().collection('schools')
        .doc(teacherData.schoolId)
        .collection('teachers')
        .doc(teacherData.originalDocId);

      batch.set(originalRef, restoreData);
      batch.delete(deletedDoc.ref);
      batchCount += 2;

      results.push({ docId, success: true });

      // Commit batch if limit reached
      if (batchCount >= BATCH_LIMIT) {
        await batch.commit();
        batchCount = 0;
      }
    } catch (error) {
      results.push({ docId, success: false, error: error.message });
    }
  }

  // Commit remaining
  if (batchCount > 0) {
    await batch.commit();
  }

  // Audit log
  const successCount = results.filter(r => r.success).length;
  await firebase.firestore().collection('deletion_logs').add({
    type: 'bulk_restore',
    collectionName: 'deleted_teachers',
    documentPath: 'bulk_restore',
    documentId: 'bulk_' + Date.now(),
    originalData: { count: docIds.length, success: successCount },
    actionBy: user.email,
    actionAt: Date.now(),
    actionRole: 'admin',
    reason: `Bulk restore ${successCount}/${docIds.length} teachers`
  });

  return results;
};

/**
 * Bulk permanent delete teachers
 */
window.bulkPermanentDeleteTeachers = async function(docIds) {
  const user = firebase.auth().currentUser;
  if (!user) throw new Error('Not authenticated');

  const results = [];

  for (const docId of docIds) {
    try {
      const deletedDoc = await firebase.firestore().collection('deleted_teachers').doc(docId).get();
      if (!deletedDoc.exists) continue;

      const teacherData = deletedDoc.data();

      // Delete photo
      if (teacherData.photo) {
        try {
          await firebase.storage().refFromURL(teacherData.photo).delete();
        } catch (e) {
          console.warn('Photo delete failed:', e.message);
        }
      }

      // Delete document
      await deletedDoc.ref.delete();
      results.push({ docId, success: true });
    } catch (error) {
      results.push({ docId, success: false, error: error.message });
    }
  }

  // Audit log
  const successCount = results.filter(r => r.success).length;
  await firebase.firestore().collection('deletion_logs').add({
    type: 'bulk_permanent_delete',
    collectionName: 'deleted_teachers',
    documentPath: 'bulk_permanent_delete',
    documentId: 'bulk_' + Date.now(),
    originalData: { count: docIds.length, success: successCount },
    actionBy: user.email,
    actionAt: Date.now(),
    actionRole: 'admin',
    reason: `Bulk permanent delete ${successCount}/${docIds.length} teachers`
  });

  return results;
};

/**
 * Pagination - Students Next Page
 */
window.deletedStudentsNextPage = async function() {
  if (!window.deletedStudentsPagination.hasNextPage) return;
  
  window.deletedStudentsPagination.currentPage++;
  await window.loadDeletedStudents();
};

/**
 * Pagination - Students Previous Page
 */
window.deletedStudentsPrevPage = async function() {
  if (!window.deletedStudentsPagination.hasPrevPage) return;
  
  window.deletedStudentsPagination.currentPage--;
  window.deletedStudentsPagination.lastVisibleDoc = null;
  await window.loadDeletedStudents();
};

/**
 * Pagination - Teachers Next Page
 */
window.deletedTeachersNextPage = async function() {
  if (!window.deletedTeachersPagination.hasNextPage) return;
  
  window.deletedTeachersPagination.currentPage++;
  await window.loadDeletedTeachers();
};

/**
 * Pagination - Teachers Previous Page
 */
window.deletedTeachersPrevPage = async function() {
  if (!window.deletedTeachersPagination.hasPrevPage) return;
  
  window.deletedTeachersPagination.currentPage--;
  window.deletedTeachersPagination.lastVisibleDoc = null;
  await window.loadDeletedTeachers();
};

/**
 * Update pagination UI for students
 */
window.updateDeletedStudentsPaginationUI = function() {
  const pagination = window.deletedStudentsPagination;
  const pageInfo = document.getElementById('deletedStudentsPageInfo');
  const prevBtn = document.getElementById('deletedStudentsPrevBtn');
  const nextBtn = document.getElementById('deletedStudentsNextBtn');

  if (pageInfo) {
    pageInfo.textContent = `Page ${pagination.currentPage}`;
  }
  if (prevBtn) {
    prevBtn.disabled = !pagination.hasPrevPage;
  }
  if (nextBtn) {
    nextBtn.disabled = !pagination.hasNextPage;
  }
};

/**
 * Update pagination UI for teachers
 */
window.updateDeletedTeachersPaginationUI = function() {
  const pagination = window.deletedTeachersPagination;
  const pageInfo = document.getElementById('deletedTeachersPageInfo');
  const prevBtn = document.getElementById('deletedTeachersPrevBtn');
  const nextBtn = document.getElementById('deletedTeachersNextBtn');

  if (pageInfo) {
    pageInfo.textContent = `Page ${pagination.currentPage}`;
  }
  if (prevBtn) {
    prevBtn.disabled = !pagination.hasPrevPage;
  }
  if (nextBtn) {
    nextBtn.disabled = !pagination.hasNextPage;
  }
};

/**
 * Clear deleted student filters
 */
window.clearDeletedStudentFilters = function() {
  const schoolFilter = document.getElementById('studentSchoolFilter');
  const classFilter = document.getElementById('studentClassFilter');
  const sectionFilter = document.getElementById('studentSectionFilter');
  const searchName = document.getElementById('studentSearchName');
  const searchId = document.getElementById('studentSearchId');
  
  if (schoolFilter) schoolFilter.value = '';
  if (classFilter) classFilter.value = '';
  if (sectionFilter) sectionFilter.value = '';
  if (searchName) searchName.value = '';
  if (searchId) searchId.value = '';
  
  window.deletedStudentsPagination.currentPage = 1;
  window.deletedStudentsPagination.lastVisibleDoc = null;
  window.loadDeletedStudents();
};

/**
 * Clear deleted teacher filters
 */
window.clearDeletedTeacherFilters = function() {
  document.getElementById('teacherSchoolFilter').value = '';
  document.getElementById('teacherSearchName').value = '';
  document.getElementById('teacherSearchId').value = '';
  window.deletedTeachersPagination.currentPage = 1;
  window.deletedTeachersPagination.lastVisibleDoc = null;
  window.loadDeletedTeachers();
};

/**
 * On deleted student school change - populate class filter only
 */
window.onDeletedStudentSchoolChange = async function() {
  const schoolId = document.getElementById('studentSchoolFilter').value;
  const classFilter = document.getElementById('studentClassFilter');
  const sectionFilter = document.getElementById('studentSectionFilter');

  // Clear class and section filters
  classFilter.innerHTML = '<option value="">All Classes</option>';
  sectionFilter.innerHTML = '<option value="">All Sections</option>';

  if (!schoolId) {
    window.loadDeletedStudents();
    return;
  }

  try {
    // Query deleted students for this school to get available classes
    const snapshot = await firebase.firestore()
      .collection('deleted_students')
      .where('schoolId', '==', schoolId)
      .get();

    const students = snapshot.docs.map(d => d.data());
    
    // Populate class dropdown only
    const classes = [...new Set(students.map(s => s.originalClass).filter(Boolean))].sort();
    const classOrder = ['Nursery','LKG','UKG','KG','1','2','3','4','5','6','7','8','9','10','11','12'];
    classOrder.forEach(cls => {
      if (classes.includes(cls)) {
        const option = document.createElement('option');
        option.value = cls;
        option.textContent = cls === 'Nursery' ? 'Nursery' : cls === 'LKG' ? 'LKG' : cls === 'UKG' ? 'UKG' : cls === 'KG' ? 'KG' : 'Class ' + cls;
        classFilter.appendChild(option);
      }
    });

    window.loadDeletedStudents();
  } catch (error) {
    console.error('Error loading filters:', error);
    window.loadDeletedStudents();
  }
};

/**
 * On deleted student class change - populate section filter
 */
window.onDeletedStudentClassChange = async function() {
  const schoolId = document.getElementById('studentSchoolFilter').value;
  const classValue = document.getElementById('studentClassFilter').value;
  const sectionFilter = document.getElementById('studentSectionFilter');

  // Clear section filter
  sectionFilter.innerHTML = '<option value="">All Sections</option>';

  if (!schoolId || !classValue) {
    window.loadDeletedStudents();
    return;
  }

  try {
    // Query deleted students for this school and class to get available sections
    const snapshot = await firebase.firestore()
      .collection('deleted_students')
      .where('schoolId', '==', schoolId)
      .where('originalClass', '==', classValue)
      .get();

    const students = snapshot.docs.map(d => d.data());
    
    // Populate section dropdown
    const sections = [...new Set(students.map(s => s.section).filter(Boolean))].sort();
    sections.forEach(sec => {
      const option = document.createElement('option');
      option.value = sec;
      option.textContent = sec;
      sectionFilter.appendChild(option);
    });

    window.loadDeletedStudents();
  } catch (error) {
    console.error('Error loading sections:', error);
    window.loadDeletedStudents();
  }
};

/**
 * On deleted teacher school change
 */
window.onDeletedTeacherSchoolChange = function() {
  window.deletedTeachersPagination.currentPage = 1;
  window.deletedTeachersPagination.lastVisibleDoc = null;
  window.loadDeletedTeachers();
};

/**
 * Toggle select all for deleted students
 */
window.toggleDeletedStudentSelectAll = function() {
  const selectAll = document.getElementById('studentSelectAllChk');
  const checkboxes = document.querySelectorAll('.deleted-student-checkbox');
  checkboxes.forEach(cb => {
    cb.checked = selectAll.checked;
  });
};

/**
 * Toggle select all for deleted teachers
 */
window.toggleDeletedTeacherSelectAll = function() {
  const selectAll = document.getElementById('teacherSelectAllChk');
  const checkboxes = document.querySelectorAll('.deleted-teacher-checkbox');
  checkboxes.forEach(cb => {
    cb.checked = selectAll.checked;
  });
};

/**
 * Switch between tabs
 */
window.switchDeletedTab = function(tab) {
  // Update tab buttons
  document.getElementById('tabStudents').classList.toggle('active', tab === 'students');
  document.getElementById('tabTeachers').classList.toggle('active', tab === 'teachers');
  document.getElementById('tabSchools').classList.toggle('active', tab === 'schools');

  // Update tab content
  document.getElementById('studentsTab').classList.toggle('active', tab === 'students');
  document.getElementById('teachersTab').classList.toggle('active', tab === 'teachers');
  document.getElementById('schoolsTab').classList.toggle('active', tab === 'schools');

  // Load data for selected tab
  if (tab === 'students') {
    window.deletedStudentsPagination.currentPage = 1;
    window.deletedStudentsPagination.lastVisibleDoc = null;
    window.loadDeletedStudents();
  } else if (tab === 'teachers') {
    window.deletedTeachersPagination.currentPage = 1;
    window.deletedTeachersPagination.lastVisibleDoc = null;
    window.loadDeletedTeachers();
  } else if (tab === 'schools') {
    window.loadDeletedSchools();
  }
};

/**
 * Initialize deleted cards page
 */
window.initDeletedCardsPage = function() {
  window.initAuth(async (user, role) => {
    if (!user) {
      window.location.href = 'index.html';
      return;
    }

    if (role !== 'admin') {
      window.location.href = 'dashboard.html';
      return;
    }

    // Populate school dropdowns from schools collection
    await window.populateSchoolDropdown('studentSchoolFilter');
    await window.populateSchoolDropdown('teacherSchoolFilter');

    // Load initial data
    await window.loadDeletedStudents();
  });
};