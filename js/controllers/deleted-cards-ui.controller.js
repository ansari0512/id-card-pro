/**
 * Deleted Cards UI Controller
 * Handles UI rendering for deleted students, teachers, and schools
 */

/**
 * Render deleted students
 */
window.renderDeletedStudents = function(students) {
  const grid = document.getElementById('deletedStudentsGrid');
  grid.innerHTML = '';

  students.forEach(student => {
    const card = document.createElement('div');
    card.className = 'student-card';
    
    // Use actual Firestore document ID
    const docId = student.docId || student.id;
    
    card.innerHTML = `
      <div class="student-id-header">
        <div class="student-id-text">ID: ${student.id || 'N/A'}</div>
        <input type="checkbox" class="header-checkbox deleted-student-checkbox" data-docid="${docId}" id="deleted-student-${docId}">
      </div>
      <div class="student-content">
        <img class="student-photo" src="${student.photo || 'assets/placeholder.png'}" alt="${student.name || 'Student'}" onerror="this.src='assets/placeholder.png'" loading="lazy">
        <h3 class="student-name">${student.name || 'Unknown'}</h3>
        <div class="student-class">${student.class || '-'} - ${student.section || '-'}</div>
        <div class="student-info-grid">
          <div class="info-row">
            <span class="info-label">Father:</span>
            <span class="info-value">${student.father || '-'}</span>
          </div>
          <div class="info-row">
            <span class="info-label">School:</span>
            <span class="info-value">${student.schoolName || 'Unknown School'}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Deleted By:</span>
            <span class="info-value">${student.deletedBy || '-'}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Deleted Date:</span>
            <span class="info-value">${student.deletedAt ? new Date(student.deletedAt).toLocaleDateString('en-IN') : '-'}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Reason:</span>
            <span class="info-value">${student.deleteReason || '-'}</span>
          </div>
        </div>
        <div class="student-actions">
          <button class="btn-edit" onclick="window.restoreSingleStudent('${docId}')" title="Restore">🔄 Restore</button>
          <button class="btn-delete" onclick="window.permanentDeleteSingleStudent('${docId}')" title="Permanent Delete">🗑️ Permanent Delete</button>
        </div>
      </div>
    `;
    grid.appendChild(card);
  });
};

/**
 * Render deleted teachers
 */
window.renderDeletedTeachers = function(teachers) {
  const grid = document.getElementById('deletedTeachersGrid');
  grid.innerHTML = '';

  teachers.forEach(teacher => {
    const card = document.createElement('div');
    card.className = 'student-card';
    
    // Use actual Firestore document ID
    const docId = teacher.docId || teacher.id;
    
    card.innerHTML = `
      <div class="student-id-header">
        <div class="student-id-text">ID: ${teacher.id || 'N/A'}</div>
        <input type="checkbox" class="header-checkbox deleted-teacher-checkbox" data-docid="${docId}" id="deleted-teacher-${docId}">
      </div>
      <div class="student-content">
        <img class="student-photo" src="${teacher.photo || 'assets/placeholder.png'}" alt="${teacher.name || 'Teacher'}" onerror="this.src='assets/placeholder.png'" loading="lazy">
        <h3 class="student-name">${teacher.name || 'Unknown'}</h3>
        <div class="student-class">${teacher.designation || '-'}</div>
        <div class="student-info-grid">
          <div class="info-row">
            <span class="info-label">School:</span>
            <span class="info-value">${teacher.schoolName || 'Unknown School'}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Deleted By:</span>
            <span class="info-value">${teacher.deletedBy || '-'}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Deleted Date:</span>
            <span class="info-value">${teacher.deletedAt ? new Date(teacher.deletedAt).toLocaleDateString('en-IN') : '-'}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Reason:</span>
            <span class="info-value">${teacher.deleteReason || '-'}</span>
          </div>
        </div>
        <div class="student-actions">
          <button class="btn-edit" onclick="window.restoreSingleTeacher('${teacher.docId}')" title="Restore">🔄 Restore</button>
          <button class="btn-delete" onclick="window.permanentDeleteSingleTeacher('${teacher.docId}')" title="Permanent Delete">🗑️ Permanent Delete</button>
        </div>
      </div>
    `;
    grid.appendChild(card);
  });
};

