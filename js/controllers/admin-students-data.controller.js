/**
 * Admin Students Controller
 * Handles admin view of school students (admin-students.html)
 * Supports: single school view (schoolId param) + View All mode (mode=all)
 * New: teacher/staff mode via dataTypeFilter dropdown
 */

window.adminSchoolId = null;
window.adminAllStudents = [];
window.adminAllTeachers = [];
window.adminMode = 'single'; // 'single' or 'all'
window.adminDataType = 'students'; // 'students' or 'teachers'
window.adminSchoolsList = []; // All schools used in View All mode
window.adminAllClassStudents = []; // Single school mode mein sabhi students (bina class filter ke)
window.adminAllStudentsFullSchoolCache = []; // View All mode mein selected school ka full dataset (no class/section filters)

/**
 * Initialize admin students page
 */
window.initAdminStudents = function() {
  const params = new URLSearchParams(window.location.search);
  window.adminSchoolId = params.get('schoolId');
  window.adminMode = params.get('mode') === 'all' ? 'all' : 'single';

  window.initAuth(async (user, role) => {
    if (!user) { window.location.href = 'index.html'; return; }
    if (role !== 'admin') { window.location.href = 'dashboard.html'; return; }

    if (window.adminMode === 'all') {
      document.getElementById('pageTitle').textContent = 'All Students';
      document.getElementById('schoolFilter').style.display = 'block';
      await window.loadSchoolsDropdown();
      window.loadAdminStudents();
    } else {
      if (!window.adminSchoolId) {
        document.getElementById('loading').innerHTML = '<p style="color:red;">School ID missing. Please go back and try again.</p>';
        return;
      }
      const schoolName = params.get('schoolName') || 'School';
      document.getElementById('pageTitle').textContent = decodeURIComponent(schoolName) + ' — Students';
      // Load dropdown and pre-select current school
      await window.loadSchoolsDropdown();
      var filterEl = document.getElementById('schoolFilter');
      if (filterEl) {
        filterEl.value = window.adminSchoolId;
        // If the school was not found in the dropdown, add it manually
        if (!filterEl.value) {
          var opt = document.createElement('option');
          opt.value = window.adminSchoolId;
          opt.textContent = decodeURIComponent(schoolName);
          filterEl.insertBefore(opt, filterEl.firstChild);
          filterEl.value = window.adminSchoolId;
        }
      }
      window.loadAdminStudents();
    }
  });
};

/**
 * Populate the schools dropdown for View All mode.
 */
window.loadSchoolsDropdown = async function() {
  try {
    const snap = await firebase.firestore().collection('schools').orderBy('schoolName').get();
    window.adminSchoolsList = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    const select = document.getElementById('schoolFilter');
    select.innerHTML = '<option value="">All Schools</option>';
    window.adminSchoolsList.forEach(school => {
      const opt = document.createElement('option');
      opt.value = school.id;
      opt.textContent = school.schoolName || school.email;
      select.appendChild(opt);
    });
  } catch(e) {
    console.warn('Schools dropdown load failed:', e.message);
  }
};

/**
 * Handle data type switch (Students vs Teachers/Staff)
 */
window.onDataTypeChange = function() {
  window.adminDataType = document.getElementById('dataTypeFilter').value;
  const classFilter = document.getElementById('classFilter');
  const sectionFilter = document.getElementById('sectionFilter');
  if (window.adminDataType === 'teachers') {
    if (classFilter) { classFilter.style.display = 'none'; classFilter.value = ''; }
    if (sectionFilter) { sectionFilter.style.display = 'none'; sectionFilter.value = ''; }
  } else {
    if (classFilter) classFilter.style.display = '';
    if (sectionFilter) sectionFilter.style.display = '';
  }
  window.selectedStudentIds.clear();
  window.loadAdminStudents();
};

/**
 * Load students or teachers based on data type
 */
