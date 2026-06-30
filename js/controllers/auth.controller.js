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
 * Check if a school user is allowed to login (school doc exists and is active).
 * Throws an error if the school is deleted or disabled.
 */
window.checkSchoolAccess = async function(uid) {
  try {
    const schoolDoc = await firebase.firestore().collection('schools').doc(uid).get();
    if (!schoolDoc.exists) {
      await firebase.auth().signOut();
      throw new Error('School account has been deleted. Contact admin.');
    }
    const schoolData = schoolDoc.data();
    if (schoolData.active === false) {
      await firebase.auth().signOut();
      throw new Error('School account is disabled. Contact admin.');
    }
    return true;
  } catch (error) {
    // Re-throw if it's already our custom error
    if (error.message === 'School account has been deleted. Contact admin.' ||
        error.message === 'School account is disabled. Contact admin.') {
      throw error;
    }
    // If Firestore read fails, still allow login (graceful fallback)
    console.warn('checkSchoolAccess: Could not verify school status:', error.message);
    return true;
  }
};

/**
 * Resolve login input to Firebase auth email.
 * If input contains "@", use as-is (backward compatible with old email logins).
 * Otherwise, treat as Login ID: trim, uppercase, append @rkchoice.com.
 */
window.resolveAuthEmail = function(input) {
  const trimmed = (input || '').trim();
  if (trimmed.includes('@')) {
    return { isEmail: true, authEmail: trimmed, loginId: null };
  }
  const loginId = trimmed.toUpperCase();
  return { isEmail: false, authEmail: loginId + '@rkchoice.com', loginId };
};

/**
 * Login with Login ID or Email
 */
window.login = async function(input, password) {
  try {
    const { isEmail, authEmail, loginId } = window.resolveAuthEmail(input);
    const userCredential = await firebase.auth().signInWithEmailAndPassword(authEmail, password);
    const user = userCredential.user;
    const role = await window.fetchUserRole(user);
    
    // If the user is a school, check if their account exists and is active
    if (role === 'school') {
      await window.checkSchoolAccess(user.uid);
    }
    
    window.currentUser = user;
    window.currentRole = role;
    return { user, role };
  } catch (error) {
    const code = error.code || '';
    const inputForLookup = (input || '').trim();

    // Old Firebase error codes (still work on some projects)
    if (code === 'auth/user-not-found' || code === 'auth/invalid-email') {
      // Try to give a more helpful message based on whether this was a login ID or email
      if (inputForLookup.includes('@')) {
        throw new Error('User not found in database');
      } else {
        throw new Error('User not found in database');
      }
    }
    if (code === 'auth/wrong-password') {
      throw new Error('Invalid Password');
    }

    // Firebase v9+ combines both errors into one code
    if (code === 'auth/invalid-login-credentials' || code === 'auth/invalid-credential') {
      try {
        if (inputForLookup.includes('@')) {
          // Email login: check users collection by email field
          const usersSnap = await firebase.firestore()
            .collection('users')
            .where('email', '==', inputForLookup)
            .limit(1)
            .get();

          if (usersSnap.empty) {
            throw new Error('User not found in database');
          } else {
            throw new Error('Invalid Password');
          }
        } else {
          // Login ID login: check schools collection by loginId
          const loginIdUpper = inputForLookup.toUpperCase();
          const schoolsSnap = await firebase.firestore()
            .collection('schools')
            .where('loginId', '==', loginIdUpper)
            .limit(1)
            .get();

          if (schoolsSnap.empty) {
            throw new Error('User not found in database');
          } else {
            throw new Error('Invalid Password');
          }
        }
      } catch (firestoreError) {
        if (firestoreError.message === 'User not found in database' ||
            firestoreError.message === 'Invalid Password') {
          throw firestoreError;
        }
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
 * Accepts loginId and contactEmail instead of a plain email.
 * Generates authEmail = loginId + "@rkchoice.com" for Firebase Auth only.
 * authEmail is NEVER stored in Firestore.
 */
window.createSchoolAccount = async function(loginId, contactEmail, password, schoolData) {
  const loginIdUpper = (loginId || '').trim().toUpperCase();
  const authEmail = loginIdUpper + '@rkchoice.com';
  
  const secondaryApp = window.firebase.initializeApp(window.firebase.app().options, 'secondary_' + Date.now());
  const secondaryAuth = secondaryApp.auth();
  const currentUser = firebase.auth().currentUser;

  try {
    const cred = await secondaryAuth.createUserWithEmailAndPassword(authEmail, password);
    const uid = cred.user.uid;

    // Store contactEmail (not authEmail) in users doc
    await firebase.firestore().collection('users').doc(uid).set({
      role: 'school',
      loginId: loginIdUpper,
      contactEmail: contactEmail,
      createdAt: Date.now(),
      createdBy: currentUser ? currentUser.uid : null
    });

    // Store loginId and contactEmail in schools doc (not authEmail)
    await firebase.firestore().collection('schools').doc(uid).set({
      ...schoolData,
      loginId: loginIdUpper,
      contactEmail: contactEmail,
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
 * Handle bfcache restore (browser back/forward navigation).
 * pageshow fires every time the page is displayed, including from bfcache
 * where the page is restored without re-executing scripts.
 * This runs on all pages that load auth.controller.js.
 */
(function() {
  // Use a flag to ensure this runs after initAuth sets window.currentUser,
  // but also handles pages where initAuth wasn't called
  window.addEventListener('pageshow', function(event) {
    if (event.persisted) {
      // Page was restored from bfcache — re-check auth
      const user = firebase.auth().currentUser;
      if (!user) {
        window.location.href = 'index.html';
      }
    }
  });
})();

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
