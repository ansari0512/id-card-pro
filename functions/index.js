const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
admin.initializeApp();

// ================== PERMANENT DELETE SCHOOL (callable) ==================
// Called from the admin panel when permanently deleting a school.
// Deletes Firebase Auth user so the school can never login again.
exports.permanentDeleteSchool = functions.https.onCall(async (data, context) => {
  // Verify the caller is an authenticated admin
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'You must be logged in');
  }

  const callerUid = context.auth.uid;

  // Check if caller is admin
  const callerDoc = await admin.firestore().collection('users').doc(callerUid).get();
  const callerRole = callerDoc.exists ? callerDoc.data().role : null;
  if (callerRole !== 'admin') {
    throw new functions.https.HttpsError('permission-denied', 'Only admin can permanently delete a school');
  }

  const schoolUid = data.schoolUid;
  if (!schoolUid) {
    throw new functions.https.HttpsError('invalid-argument', 'schoolUid is required');
  }

  // Delete Firebase Auth user
  try {
    await admin.auth().deleteUser(schoolUid);
    functions.logger.log(`Auth user permanently deleted for school: ${schoolUid}`);
  } catch (err) {
    if (err.code === 'auth/user-not-found') {
      functions.logger.warn(`Auth user not found for school: ${schoolUid}, already deleted`);
    } else {
      functions.logger.error(`Failed to delete auth user for school: ${schoolUid}`, err);
      throw new functions.https.HttpsError('internal', 'Failed to delete auth user: ' + err.message);
    }
  }

  // Delete users collection document
  try {
    await admin.firestore().collection('users').doc(schoolUid).delete();
    functions.logger.log(`Users doc deleted for school: ${schoolUid}`);
  } catch (err) {
    functions.logger.warn(`Could not delete users doc for school: ${schoolUid}`, err.message);
  }

  return { success: true, message: 'Auth user and users doc permanently deleted' };
});