window.loadAdminStudents = async function() {
  if (window.adminDataType === 'teachers') {
    await window.loadAdminTeachers();
    return;
  }

  document.getElementById('loading').style.display = 'block';
  document.getElementById('studentsGrid').style.display = 'none';
  document.getElementById('emptyState').style.display = 'none';

  try {
    const classFilter = document.getElementById('classFilter').value;
    const sectionFilter = document.getElementById('sectionFilter') ? document.getElementById('sectionFilter').value : '';
    const filters = classFilter || sectionFilter ? { ...(classFilter ? { class: classFilter } : {}), ...(sectionFilter ? { section: sectionFilter } : {}) } : {};

    let students = [];

    if (window.adminMode === 'all') {
      const selectedSchool = document.getElementById('schoolFilter').value;

      if (selectedSchool) {
        // Filtered dataset (class/section)
        students = await window.dbGetAllStudents(selectedSchool, filters);

        // Full dataset cache (no class/section filters) -> used by UI dropdowns in View All mode
        window.adminAllStudentsFullSchoolCache = await window.dbGetAllStudents(selectedSchool, {});

        const school = window.adminSchoolsList.find(s => s.id === selectedSchool);
        if (school) {
          document.getElementById('pageTitle').textContent = '🏫 School: ' + (school.schoolName || 'School') + ' — Students';
          window.adminSchoolId = selectedSchool;
        }
      } else {
        document.getElementById('pageTitle').textContent = 'All Students';
        window.adminSchoolId = null;
        const schoolsToLoad = window.adminSchoolsList.length > 0
          ? window.adminSchoolsList
          : (await firebase.firestore().collection('schools').get()).docs.map(d => ({ id: d.id, ...d.data() }));

        const allResults = await Promise.all(
          schoolsToLoad.map(async school => {
            try {
              const s = await window.dbGetAllStudents(school.id, filters);
              return s.map(st => ({ ...st, _schoolName: school.schoolName || school.email, _schoolId: school.id }));
            } catch(e) { return []; }
          })
        );
        students = allResults.flat();
      }
    } else {
      // Single school mode
      if (window.adminAllClassStudents.length === 0) {
        window.adminAllClassStudents = await window.dbGetAllStudents(window.adminSchoolId);
      }
      students = window.adminAllClassStudents;
      if (classFilter) {
        students = students.filter(s => s.class === classFilter);
      }
      if (sectionFilter) {
        students = students.filter(s => s.section === sectionFilter);
      }
      window.adminAllStudents = students;
      document.getElementById('loading').style.display = 'none';

      const countEl = document.getElementById('studentCount');
      if (countEl) {
        countEl.textContent = '\uD83D\uDC65 ' + students.length + ' Students';
        countEl.style.display = 'flex';
      }
      window.updateClassAndSectionFilters(window.adminAllClassStudents, classFilter, document.getElementById('sectionFilter') ? document.getElementById('sectionFilter').value : '');

      if (students.length === 0) {
        document.getElementById('emptyState').style.display = 'block';
        return;
      }
      window.renderAdminStudents(students);
      document.getElementById('studentsGrid').classList.remove('hidden');
      document.getElementById('studentsGrid').style.display = 'grid';
      return;
    }

    window.adminAllStudents = students;
    document.getElementById('loading').style.display = 'none';

    const countEl = document.getElementById('studentCount');
    if (countEl) {
      countEl.textContent = '\uD83D\uDC65 ' + students.length + ' Students';
      countEl.style.display = 'flex';
    }
    window.updateClassFilter(students, classFilter);

    if (students.length === 0) {
      document.getElementById('emptyState').style.display = 'block';
      return;
    }
    window.renderAdminStudents(students);
    document.getElementById('studentsGrid').classList.remove('hidden');
    document.getElementById('studentsGrid').style.display = 'grid';
  } catch (err) {
    document.getElementById('loading').innerHTML =
      '<p style="color:red;">Failed to load: ' + err.message + '</p>';
  }
};

/**
 * Load all teachers from all schools (or filtered by school)
 */