/**
 * Render deleted schools
 */
window.renderDeletedSchools = function(schools) {
  const grid = document.getElementById('deletedSchoolsGrid');
  grid.innerHTML = '';

  schools.forEach(school => {
    const card = document.createElement('div');
    card.className = 'student-card';
    card.innerHTML = `
      <div class="student-id-header">
        <div class="student-id-text">ID: ${school.schoolId || school.docId || 'N/A'}</div>
      </div>
      <div class="student-content">
        <div class="student-photo-wrapper" style="background: #f0f0f0; display: flex; align-items: center; justify-content: center; height: 120px; border-radius: 8px; margin-bottom: 1rem;">
          <span style="font-size: 3rem;">🏫</span>
        </div>
        <h3 class="student-name">${school.schoolName || 'Unknown School'}</h3>
        <div class="student-class">${school.city || '-'}</div>
        <div class="student-info-grid">
          <div class="info-row">
            <span class="info-label">Email:</span>
            <span class="info-value">${school.email || '-'}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Deleted By:</span>
            <span class="info-value">${school.deletedBy || '-'}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Deleted Date:</span>
            <span class="info-value">${school.deletedAt ? new Date(school.deletedAt).toLocaleDateString('en-IN') : '-'}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Reason:</span>
            <span class="info-value">${school.deleteReason || '-'}</span>
          </div>
        </div>
        <div class="student-actions">
          <button class="btn-edit" onclick="window.restoreSingleSchool('${school.docId}')" title="Restore">🔄 Restore</button>
          <button class="btn-delete" onclick="window.permanentDeleteSingleSchool('${school.docId}')" title="Permanent Delete">🗑️ Permanent Delete</button>
        </div>
      </div>
    `;
    grid.appendChild(card);
  });
};

/**
 * Restore single student with confirmation
 */
