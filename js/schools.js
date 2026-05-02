import { db, auth } from './firebase.js';

/**
 * Schools Module
 * Manages school creation and admin operations
 */

const SCHOOLS_COLLECTION = 'schools';

/**
 * Create new school (admin only)
 */
export async function createSchool(schoolData) {
  const user = auth.currentUser;
  if (!user) throw new Error('Authentication required');

  // User's email becomes the document ID
  const schoolId = user.email;

  const school = {
    ...schoolData,
    email: user.email,
    adminUid: user.uid,
    createdAt: Date.now()
  };

  await db.collection(SCHOOLS_COLLECTION).doc(schoolId).set(school);
  return school;
}

/**
 * Get all schools (super admin only)
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
 * Get single school by ID (email)
 */
export async function getSchool(schoolId) {
  const doc = await db.collection(SCHOOLS_COLLECTION).doc(schoolId).get();
  if (!doc.exists) {
    throw new Error('School not found');
  }
  return { id: doc.id, ...doc.data() };
}

/**
 * Update school data
 */
export async function updateSchool(schoolId, updates) {
  await db.collection(SCHOOLS_COLLECTION).doc(schoolId).update({
    ...updates,
    updatedAt: Date.now()
  });

  const doc = await db.collection(SCHOOLS_COLLECTION).doc(schoolId).get();
  return { id: schoolId, ...doc.data() };
}

/**
 * Delete school and all associated students
 */
export async function deleteSchool(schoolId) {
  const user = auth.currentUser;
  if (!user) throw new Error('Authentication required');

  const school = await getSchool(schoolId);
  if (school.adminUid !== user.uid) {
    throw new Error('Unauthorized');
  }

  // Delete all students of this school
  const studentsSnapshot = await db.collection('students')
    .where('schoolEmail', '==', schoolId)
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
      .where('schoolEmail', '==', schoolId)
      .count()
      .get()
  ]);

  return {
    school: schoolDoc.exists ? { id: schoolDoc.id, ...schoolDoc.data() } : null,
    totalStudents: studentsSnapshot.data().count
  };
}