const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Firebase Admin SDK को इनिशियलाइज़ करें
admin.initializeApp();

// ================== SCHOOL DELETION LOG FUNCTION ==================
// जब 'schools' कलेक्शन में कोई डॉक्यूमेंट डिलीट होता है, तो यह फंक्शन चलता है
exports.logDeletedSchool = functions.firestore
  .document('schools/{schoolId}')
  .onDelete(async (snap, context) => {
    const deletedData = snap.data(); // डिलीट किए गए स्कूल का डेटा
    const schoolId = context.params.schoolId; // डिलीट किए गए स्कूल का ID
    const deletionTime = admin.firestore.Timestamp.now(); // डिलीशन का समय
    
    // कौन delete कर रहा है (Auth से UID)
    const deletedByUid = context.auth?.uid;

    // UID के corresponding email निकालें (अगर user doc में email stored है)
    let deletedBy = 'unknown_user_or_admin_operation';
    try {
      if (deletedByUid) {
        const userDoc = await admin.firestore().collection('users').doc(deletedByUid).get();
        if (userDoc.exists) {
          const data = userDoc.data() || {};
          deletedBy = data.email || data.userEmail || deletedByUid;
        } else {
          deletedBy = deletedByUid;
        }
      }
    } catch (e) {
      deletedBy = deletedByUid || 'unknown_user_or_admin_operation';
    }

    const logEntry = {
      collectionName: 'schools',
      documentPath: `schools/${schoolId}`,
      documentId: schoolId,
      deletedData: deletedData,
      deletedAt: deletionTime,
      deletedBy: deletedBy,
      reason: 'School document deleted',
    };

    try {
      await admin.firestore().collection('deletion_logs').add(logEntry);
      functions.logger.log(`School deletion logged successfully for schoolId: ${schoolId}`);
    } catch (error) {
      functions.logger.error(`Error logging school deletion for schoolId: ${schoolId}`, error);
    }
  });

// ================== STUDENT DELETION LOG FUNCTION ==================
exports.logDeletedStudent = functions.firestore
  .document('schools/{schoolId}/classes/{className}/students/{studentId}')
  .onDelete(async (snap, context) => {
    const deletedData = snap.data();
    const { schoolId, className, studentId } = context.params;
    const deletionTime = admin.firestore.Timestamp.now();

    const deletedByUid = context.auth?.uid;

    let deletedBy = 'unknown_user_or_admin_operation';
    try {
      if (deletedByUid) {
        const userDoc = await admin.firestore().collection('users').doc(deletedByUid).get();
        deletedBy = userDoc.exists && userDoc.data().email ? userDoc.data().email : deletedByUid;
      }
    } catch (e) {
      deletedBy = deletedByUid || 'unknown_user_or_admin_operation';
    }

    const logEntry = {
      collectionName: 'schools/classes/students',
      documentPath: `schools/${schoolId}/classes/${className}/students/${studentId}`,
      documentId: studentId,
      deletedData: deletedData,
      deletedAt: deletionTime,
      deletedBy: deletedBy,
      reason: 'Student document deleted',
    };

    try {
      await admin.firestore().collection('deletion_logs').add(logEntry);
      functions.logger.log(`Student deletion logged successfully for studentId: ${studentId}`);
    } catch (error) {
      functions.logger.error(`Error logging student deletion for studentId: ${studentId}`, error);
    }
  });

// ================== TEACHER/STAFF DELETION LOG FUNCTION ==================
// जब 'teachers' कलेक्शन में कोई डॉक्यूमेंट डिलीट होता है, तो यह फंक्शन चलता है
exports.logDeletedTeacher = functions.firestore
  .document('schools/{schoolId}/teachers/{teacherId}')
  .onDelete(async (snap, context) => {
    const deletedData = snap.data();
    const { schoolId, teacherId } = context.params;
    const deletionTime = admin.firestore.Timestamp.now();

    const deletedByUid = context.auth?.uid;

    let deletedBy = 'unknown_user_or_admin_operation';
    try {
      if (deletedByUid) {
        const userDoc = await admin.firestore().collection('users').doc(deletedByUid).get();
        deletedBy = userDoc.exists && userDoc.data().email ? userDoc.data().email : deletedByUid;
      }
    } catch (e) {
      deletedBy = deletedByUid || 'unknown_user_or_admin_operation';
    }

    const logEntry = {
      collectionName: 'schools/teachers',
      documentPath: `schools/${schoolId}/teachers/${teacherId}`,
      documentId: teacherId,
      deletedData: deletedData,
      deletedAt: deletionTime,
      deletedBy: deletedBy,
      reason: 'Teacher/Staff document deleted',
    };

    try {
      await admin.firestore().collection('deletion_logs').add(logEntry);
      functions.logger.log(`Teacher deletion logged successfully for teacherId: ${teacherId}`);
    } catch (error) {
      functions.logger.error(`Error logging teacher deletion for teacherId: ${teacherId}`, error);
    }
  });

// ================== PENDING STUDENT DELETION LOG FUNCTION ==================
// जब 'pending_students' कलेक्शन में कोई डॉक्यूमेंट डिलीट होता है, तो यह फंक्शन चलता है
exports.logDeletedPendingStudent = functions.firestore
  .document('schools/{schoolId}/pending_students/{studentId}')
  .onDelete(async (snap, context) => {
    const deletedData = snap.data();
    const { schoolId, studentId } = context.params;
    const deletionTime = admin.firestore.Timestamp.now();

    const deletedByUid = context.auth?.uid;

    let deletedBy = 'unknown_user_or_admin_operation';
    try {
      if (deletedByUid) {
        const userDoc = await admin.firestore().collection('users').doc(deletedByUid).get();
        deletedBy = userDoc.exists && userDoc.data().email ? userDoc.data().email : deletedByUid;
      }
    } catch (e) {
      deletedBy = deletedByUid || 'unknown_user_or_admin_operation';
    }

    const logEntry = {
      collectionName: 'schools/pending_students',
      documentPath: `schools/${schoolId}/pending_students/${studentId}`,
      documentId: studentId,
      deletedData: deletedData,
      deletedAt: deletionTime,
      deletedBy: deletedBy,
      reason: 'Pending student document deleted',
    };

    try {
      await admin.firestore().collection('deletion_logs').add(logEntry);
      functions.logger.log(`Pending student deletion logged successfully for studentId: ${studentId}`);
    } catch (error) {
      functions.logger.error(`Error logging pending student deletion for studentId: ${studentId}`, error);
    }
  });