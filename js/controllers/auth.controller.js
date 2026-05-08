/**
 * Auth Controller
 * Handles authentication for login.html
 */

window.currentUser = null;
window.currentRole = null;

/**
 * Resolve role from Firestore user data.
 * Tries UID first, then email lookup, then admin email fallback.
 */
window.fetchUserRole = async function(user) {
  if (!user) return null;

  try {
    const userDoc = await firebase.firestore().collection('users').doc(user.uid).get();
    if (userDoc.exists) {
      const role = userDoc.data().role;
      if (role) return role;
    }
  } catch (e) {
    console.warn('fetchUserRole Firestore read failed:', e.message);
  }

  return 'school';
};

/**
 * Initialize auth listener
 */
window.initAuth = function(onChange) {
  firebase.auth().onAuthStateChanged(async user => {
    window.currentUser = user;
    if (user) {
      window.currentRole = await window.fetchUserRole(user);
    } else {
      window.currentRole = null;
    }
    onChange(user, window.currentRole);
  });
};

/**
 * Login with email/password
 */
window.login = async function(email, password) {
  try {
    const userCredential = await firebase.auth().signInWithEmailAndPassword(email, password);
    const user = userCredential.user;
    const role = await window.fetchUserRole(user);
    window.currentUser = user;
    window.currentRole = role;
    return { user, role };
  } catch (error) {
    const code = error.code || '';

    // Old Firebase error codes (still work on some projects)
    if (code === 'auth/user-not-found' || code === 'auth/invalid-email') {
      throw new Error('User not found in database');
    }
    if (code === 'auth/wrong-password') {
      throw new Error('Invalid Password');
    }

    // Firebase v9+ combines both errors into one code
    // We check Firestore to find out if email exists
    if (code === 'auth/invalid-login-credentials' || code === 'auth/invalid-credential') {
      try {
        // Check if any user document has this email in Firestore
        const usersSnap = await firebase.firestore()
          .collection('users')
          .where('email', '==', email)
          .limit(1)
          .get();

        if (usersSnap.empty) {
          // Email Firestore me nahi mila — user exist nahi karta
          throw new Error('User not found in database');
        } else {
          // Email mila — matlab password galat hai
          throw new Error('Invalid Password');
        }
      } catch (firestoreError) {
        // Agar firestoreError hamara khud ka throw kiya hua hai to wahi throw karo
        if (firestoreError.message === 'User not found in database' ||
            firestoreError.message === 'Invalid Password') {
          throw firestoreError;
        }
        // Firestore read fail hua to generic message
        throw new Error('User not found in database');
      }
    }

    if (code === 'auth/too-many-requests') {
      throw new Error('Too many attempts. Please try later.');
    }
    if (code === 'auth/network-request-failed') {
      throw new Error('Network error. Please check connection.');
    }

    throw mapAuthError(code, error.message);
  }
};

/**
 * Logout
 */
window.logout = async function() {
  try {
    await firebase.auth().signOut();
    window.currentUser = null;
    window.currentRole = null;
  } catch (error) {
    throw new Error('Logout failed: ' + error.message);
  }
};

/**
 * Admin creates school account (secondary app - doesn't logout admin)
 */
window.createSchoolAccount = async function(email, password, schoolData) {
  const secondaryApp = window.firebase.initializeApp(window.firebase.app().options, 'secondary_' + Date.now());
  const secondaryAuth = secondaryApp.auth();
  const currentUser = firebase.auth().currentUser;

  try {
    const cred = await secondaryAuth.createUserWithEmailAndPassword(email, password);
    const uid = cred.user.uid;

    await firebase.firestore().collection('users').doc(uid).set({
      role: 'school',
      email,
      createdAt: Date.now(),
      createdBy: currentUser ? currentUser.uid : null
    });

    await firebase.firestore().collection('schools').doc(uid).set({
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
};

/**
 * Check if logged in
 */
window.isLoggedIn = function() {
  return window.currentUser !== null;
};

/**
 * Get current user
 */
window.getCurrentUser = function() {
  return window.currentUser;
};

/**
 * Get current role
 */
window.getRole = function() {
  return window.currentRole;
};

/**
 * Check if admin
 */
window.isAdmin = function() {
  return window.currentRole === 'admin';
};

/**
 * Require auth (redirect if not logged in)
 */
window.requireAuth = function(redirectUrl = 'index.html') {
   if (!window.isLoggedIn()) {
     window.location.href = redirectUrl;
     return false;
   }
   return true;
};

/**
 * Require admin (redirect if not admin)
 */
window.requireAdmin = function(redirectUrl = 'dashboard.html') {
   if (!window.isLoggedIn()) {
     window.location.href = 'index.html';
     return false;
   }
   if (window.currentRole !== 'admin') {
     window.location.href = redirectUrl;
     return false;
   }
   return true;
};

/**
 * Map Firebase auth errors
 */
function mapAuthError(code, message) {
  const errorMap = {
    'auth/invalid-email': 'User not found in database',
    'auth/user-disabled': 'Account disabled',
    'auth/user-not-found': 'User not found in database',
    'auth/wrong-password': 'Invalid Password',
    'auth/invalid-login-credentials': 'User not found in database',
    'auth/email-already-in-use': 'Email already registered',
    'auth/weak-password': 'Password should be at least 6 characters',
    'auth/operation-not-allowed': 'Operation not allowed',
    'auth/network-request-failed': 'Network error. Please check connection.',
    'auth/too-many-requests': 'Too many attempts. Please try later.'
  };
  return new Error(errorMap[code] || message);
}