window.restoreSingleStudent = async function(docId, btnElement) {
  if (!confirm('Are you sure you want to restore this student?')) return;

  const btn = btnElement || document.querySelector(`button[onclick*="restoreSingleStudent('${docId}')"]`);
  if (!btn) return;
  
  btn.disabled = true;
  const originalText = btn.textContent;
  btn.textContent = '⏳ Restoring...';

  try {
    await window.restoreStudent(docId);
    window.showToast('✅ Student restored successfully', 'success');
    window.loadDeletedStudents();
  } catch (error) {
    window.showToast('❌ Restore failed: ' + error.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = originalText;
  }
};

/**
 * Restore single teacher with confirmation
 */
window.restoreSingleTeacher = async function(docId, btnElement) {
  if (!confirm('Are you sure you want to restore this teacher?')) return;

  const btn = btnElement || document.querySelector(`button[onclick*="restoreSingleTeacher('${docId}')"]`);
  if (!btn) return;
  
  btn.disabled = true;
  const originalText = btn.textContent;
  btn.textContent = '⏳ Restoring...';

  try {
    await window.restoreTeacher(docId);
    window.showToast('✅ Teacher restored successfully', 'success');
    window.loadDeletedTeachers();
  } catch (error) {
    window.showToast('❌ Restore failed: ' + error.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = originalText;
  }
};

/**
 * Restore single school with confirmation
 */
window.restoreSingleSchool = async function(docId, btnElement) {
  if (!confirm('Are you sure you want to restore this school? This will also restore all associated students and teachers.')) return;

  const btn = btnElement || document.querySelector(`button[onclick*="restoreSingleSchool('${docId}')"]`);
  if (!btn) return;
  
  btn.disabled = true;
  const originalText = btn.textContent;
  btn.textContent = '⏳ Restoring...';

  try {
    await window.restoreSchool(docId);
    window.showToast('✅ School restored successfully', 'success');
    window.loadDeletedSchools();
  } catch (error) {
    window.showToast('❌ Restore failed: ' + error.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = originalText;
  }
};

/**
 * Permanent delete single student with confirmation
 */
window.permanentDeleteSingleStudent = async function(docId, btnElement) {
  const reason = prompt('Please type DELETE to confirm permanent deletion:');
  if (reason !== 'DELETE') {
    if (reason !== null) {
      window.showToast('❌ Type DELETE to confirm', 'error');
    }
    return;
  }

  const btn = btnElement || document.querySelector(`button[onclick*="permanentDeleteSingleStudent('${docId}')"]`);
  if (!btn) return;
  
  btn.disabled = true;
  const originalText = btn.textContent;
  btn.textContent = '⏳ Deleting...';

  try {
    await window.permanentDeleteStudent(docId);
    window.showToast('✅ Student permanently deleted', 'success');
    window.loadDeletedStudents();
  } catch (error) {
    window.showToast('❌ Delete failed: ' + error.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = originalText;
  }
};

/**
 * Permanent delete single teacher with confirmation
 */
window.permanentDeleteSingleTeacher = async function(docId, btnElement) {
  const reason = prompt('Please type DELETE to confirm permanent deletion:');
  if (reason !== 'DELETE') {
    if (reason !== null) {
      window.showToast('❌ Type DELETE to confirm', 'error');
    }
    return;
  }

  const btn = btnElement || document.querySelector(`button[onclick*="permanentDeleteSingleTeacher('${docId}')"]`);
  if (!btn) return;
  
  btn.disabled = true;
  const originalText = btn.textContent;
  btn.textContent = '⏳ Deleting...';

  try {
    await window.permanentDeleteTeacher(docId);
    window.showToast('✅ Teacher permanently deleted', 'success');
    window.loadDeletedTeachers();
  } catch (error) {
    window.showToast('❌ Delete failed: ' + error.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = originalText;
  }
};

/**
 * Permanent delete single school with confirmation
 */
window.permanentDeleteSingleSchool = async function(docId, btnElement) {
  const reason = prompt('Please type DELETE to confirm permanent deletion of school and ALL associated records:');
  if (reason !== 'DELETE') {
    if (reason !== null) {
      window.showToast('❌ Type DELETE to confirm', 'error');
    }
    return;
  }

  const btn = btnElement || document.querySelector(`button[onclick*="permanentDeleteSingleSchool('${docId}')"]`);
  if (!btn) return;
  
  btn.disabled = true;
  const originalText = btn.textContent;
  btn.textContent = '⏳ Deleting...';

  try {
    await window.permanentDeleteSchool(docId);
    window.showToast('✅ School permanently deleted', 'success');
    window.loadDeletedSchools();
  } catch (error) {
    window.showToast('❌ Delete failed: ' + error.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = originalText;
  }
};

/**
 * Bulk restore selected students
 */
window.bulkRestoreSelectedStudents = async function() {
  const selected = Array.from(document.querySelectorAll('.deleted-student-checkbox:checked'))
    .map(cb => cb.dataset.docid);

  if (selected.length === 0) {
    window.showToast('Please select at least one student', 'error');
    return;
  }

  if (!confirm(`Restore ${selected.length} selected students?`)) return;

  const btn = document.getElementById('restoreStudentBtn');
  btn.disabled = true;
  btn.textContent = '⏳ Restoring...';

  try {
    const results = await window.bulkRestoreStudents(selected);
    const successCount = results.filter(r => r.success).length;
    const failCount = selected.length - successCount;

    if (failCount > 0) {
      window.showToast(`⚠️ Restored ${successCount} students. ${failCount} failed.`, 'error');
    } else {
      window.showToast(`✅ Successfully restored ${successCount} students`, 'success');
    }

    window.loadDeletedStudents();
  } catch (error) {
    window.showToast('❌ Bulk restore failed: ' + error.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = '🔄 Restore Selected';
  }
};

/**
 * Bulk permanent delete selected students
 */
window.bulkPermanentDeleteSelectedStudents = async function() {
  const selected = Array.from(document.querySelectorAll('.deleted-student-checkbox:checked'))
    .map(cb => cb.dataset.docid);

  if (selected.length === 0) {
    window.showToast('Please select at least one student', 'error');
    return;
  }

  const reason = prompt(`Type DELETE to permanently delete ${selected.length} students:`);
  if (reason !== 'DELETE') {
    if (reason !== null) {
      window.showToast('❌ Type DELETE to confirm', 'error');
    }
    return;
  }

  const btn = document.getElementById('permanentDeleteStudentBtn');
  btn.disabled = true;
  btn.textContent = '⏳ Deleting...';

  try {
    const results = await window.bulkPermanentDeleteStudents(selected);
    const successCount = results.filter(r => r.success).length;
    const failCount = selected.length - successCount;

    if (failCount > 0) {
      window.showToast(`⚠️ Deleted ${successCount} students. ${failCount} failed.`, 'error');
    } else {
      window.showToast(`✅ Successfully deleted ${successCount} students`, 'success');
    }

    window.loadDeletedStudents();
  } catch (error) {
    window.showToast('❌ Bulk delete failed: ' + error.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = '🗑️ Permanent Delete';
  }
};

/**
 * Bulk restore selected teachers
 */
window.bulkRestoreSelectedTeachers = async function() {
  const selected = Array.from(document.querySelectorAll('.deleted-teacher-checkbox:checked'))
    .map(cb => cb.dataset.docid);

  if (selected.length === 0) {
    window.showToast('Please select at least one teacher', 'error');
    return;
  }

  if (!confirm(`Restore ${selected.length} selected teachers?`)) return;

  const btn = document.getElementById('restoreTeacherBtn');
  btn.disabled = true;
  btn.textContent = '⏳ Restoring...';

  try {
    const results = await window.bulkRestoreTeachers(selected);
    const successCount = results.filter(r => r.success).length;
    const failCount = selected.length - successCount;

    if (failCount > 0) {
      window.showToast(`⚠️ Restored ${successCount} teachers. ${failCount} failed.`, 'error');
    } else {
      window.showToast(`✅ Successfully restored ${successCount} teachers`, 'success');
    }

    window.loadDeletedTeachers();
  } catch (error) {
    window.showToast('❌ Bulk restore failed: ' + error.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = '🔄 Restore Selected';
  }
};

/**
 * Bulk permanent delete selected teachers
 */
window.bulkPermanentDeleteSelectedTeachers = async function() {
  const selected = Array.from(document.querySelectorAll('.deleted-teacher-checkbox:checked'))
    .map(cb => cb.dataset.docid);

  if (selected.length === 0) {
    window.showToast('Please select at least one teacher', 'error');
    return;
  }

  const reason = prompt(`Type DELETE to permanently delete ${selected.length} teachers:`);
  if (reason !== 'DELETE') {
    if (reason !== null) {
      window.showToast('❌ Type DELETE to confirm', 'error');
    }
    return;
  }

  const btn = document.getElementById('permanentDeleteTeacherBtn');
  btn.disabled = true;
  btn.textContent = '⏳ Deleting...';

  try {
    const results = await window.bulkPermanentDeleteTeachers(selected);
    const successCount = results.filter(r => r.success).length;
    const failCount = selected.length - successCount;

    if (failCount > 0) {
      window.showToast(`⚠️ Deleted ${successCount} teachers. ${failCount} failed.`, 'error');
    } else {
      window.showToast(`✅ Successfully deleted ${successCount} teachers`, 'success');
    }

    window.loadDeletedTeachers();
  } catch (error) {
    window.showToast('❌ Bulk delete failed: ' + error.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = '🗑️ Permanent Delete';
  }
};