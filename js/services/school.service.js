/**
 * School Service
 * Manages school operations (admin side)
 */

import { db, auth } from './firebase.service.js';

const SCHOOLS_COLLECTION = 'schools';

/**
 * Create new school (admin only)
 */
export async function createSchool(schoolData) {
  const user = auth.currentUser;
  if (!user) throw new Error('Authentication required');

  const schoolId = user.email;

  const school = {
    ...schoolData,
    email: user.email,
    adminUid: user.uid,
    createdAt: Date.now(),
    active: true
  };

  await db.collection(SCHOOLS_COLLECTION).doc(schoolId).set(school);

  // Also create user document
  await db.collection('users').doc(user.uid).set({
    role: 'school',
    email: user.email,
    createdAt: Date.now()
  });

  return school;
}

/**
 * Get all schools (admin only)
 */
export async function getAllSchools() {
  const snapshot = await db.collection(SCHOOLS_COLLECTION)
    .orderBy('createdAt', 'desc')
    .get();

  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
}

/**
 * Get single school
 */
export async function getSchool(schoolId) {
  const doc = await db.collection(SCHOOLS_COLLECTION).doc(schoolId).get();
  if (!doc.exists) {
    throw new Error('School not found');
  }
  return { id: doc.id, ...doc.data() };
}

/**
 * Toggle school active status
 */
export async function toggleSchoolStatus(schoolId, currentStatus) {
  await db.collection(SCHOOLS_COLLECTION).doc(schoolId).update({
    active: !currentStatus
  });
}

/**
 * Delete school and all its students
 */
export async function deleteSchool(schoolId) {
  const user = auth.currentUser;
  if (!user) throw new Error('Authentication required');

  const school = await getSchool(schoolId);

  // Verify admin ownership
  if (school.adminUid !== user.uid) {
    throw new Error('Unauthorized');
  }

  // Delete all students of this school
  const studentsSnapshot = await db.collection('students')
    .where('schoolId', '==', schoolId)
    .get();

  const batch = db.batch();
  studentsSnapshot.docs.forEach(doc => batch.delete(doc.ref));
  await batch.commit();

  // Delete school document
  await db.collection(SCHOOLS_COLLECTION).doc(schoolId).delete();

  return true;
}

/**
 * Get school statistics
 */
export async function getSchoolStats(schoolId) {
  const [schoolDoc, studentsSnapshot] = await Promise.all([
    db.collection(SCHOOLS_COLLECTION).doc(schoolId).get(),
    db.collection('students')
      .where('schoolId', '==', schoolId)
      .count()
      .get()
  ]);

  return {
    school: schoolDoc.exists ? { id: schoolDoc.id, ...schoolDoc.data() } : null,
    totalStudents: studentsSnapshot.data().count
  };
}

/**
 * Create school with secondary auth (doesn't logout admin)
 */
export async function createSchoolWithSecondaryAuth(email, password, schoolData) {
  const secondaryApp = window.firebase.initializeApp(window.firebase.app().options, 'secondary_' + Date.now());
  const secondaryAuth = secondaryApp.auth();
  const currentUser = auth.currentUser;

  try {
    const cred = await secondaryAuth.createUserWithEmailAndPassword(email, password);
    const uid = cred.user.uid;

    // Set user role
    await db.collection('users').doc(uid).set({
      role: 'school',
      email,
      createdAt: Date.now(),
      createdBy: currentUser.uid
    });

    // Create school document
    await db.collection(SCHOOLS_COLLECTION).doc(uid).set({
      ...schoolData,
      email,
      uid,
      createdAt: Date.now(),
      active: true
    });

    return uid;
  } finally {
    await secondaryAuth.signOut();
    await secondaryApp.delete();
  }
}