window.loadAdminTeachers = async function() {
  document.getElementById('loading').style.display = 'block';
  document.getElementById('studentsGrid').style.display = 'none';
  document.getElementById('emptyState').style.display = 'none';

  try {
    const selectedSchool = document.getElementById('schoolFilter').value;
    let teachers = [];

    if (selectedSchool) {
      teachers = await window.dbGetAllTeacherStaff(selectedSchool, {});
      const school = window.adminSchoolsList.find(s => s.id === selectedSchool);
      if (school) {
        document.getElementById('pageTitle').textContent = '🏫 School: ' + (school.schoolName || 'School') + ' — Teachers';
        window.adminSchoolId = selectedSchool;
      }
      teachers = teachers.map(t => ({ ...t, _schoolName: (school ? school.schoolName : school.email) || '', _schoolId: selectedSchool }));
    } else {
      document.getElementById('pageTitle').textContent = 'All Teachers / Staff';
      window.adminSchoolId = null;
      const schoolsToLoad = window.adminSchoolsList.length > 0
        ? window.adminSchoolsList
        : (await firebase.firestore().collection('schools').get()).docs.map(d => ({ id: d.id, ...d.data() }));

      const allResults = await Promise.all(
        schoolsToLoad.map(async school => {
          try {
            const t = await window.dbGetAllTeacherStaff(school.id, {});
            return t.map(tc => ({ ...tc, _schoolName: school.schoolName || school.email || '', _schoolId: school.id }));
          } catch(e) { return []; }
        })
      );
      teachers = allResults.flat();
    }

    window.adminAllTeachers = teachers;
    // Also set adminAllStudents to empty so selection/bulk actions don't use stale student data
    window.adminAllStudents = [];
    document.getElementById('loading').style.display = 'none';

    const countEl = document.getElementById('studentCount');
    if (countEl) {
      countEl.textContent = '\uD83E\uDDD1\u200D\uD83C\uDFEB ' + teachers.length + ' Teachers';
      countEl.style.display = 'flex';
    }

    if (teachers.length === 0) {
      document.getElementById('emptyState').style.display = 'block';
      const emptyH3 = document.querySelector('#emptyState h3');
      const emptyP = document.querySelector('#emptyState p');
      if (emptyH3) emptyH3.textContent = 'No Teachers Found';
      if (emptyP) emptyP.textContent = 'No teacher/staff records found.';
      return;
    }

    window.renderAdminTeachers(teachers);
    document.getElementById('studentsGrid').classList.remove('hidden');
    document.getElementById('studentsGrid').style.display = 'grid';
  } catch (err) {
    document.getElementById('loading').innerHTML =
      '<p style="color:red;">Failed to load: ' + err.message + '</p>';
  }
};

/**
 * Export CSV / Excel workbook
 */
