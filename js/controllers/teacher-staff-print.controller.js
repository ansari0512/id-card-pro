/**
 * Teacher/Staff Print Controller
 */

window.initTeacherStaffPrint = function() {
  // Normalize URL params: single id → ids array
  window.normalizeTeacherPrintParams();

  window.initAuth(async (user, role) => {
    if (!user) {
      window.location.href = 'index.html';
      return;
    }

    await window.loadTeacherStaffForPrint(user);
  });
};

window.loadTeacherStaffForPrint = async function(user) {
  try {
    const params = new URLSearchParams(window.location.search);
    const idsParam = params.get('ids') || params.get('id');
    const schoolId = params.get('schoolId') || user.uid;

    const all = await window.dbGetAllTeacherStaff(schoolId);

    if (idsParam) {
      const ids = idsParam.split(',');
      const filtered = all.filter(t => ids.includes(t.id));
      window.renderTeacherStaffCards(filtered);
    } else {
      window.renderTeacherStaffCards(all);
    }

    document.getElementById('loading').style.display = 'none';
    const container = document.getElementById('cardsContainer');
    container.classList.remove('d-none');
    container.style.display = 'grid';
  } catch (error) {
    const loading = document.getElementById('loading');
    if (loading) loading.innerHTML = '<p style="color:red;">Error loading records: ' + error.message + '</p>';
  }
};

window.renderTeacherStaffCards = function(list) {
  const container = document.getElementById('cardsContainer');
  container.innerHTML = '';

  if (!list || list.length === 0) {
    const loading = document.getElementById('loading');
    if (loading) loading.innerHTML = '<p>No records found.</p>';
    return;
  }

  list.forEach(function(t) {
    const card = document.createElement('div');
    card.className = 'id-card teacher-card';

    // Header
    const header = document.createElement('div');
    header.className = 'card-header';
    header.textContent = 'RK CHOICE ID CARD';

    // Body
    const body = document.createElement('div');
    body.className = 'card-body';

    // Photo
    const photo = document.createElement('img');
    photo.className = 'card-photo';
    photo.src = t.photo || 'assets/placeholder.png';
    photo.alt = 'Photo';
    photo.onerror = function() { this.src = 'assets/placeholder.png'; };

    // Details
    const details = document.createElement('div');
    details.className = 'card-details';

    // Name
    const nameEl = document.createElement('div');
    nameEl.className = 'card-name';
    nameEl.textContent = t.name || 'Unknown';
    details.appendChild(nameEl);

    // Info rows (no name - name is already the heading)
    const rows = [
      { label: 'Designation:', value: t.designation || '-' },
      { label: 'Father:', value: t.fatherName || '-' },
      { label: 'Husband:', value: t.husbandName || '-' },
      { label: 'Teacher ID:', value: t.teacherId || '-' },
      { label: 'D.O.B:', value: t.dob || '-' },
      { label: 'Blood:', value: t.bloodGroup || '-' },
      { label: 'Mobile:', value: t.mobile || '-' },
      { label: 'Address:', value: t.address || '-' },
      { label: 'Other:', value: t.otherDetails || '-' }
    ];

    rows.forEach(function(row) {
      const div = document.createElement('div');
      div.className = 'card-info-row';

      const strong = document.createElement('strong');
      strong.textContent = row.label;

      const span = document.createElement('span');
      span.textContent = row.value;

      div.appendChild(strong);
      div.appendChild(span);
      details.appendChild(div);
    });

    body.appendChild(photo);
    body.appendChild(details);

    // Footer
    const footer = document.createElement('div');
    footer.className = 'card-footer';

    const idEl = document.createElement('div');
    idEl.className = 'card-id';
    idEl.textContent = t.id || '';

    const qr = document.createElement('img');
    qr.className = 'card-qr';
    qr.src = 'https://api.qrserver.com/v1/create-qr-code/?size=28x28&data=' + encodeURIComponent(t.id || '');
    qr.alt = 'QR';

    footer.appendChild(idEl);
    footer.appendChild(qr);

    card.appendChild(header);
    card.appendChild(body);
    card.appendChild(footer);
    container.appendChild(card);
  });
};

/**
 * URL parameter normalization — support both id= and ids= params
 */
window.normalizeTeacherPrintParams = function() {
  const url = new URL(window.location.href);
  if (url.searchParams.get('id') && !url.searchParams.get('ids')) {
    url.searchParams.set('ids', url.searchParams.get('id'));
    window.history.replaceState({}, '', url.toString());
  }
};

document.addEventListener('DOMContentLoaded', window.initTeacherStaffPrint);

