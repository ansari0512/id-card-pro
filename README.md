# 🎓 RK Choice ID Card System

A modern, **production-ready** Student & Teacher/Staff ID Card Management System built with Firebase. Designed for schools and educational institutes to create, manage, and print professional ID cards with zero infrastructure cost.

---

## 📋 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Setup Guide](#-setup-guide)
- [Deployment](#-deployment)
- [Usage Guide](#-usage-guide)
- [Security](#-security)
- [Browser Support](#-browser-support)

---

## ✨ Features

### For Admin
- ✅ **Create School Accounts** — One-click school registration
- ✅ **View All Schools** — Total schools, active/inactive counts, student statistics
- ✅ **Manage Schools** — Activate/deactivate schools remotely
- ✅ **Access All Students** — View and search students across any school
- ✅ **Export Schools Data** — Download school data as CSV

### For Schools
- ✅ **Student Management** — Add, edit, delete student records with photo upload
- ✅ **Teacher/Staff Management** — Full CRUD for teacher/staff records
- ✅ **Bulk Operations** — Select multiple students/teachers for batch printing or deletion
- ✅ **Smart Search & Filter** — Find students by name, ID, or class
- ✅ **CSV/Excel Import** — Bulk import students from CSV or Excel files
- ✅ **Export Data** — Download student data as CSV
- ✅ **Photo Management** — Bulk download all photos as ZIP archive
- ✅ **Student Promotion** — Promote students to next class/section
- ✅ **ID Card Preview** — Live preview before saving

### ID Card Printing
- ✅ **Student ID Cards** — Portrait layout, 3 per A4 row
- ✅ **Teacher/Staff ID Cards** — Landscape layout, 3 per A4 row
- ✅ **Batch Printing** — Print multiple ID cards at once
- ✅ **PDF Export** — Save as PDF directly from browser
- ✅ **QR Code** — Auto-generated QR codes on every card

### User Experience
- ✅ **Dark & Light Themes** — Toggle with persistence
- ✅ **Fully Responsive** — Works on desktop, tablet, and mobile
- ✅ **Real-time Updates** — Toast notifications for all actions
- ✅ **Secure Authentication** — Role-based access (Admin vs School)

---

## 🚀 Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | HTML5, CSS3 (CSS Variables, Grid), Vanilla JavaScript (ES6+) |
| **Backend** | Firebase (Serverless) |
| **Database** | Cloud Firestore (NoSQL) |
| **Auth** | Firebase Authentication (Email/Password) |
| **Storage** | Firebase Storage (Student & Teacher photos) |
| **Hosting** | Firebase Hosting (or any static host) |
| **Fonts** | Google Fonts (Poppins) |

**No build process required** — pure static files deploy directly.

---

## 📁 Project Structure

```
id-card-pro/
│
├── 📄 index.html                  # Login page (role-based redirect)
├── 📄 dashboard.html              # School dashboard
├── 📄 id-form.html                # Create student + teacher/staff ID card
├── 📄 students.html               # Student management (CRUD, import, promote)
├── 📄 teacher-staff.html          # Teacher/staff management (CRUD, search)
├── 📄 print.html                  # Print student ID cards (A4 portrait)
├── 📄 teacher-staff-card-print.html  # Print teacher/staff ID cards (A4 landscape)
├── 📄 admin-panel.html            # Admin dashboard (manage schools)
├── 📄 admin-students.html         # Admin view of all students
│
├── 🗂️ src/
│   ├── 📁 config/
│   │   └── firebase-config.js     # Centralized Firebase configuration
│   ├── 📁 js/
│   │   ├── theme.js               # ThemeManager class
│   │   ├── common-functions.js    # Shared utility functions
│   │   ├── performance.js         # Performance optimizations
│   │   ├── admin-excel-styles.js  # Excel export styles
│   │   └── 📁 pages/
│   │       ├── login.js           # Login page logic
│   │       ├── dashboard.js       # Dashboard page logic
│   │       └── students.js        # Students page tab switching
│   └── 📁 styles/
│       ├── main.css               # Master stylesheet (imports all modules)
│       ├── variables.css          # Design tokens & CSS variables
│       ├── base.css               # Reset & typography
│       ├── buttons.css            # Button components
│       ├── forms.css              # Form components
│       ├── components.css         # UI components (cards, modals, etc.)
│       ├── navigation.css         # Topbar & navigation
│       ├── utilities.css          # Helper classes (.hidden, .d-none, etc.)
│       ├── performance.css        # GPU acceleration, reduced motion
│       ├── responsive.css         # Mobile-first responsive breakpoints
│       ├── id-form-floating.css   # Floating label inputs for ID form
│       ├── 📁 components/
│       │   └── modal.css          # Modal dialog styles
│       └── 📁 pages/
│           ├── login.css          # Login page styles
│           ├── dashboard.css      # Dashboard page styles
│           ├── admin.css          # Admin panel styles
│           ├── students.css       # Students page styles
│           ├── students-layout.css    # Students page layout grid
│           ├── students-components.css # Students page components
│           ├── print.css          # Student print page (CSS variables, A4 portrait)
│           └── teacher-staff-print.css # Teacher print page (CSS variables, A4 landscape)
│
├── 🗂️ js/
│   ├── helpers.js                 # Utility functions (showToast, sanitize, etc.)
│   └── 📁 controllers/
│       ├── auth.controller.js     # Login, logout, role detection
│       ├── dashboard.controller.js    # School dashboard logic
│       ├── admin.controller.js    # Admin school CRUD
│       ├── admin-panel-init.js    # Admin panel initialization
│       ├── admin-panel-inline.js  # Admin panel inline handlers
│       ├── admin-students-data.controller.js  # Admin students data
│       ├── admin-students-ui.controller.js    # Admin students UI
│       ├── student-data.controller.js     # Student CRUD + import/export
│       ├── student-ui.controller.js       # Student UI (modals, filters, tabs)
│       ├── student.controller.js          # Legacy student controller
│       ├── id-form.controller.js          # Student ID card creation
│       ├── id-form.ui.js                  # ID form UI (floating labels, toggle)
│       ├── teacher-staff-data.controller.js   # Teacher CRUD + export
│       ├── teacher-staff-ui.controller.js     # Teacher UI (search, edit modal)
│       ├── teacher-staff-id-form.controller.js # Teacher ID card creation
│       ├── teacher-staff-print.controller.js  # Teacher print page logic
│       ├── print.controller.js         # Student print page logic
│       └── print-choice-modal.controller.js   # Print choice modal on dashboard
│
├── 🗂️ functions/
│   ├── index.js                   # Cloud Functions
│   └── package.json               # Functions dependencies
│
├── 🗂️ assets/
│   └── placeholder.png            # Default avatar placeholder
│
├── 🔒 firestore.rules            # Firestore security rules
├── 🗂️ storage.rules              # Firebase Storage security rules
├── 📘 firebase.json              # Firebase Hosting config
├── 📄 .firebaserc                # Firebase project alias
├── 📄 package.json               # Dev tools (local server only)
├── 📄 .gitignore                 # Git ignore rules
│
└── 📖 README.md                  # This file
```

---

## 🛠️ Setup Guide

### Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Add project"**
3. Enter project name: `rk-choice-id` (or any name)
4. Click **Create project**

### Step 2: Enable Firebase Services

#### 1. Authentication
- Navigate to **Authentication → Sign-in method**
- Enable **Email/Password** provider

#### 2. Firestore Database
- Click **Create database**
- Start in **test mode** (we'll secure it with rules later)
- Choose a location closest to your users

#### 3. Storage
- Navigate to **Storage**
- Click **Get started**

### Step 3: Get Firebase Configuration

1. In Firebase Console, go to **Project Settings** (gear icon)
2. Scroll to **"Your apps"** section
3. Click **Web** icon (`</>`) to add a web app
4. Copy the **config object**

5. Open `src/config/firebase-config.js`
6. Replace the content with your config values:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.firebasestorage.app",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

### Step 4: Deploy Security Rules

⚠️ **Important** — Deploy rules before adding any users.

#### Firestore Rules

Go to **Firestore Database → Rules** tab and paste contents of `firestore.rules`:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isAdmin() {
      return request.auth != null &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }

    function isLoggedIn() {
      return request.auth != null;
    }

    function isSchoolOwner(schoolId) {
      return request.auth != null && request.auth.uid == schoolId;
    }

    function validStudentData() {
      return request.resource.data.name is string &&
             request.resource.data.name.size() > 0 &&
             request.resource.data.name.size() <= 100 &&
             request.resource.data.father is string &&
             request.resource.data.father.size() > 0 &&
             request.resource.data.class is string &&
             request.resource.data.class.size() > 0 &&
             request.resource.data.section is string &&
             request.resource.data.mobile is string &&
             request.resource.data.mobile.matches('^[0-9]{10}$') &&
             request.resource.data.schoolId is string &&
             request.resource.data.schoolId.size() > 0;
    }

    function validTeacherData() {
      return request.resource.data.name is string &&
             request.resource.data.name.size() > 0 &&
             request.resource.data.name.size() <= 100 &&
             request.resource.data.designation is string &&
             request.resource.data.designation.size() > 0 &&
             request.resource.data.fatherName is string &&
             request.resource.data.fatherName.size() > 0 &&
             request.resource.data.dob is string &&
             request.resource.data.dob.size() > 0 &&
             request.resource.data.mobile is string &&
             request.resource.data.mobile.matches('^[0-9]{10}$');
    }

    function validPendingStudentData() {
      return request.resource.data.name is string &&
             request.resource.data.name.size() > 0 &&
             request.resource.data.name.size() <= 100 &&
             request.resource.data.class is string &&
             request.resource.data.class.size() > 0;
    }

    match /users/{uid} {
      allow read:  if request.auth != null && request.auth.uid == uid;
      allow write: if request.auth != null &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }

    match /schools/{schoolId} {
      allow read:  if isLoggedIn() && (isAdmin() || isSchoolOwner(schoolId));
      allow write: if isAdmin();

      match /pending_students/{studentId} {
        allow read:  if isLoggedIn() && (isAdmin() || isSchoolOwner(schoolId));
        allow create: if isLoggedIn() && isSchoolOwner(schoolId) && validPendingStudentData();
        allow update: if isLoggedIn() && (isAdmin() || isSchoolOwner(schoolId)) && validPendingStudentData();
        allow delete: if isLoggedIn() && (isAdmin() || isSchoolOwner(schoolId));
      }

      match /counters/{year} {
        allow read: if isLoggedIn() && (isAdmin() || isSchoolOwner(schoolId));
        allow write: if isLoggedIn() && (isAdmin() || isSchoolOwner(schoolId)) &&
          request.resource.data.keys().hasOnly(['count', 'teacherCount']) &&
          (
            (!('count' in request.resource.data) || (request.resource.data.count is number && request.resource.data.count >= 0)) &&
            (!('teacherCount' in request.resource.data) || (request.resource.data.teacherCount is number && request.resource.data.teacherCount >= 0))
          );
      }

      match /teachers/{teacherId} {
        allow read: if isLoggedIn() && (isAdmin() || isSchoolOwner(schoolId));
        allow create: if isLoggedIn() && isSchoolOwner(schoolId) && validTeacherData();
        allow update: if isLoggedIn() && (isAdmin() || isSchoolOwner(schoolId)) && validTeacherData();
        allow delete: if isLoggedIn() && (isAdmin() || isSchoolOwner(schoolId));
      }

      match /classes/{className} {
        allow read:  if isLoggedIn() && (isAdmin() || isSchoolOwner(schoolId));
        allow write: if isLoggedIn() && (isAdmin() || isSchoolOwner(schoolId));

        match /students/{studentId} {
          allow read: if isLoggedIn() && (isAdmin() || isSchoolOwner(schoolId));
          allow create: if isLoggedIn() && isSchoolOwner(schoolId) &&
            validStudentData() &&
            request.resource.data.class == className &&
            request.resource.data.schoolId == schoolId;
          allow update: if isLoggedIn() && (isAdmin() || isSchoolOwner(schoolId)) && validStudentData();
          allow delete: if isLoggedIn() && (isAdmin() || isSchoolOwner(schoolId));
        }
      }
    }
  }
}
```

Click **Publish**.

#### Storage Rules

Go to **Storage → Rules** tab and paste contents of `storage.rules`:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /student_photos/{schoolName}/{className}/{fileName} {
      allow read: if true;
      allow write: if request.auth != null &&
        request.resource.size < 5 * 1024 * 1024 &&
        request.resource.contentType.matches('image/.*');
      allow delete: if request.auth != null;
    }

    match /teacher_photos/{schoolName}/{fileName} {
      allow read: if true;
      allow write: if request.auth != null &&
        request.resource.size < 5 * 1024 * 1024 &&
        request.resource.contentType.matches('image/.*');
      allow delete: if request.auth != null;
    }
  }
}
```

Click **Publish**.

### Step 5: Create Admin Account

1. Go to **Firebase Console → Authentication → Users**
2. Click **"Add user"** with your desired email/password
3. Copy the **User UID**
4. Go to **Firestore Database → users collection**
5. Create document with Document ID = Admin's UID:
   ```
   role: "admin"
   email: "admin@yourdomain.com"
   createdAt: (current timestamp)
   ```

### Step 6: Test Locally

```bash
# Using Python
python -m http.server 3000

# OR using Node.js
npx serve .

# Then open http://localhost:3000
```

### Step 7: Deploy to Production

```bash
# Install Firebase CLI
npm install -g firebase-tools
firebase login
firebase init

# Deploy rules first, then hosting
firebase deploy --only firestore:rules,storage
firebase deploy --only hosting
```

---

## 📖 Usage Guide

### 🧑‍💻 Admin Workflow

| Action | How To |
|--------|--------|
| **Login** | Go to `index.html`, enter admin email/password |
| **Create School** | Admin Panel → "Add New School" → Enter details |
| **View All Students** | Admin Panel → "View All Students" |
| **Export Schools** | Admin Panel → "Export" button |
| **Disable School** | Toggle "Active" switch in school list |

### 🏫 School Workflow

| Action | How To |
|--------|--------|
| **Create Student ID** | Dashboard → "Create New ID" → Fill form → Save |
| **Create Teacher ID** | Dashboard → "Create New ID" → Switch to Teacher/Staff tab → Fill form → Save |
| **View Students** | Dashboard → "View Students" → Search/filter/edit/delete |
| **View Teachers** | Dashboard → "Teacher / Staff" → Search/edit/delete |
| **Import Students** | Students page → "Import" → Upload CSV/Excel |
| **Promote Students** | Students page → "Promote Students" tab → Select → Promote |
| **Print Student IDs** | Students page → Select → "Print" |
| **Print Teacher IDs** | Teacher page → Select → "Print" |
| **Export Data** | Students page → "Export CSV" |
| **Download Photos** | Students page → "Download ZIP" |

### 🖨️ Printing Guide

1. Select students/teachers with checkboxes
2. Click **"🖨️ Print"**
3. Print page opens with A4 layout
4. Press **Ctrl+P** or click **"Print"** button
5. Choose **"Save as PDF"** for digital copies

---

## 🔒 Security

### Data Isolation

Each school's data is completely isolated:

- Students: `schools/{schoolId}/classes/{className}/students/{studentId}`
- Teachers: `schools/{schoolId}/teachers/{teacherId}`
- Pending Students: `schools/{schoolId}/pending_students/{studentId}`
- Counters: `schools/{schoolId}/counters/{year}`

### Validation Rules

| Collection | Validated Fields |
|-----------|-----------------|
| **Students** | name, father, class, section, mobile (10-digit), schoolId |
| **Teachers** | name, designation, fatherName, dob, mobile (10-digit) |
| **Pending Students** | name, class |
| **Counters** | count ≥ 0, teacherCount ≥ 0, no extra fields |

### Cloud Functions

| Function | Trigger | Action |
|----------|---------|--------|
| `permanentDeleteSchool` | Called from admin panel | Deletes Firebase Auth user + users doc for permanent school deletion |

---

## 🌐 Browser Support

| Browser | Version |
|---------|---------|
| Chrome | 90+ |
| Firefox | 88+ |
| Safari | 14+ |
| Edge | 90+ |

---

## 📝 License

MIT License — Free for personal and commercial use.

---

> Built with ❤️ by RK Choice — Simplifying ID Card Management for Schools.