window.adminExportStudentTeacherWorkbook = async function() {
  window.showToast('Preparing workbook... please wait', 'info');

  try {
    // If in teacher mode with selection, only export selected teachers
    if (window.adminDataType === 'teachers') {
      if (window.selectedStudentIds && window.selectedStudentIds.size > 0) {
        const selectedTeachers = window.adminAllTeachers.filter(t => window.selectedStudentIds.has(t.id));
        if (selectedTeachers.length > 0) {
          await window.adminExportSelectedRecords(selectedTeachers, 'teacher');
          return;
        }
      }
    }
    // If in student mode with selection, only export selected students
    if (window.selectedStudentIds && window.selectedStudentIds.size > 0) {
      const selectedStudents = window.adminAllStudents.filter(s => window.selectedStudentIds.has(s.id));
      if (selectedStudents.length > 0) {
        await window.adminExportSelectedStudents(selectedStudents);
        return;
      }
    }

    // Full export
    if (!window.XLSX) {
      await new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
        s.onload = resolve;
        s.onerror = () => reject(new Error('Failed to load XLSX library'));
        document.head.appendChild(s);
      });
    }

    const selectedSchool = document.getElementById('schoolFilter').value;
    const selectedClass = document.getElementById('classFilter').value;
    const selectedSection = document.getElementById('sectionFilter') ? document.getElementById('sectionFilter').value : '';
    const schoolsSnap = await firebase.firestore().collection('schools').get();
    let schools = schoolsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    if (!schools.length) {
      window.showToast('No schools found', 'error');
      return;
    }
    if (selectedSchool) {
      schools = schools.filter(s => s.id === selectedSchool);
    }

    const allStudents = [];
    const allTeachers = [];

    for (const school of schools) {
      try {
        const students = await window.dbGetAllStudents(
          school.id,
          (selectedClass || selectedSection) ? { ...(selectedClass ? { class: selectedClass } : {}), ...(selectedSection ? { section: selectedSection } : {}) } : {}
        );
        students.forEach(s => allStudents.push({ ...s, _schoolName: school.schoolName || school.email || '' }));
      } catch (e) {}
      try {
        const teachers = await window.dbGetAllTeacherStaff(school.id, {});
        teachers.forEach(t => allTeachers.push({ ...t, _schoolName: school.schoolName || school.email || '' }));
      } catch (e) {}
    }

    const studentHeaders = [
      'Student ID','Name','Father Name','Mother Name','Mobile','Address',
      'DOB','Class','Section',
      'Addition','Admission No','Roll No','Blood Group','Other Info',
      'School','Added On'
    ];
    const studentRows = allStudents.map(s => [
      s.id || '', s.name || '', s.father || '', s.motherName || '', s.mobile || '', s.address || '',
      s.dob || '', s.class || '', s.section || '',
      s.addition || '', s.admissionNo || '', s.rollNo || '', s.bloodGroup || '', s.otherInfo || '',
      s._schoolName || '',
      s.createdAt ? new Date(s.createdAt).toLocaleDateString('en-IN') : ''
    ]);

    const teacherHeaders = [
      'Teacher ID','Name','Designation','Father Name','DOB','Mobile','Address',
      'Blood Group','Husband Name','Teacher Code (teacherId)','Other Details',
      'School','Added On'
    ];
    const teacherRows = allTeachers.map(t => [
      t.id || '', t.name || '', t.designation || '', t.fatherName || '', t.dob || '', t.mobile || '', t.address || '',
      t.bloodGroup || '', t.husbandName || '', t.teacherId || '', t.otherDetails || '',
      t._schoolName || '',
      t.createdAt ? new Date(t.createdAt).toLocaleDateString('en-IN') : ''
    ]);

    const wb = window.XLSX.utils.book_new();
    const wsStudents = window.XLSX.utils.aoa_to_sheet([studentHeaders, ...studentRows]);
    window.XLSX.utils.book_append_sheet(wb, wsStudents, 'Students');
    const wsTeachers = window.XLSX.utils.aoa_to_sheet([teacherHeaders, ...teacherRows]);
    window.XLSX.utils.book_append_sheet(wb, wsTeachers, 'Teachers');

    const filename = 'rkchoice_export_students_teachers_' + new Date().toISOString().slice(0,10) + '.xlsx';
    window.XLSX.writeFile(wb, filename);
    window.showToast('Workbook exported successfully!', 'success');
  } catch (err) {
    window.showToast('Export failed: ' + err.message, 'error');
  }
};

/**
 * Export selected records (generic — works for both students and teachers)
 */
window.adminExportSelectedRecords = async function(records, type) {
  try {
    let headers, rows, filenamePrefix;
    if (type === 'teacher') {
      headers = ['Teacher ID','Name','Designation','Father Name','DOB','Mobile','Address','Blood Group','Husband Name','Teacher Code (teacherId)','Other Details','School','Added On'];
      rows = records.map(t => [
        t.id || '', t.name || '', t.designation || '', t.fatherName || '', t.dob || '', t.mobile || '', t.address || '',
        t.bloodGroup || '', t.husbandName || '', t.teacherId || '', t.otherDetails || '',
        t._schoolName || '',
        t.createdAt ? new Date(t.createdAt).toLocaleDateString('en-IN') : ''
      ]);
      filenamePrefix = 'selected_teachers';
    } else {
      headers = ['Student ID','Name','Father Name','Mother Name','Mobile','Address','DOB','Class','Section','Addition','Admission No','Roll No','Blood Group','Other Info','School','Added On'];
      rows = records.map(s => [
        s.id||'', s.name||'', s.father||'', s.motherName||'', s.mobile||'', s.address||'', s.dob||'', s.class||'',
        s.section||'', s.addition||'', s.admissionNo||'', s.rollNo||'', s.bloodGroup||'', s.otherInfo||'',
        s._schoolName || 'School',
        s.createdAt ? new Date(s.createdAt).toLocaleDateString('en-IN') : ''
      ]);
      filenamePrefix = 'selected_students';
    }
    window.csvDownload(headers, rows, filenamePrefix + '_' + new Date().toISOString().slice(0,10) + '.csv');
    window.showToast('Exported ' + records.length + ' records', 'success');
  } catch (err) {
    window.showToast('Export selected failed: ' + err.message, 'error');
  }
};

