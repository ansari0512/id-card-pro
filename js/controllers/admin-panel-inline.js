/**
 * admin-panel-inline.js
 * Extracted inline JS from admin-panel.html
 */

(function() {
  // Keep exported globals on window

  window.refreshSchools = function() {
    window.showToast('Refreshing schools data...', 'info');
    window.loadSchools();
  };

  // Export Schools data (existing)
  window.exportSchoolsData = async function() {


    window.showToast('Preparing export... please wait', 'info');

    try {
      const snapshot = await firebase.firestore()
        .collection('schools')
        .orderBy('schoolName')
        .get();

      const schools = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

      if (schools.length === 0) {
        window.showToast('No schools to export', 'error');
        return;
      }

      const classOrder = ['Nursery','LKG','UKG','KG','1','2','3','4','5','6','7','8','9','10'];

      const schoolsData = await Promise.all(schools.map(async school => {
        try {
          const students = await window.dbGetAllStudents(school.id);
          const classCount = {};
          students.forEach(s => {
            const cls = s.class || 'Unknown';
            classCount[cls] = (classCount[cls] || 0) + 1;
          });
          return { school, students, classCount };
        } catch(e) {
          return { school, students: [], classCount: {} };
        }
      }));

      const allClasses = [...new Set(
        schoolsData.flatMap(d => Object.keys(d.classCount))
      )].sort((a, b) => {
        const ai = classOrder.indexOf(a), bi = classOrder.indexOf(b);
        if (ai === -1 && bi === -1) return a.localeCompare(b);
        if (ai === -1) return 1;
        if (bi === -1) return -1;
        return ai - bi;
      });

      const classHeaders = allClasses.map(c => isNaN(c) ? c : 'Class ' + c);
      const headers = ['School Name', 'City', 'Email', 'Status', 'Total Students', ...classHeaders, 'Added On'];

      const dataRows = schoolsData.map(({ school, students, classCount }) => [
        school.schoolName || '',
        school.city || '',
        school.loginId || school.contactEmail || school.email || '',
        school.active !== false ? 'Active' : 'Inactive',
        students.length,
        ...allClasses.map(c => classCount[c] || 0),
        school.createdAt ? new Date(school.createdAt).toLocaleDateString('en-IN') : ''
      ]);

      const totalStudents = schoolsData.reduce((sum, d) => sum + d.students.length, 0);
      const totalByClass = allClasses.map(c => schoolsData.reduce((sum, d) => sum + (d.classCount[c] || 0), 0));
      const totalRow = ['TOTAL', '', '', '', totalStudents, ...totalByClass, ''];

      const headerCells = headers.map((h, i) => {
        const isTotalCol = i === 4;
        return `<th style="${window.ExcelStyles.getTableHeaderStyle(isTotalCol)}">${h}</th>`;
      }).join('');

      const dataRowsHtml = dataRows.map(row => {
        const cells = row.map((val, i) => {
          const isTotalCol = i === 4;
          const isLeftAlign = i === 0;
          return `<td style="${window.ExcelStyles.getCellStyle(isLeftAlign, isTotalCol)}">${val}</td>`;
        }).join('');
        return `<tr>${cells}</tr>`;
      }).join('');

      const totalCells = totalRow.map((val, i) => {
        const isTotalCol = i === 4;
        const isLeftAlign = i === 0;
        return `<td style="${window.ExcelStyles.getTotalCellStyle(isLeftAlign, isTotalCol)}">${val}</td>`;
      }).join('');

      const dateStr = new Date().toLocaleDateString('en-IN');
      const html = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
        <head><meta charset="UTF-8"><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Schools Report</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head>
        <body>
          <table border="0" cellpadding="0" cellspacing="0" style="${window.ExcelStyles.getTableWrapperStyle()}">
            <tr><td colspan="${headers.length}" style="${window.ExcelStyles.getTitleCellStyle()}">RK Choice - Schools Export (${dateStr})</td></tr>
            <tr><td colspan="${headers.length}" style="${window.ExcelStyles.getSpacerCellStyle()}"></td></tr>
            <tr>${headerCells}</tr>
            ${dataRowsHtml}
            <tr><td colspan="${headers.length}" style="${window.ExcelStyles.getSpacerCellStyle()}"></td></tr>
            <tr>${totalCells}</tr>
          </table>
        </body></html>`;

      const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `schools_export_${new Date().toISOString().slice(0,10)}.xls`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      window.showToast(`✅ Exported ${schools.length} schools successfully!`, 'success');
    } catch(err) {
      window.showToast('Export failed: ' + err.message, 'error');
    }
  };

  // Auth init that was inline inside admin-panel.html
  firebase.auth().onAuthStateChanged(async function(user) {
    if (!user) { window.location.href = 'index.html'; return; }
    const role = await window.fetchUserRole(user);
    if (role !== 'admin') { window.location.href = 'dashboard.html'; return; }
    window.adminUser = user;
    window.currentUser = user;
    window.currentRole = role;
    const el = document.getElementById('adminEmail');
    if (el) el.textContent = user.email;
    window.loadSchools();
  });
})();