/**
 * Export only selected students (simplified CSV export)
 */
window.adminExportSelectedStudents = async function(selectedStudents) {
  await window.adminExportSelectedRecords(selectedStudents, 'student');
};

/**
 * Download ZIP (photos + CSV) — ALWAYS includes Students AND Teachers/Staff.
 * Reuses the same fresh Firebase load as the full Export function.
 * If selection exists, filters the fresh datasets.
 */
window.adminBulkDownload = async function() {
  var btn = document.querySelector('.btn-download');
  if (btn) { btn.disabled = true; btn.textContent = '\u23F3 Preparing ZIP...'; }
  try {
    window.showToast('Preparing ZIP... fetching data', 'info');

    // --- Same fresh load as Export, with the same school/class filters ---
    var selectedSchool = document.getElementById('schoolFilter').value;
    var selectedClass = document.getElementById('classFilter').value;
    var selectedSection = document.getElementById('sectionFilter') ? document.getElementById('sectionFilter').value : '';
    const schoolsSnap = await firebase.firestore().collection('schools').get();
    var schools = schoolsSnap.docs.map(function(d) { return { id: d.id, ...d.data() }; });
    if (!schools.length) {
      window.showToast('No schools found', 'error');
      return;
    }
    if (selectedSchool) {
      schools = schools.filter(function(s) { return s.id === selectedSchool; });
    }

    var allStudents = [];
    var allTeachers = [];

    for (var si = 0; si < schools.length; si++) {
      var school = schools[si];
      try {
        var lst = await window.dbGetAllStudents(
          school.id,
          (selectedClass || selectedSection) ? { ...(selectedClass ? { class: selectedClass } : {}), ...(selectedSection ? { section: selectedSection } : {}) } : {}
        );
        lst.forEach(function(s) { allStudents.push({ ...s, _schoolName: school.schoolName || school.email || '', _schoolId: school.id }); });
      } catch(e) {}
      try {
        var lt = await window.dbGetAllTeacherStaff(school.id, {});
        lt.forEach(function(t) { allTeachers.push({ ...t, _schoolName: school.schoolName || school.email || '', _schoolId: school.id }); });
      } catch(e) {}
    }

    // Apply selection filter if any
    if (window.selectedStudentIds && window.selectedStudentIds.size > 0) {
      allStudents = allStudents.filter(function(s) { return window.selectedStudentIds.has(s.id); });
      allTeachers = allTeachers.filter(function(t) { return window.selectedStudentIds.has(t.id); });
    }

    // --- Build ZIP ---
    var dateStr = new Date().toISOString().slice(0,10);
    var zip = new JSZip();
    var photosFolder = zip.folder('photos');

    // Student photos + CSV
    var studentPhotos = allStudents.filter(function(s) { return s.photo; });
    var totalPhotos = studentPhotos.length + allTeachers.filter(function(t) { return t.photo; }).length;
    var donePhotos = 0;

    for (var i = 0; i < studentPhotos.length; i++) {
      var s = studentPhotos[i];
      donePhotos++;
      if (btn) btn.textContent = '\u23F3 Downloading photos (' + donePhotos + ' / ' + totalPhotos + ')';
      try {
        var storageRef = firebase.storage().refFromURL(s.photo);
        var freshUrl = await storageRef.getDownloadURL();
        var blob = await new Promise((res, rej) => {
          var xhr = new XMLHttpRequest();
          xhr.responseType = 'blob';
          xhr.onload = function() { xhr.status === 200 ? res(xhr.response) : rej(new Error('HTTP ' + xhr.status)); };
          xhr.onerror = function() { rej(new Error('Network error')); };
          xhr.open('GET', freshUrl);
          xhr.send();
        });
        var ext = blob.type.includes('png') ? 'png' : 'jpg';
        var classFolder = photosFolder.folder('students').folder(s.class || 'Unknown');
        classFolder.file(s.id + '_' + (s.name||'student').replace(/\s+/g,'_') + '.' + ext, blob);
      } catch(e) { console.warn('Student photo failed:', s.id, e.message); }
    }

    // Teacher photos
    var teacherPhotos = allTeachers.filter(function(t) { return t.photo; });
    for (var j = 0; j < teacherPhotos.length; j++) {
      var t = teacherPhotos[j];
      donePhotos++;
      if (btn) btn.textContent = '\u23F3 Downloading photos (' + donePhotos + ' / ' + totalPhotos + ')';
      try {
        var tRef = firebase.storage().refFromURL(t.photo);
        var tUrl = await tRef.getDownloadURL();
        var tBlob = await new Promise((res, rej) => {
          var xhr = new XMLHttpRequest();
          xhr.responseType = 'blob';
          xhr.onload = function() { xhr.status === 200 ? res(xhr.response) : rej(new Error('HTTP ' + xhr.status)); };
          xhr.onerror = function() { rej(new Error('Network error')); };
          xhr.open('GET', tUrl);
          xhr.send();
        });
        var tExt = tBlob.type.includes('png') ? 'png' : 'jpg';
        var tFolder = photosFolder.folder('teachers_staff');
        tFolder.file(t.id + '_' + (t.name||'teacher').replace(/\s+/g,'_') + '.' + tExt, tBlob);
      } catch(e) { console.warn('Teacher photo failed:', t.id, e.message); }
    }

    // Workbook inside ZIP: one XLSX file with two sheets (Students + Teachers)
    if (!window.XLSX) {
      await new Promise(function(resolve, reject) {
        var script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
        script.onload = resolve;
        script.onerror = function() { reject(new Error('Failed to load XLSX library')); };
        document.head.appendChild(script);
      });
    }

    var studentHeaders = [
      'Student ID','Name','Father Name','Mother Name','Mobile','Address',
      'DOB','Class','Section',
      'Addition','Admission No','Roll No','Blood Group','Other Info',
      'School','Added On'
    ];
    var studentRows = allStudents.map(function(s) { return [
      s.id || '', s.name || '', s.father || '', s.motherName || '', s.mobile || '', s.address || '',
      s.dob || '', s.class || '', s.section || '',
      s.addition || '', s.admissionNo || '', s.rollNo || '', s.bloodGroup || '', s.otherInfo || '',
      s._schoolName || '',
      s.createdAt ? new Date(s.createdAt).toLocaleDateString('en-IN') : ''
    ]; });

    var teacherHeaders = [
      'Teacher ID','Name','Designation','Father Name','DOB','Mobile','Address',
      'Blood Group','Husband Name','Teacher Code (teacherId)','Other Details',
      'School','Added On'
    ];
    var teacherRows = allTeachers.map(function(t) { return [
      t.id || '', t.name || '', t.designation || '', t.fatherName || '', t.dob || '', t.mobile || '', t.address || '',
      t.bloodGroup || '', t.husbandName || '', t.teacherId || '', t.otherDetails || '',
      t._schoolName || '',
      t.createdAt ? new Date(t.createdAt).toLocaleDateString('en-IN') : ''
    ]; });

    var wb = window.XLSX.utils.book_new();
    var wsStudents = window.XLSX.utils.aoa_to_sheet([studentHeaders].concat(studentRows));
    window.XLSX.utils.book_append_sheet(wb, wsStudents, 'Students');
    var wsTeachers = window.XLSX.utils.aoa_to_sheet([teacherHeaders].concat(teacherRows));
    window.XLSX.utils.book_append_sheet(wb, wsTeachers, 'Teachers');
    var workbookBytes = window.XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    zip.file('rkchoice_data_' + dateStr + '.xlsx', workbookBytes);

    if (btn) btn.textContent = '\uD83D\uDCE6 Creating ZIP...';
    var content = await zip.generateAsync({ type: 'blob' });
    if (btn) btn.textContent = '\u2705 Starting Download...';
    var url = URL.createObjectURL(content);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'rkchoice_data_' + dateStr + '.zip';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    window.showToast('ZIP downloaded! (Students: ' + allStudents.length + ', Teachers: ' + allTeachers.length + ')', 'success');
  } catch(err) {
    window.showToast('Download failed: ' + err.message, 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '\uD83D\uDCE6 Download ZIP'; }
  }
};
