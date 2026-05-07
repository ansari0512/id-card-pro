# 🎓 RK Choice ID Card System

A modern, **production-ready** Student ID Card Management System built with Firebase. Designed for schools and educational institutes to create, manage, and print professional ID cards with zero infrastructure cost.

**✨ Now with Professional Architecture & Mobile-First Design!**

---

## 🏢 Professional Architecture

### 📁 Modular Structure
```
src/
├── styles/           # Modular CSS Architecture
│   ├── variables.css   # Design tokens & themes
│   ├── base.css        # Reset & typography
│   ├── buttons.css     # Button components
│   ├── forms.css       # Form components
│   ├── components.css  # UI components
│   ├── navigation.css  # Navigation & topbar
│   ├── utilities.css   # Helper classes
│   ├── performance.css # Optimizations
│   ├── components/     # Component-specific styles
│   │   └── modal.css
│   └── pages/          # Page-specific styles
│       ├── dashboard.css
│       ├── login.css
│       ├── admin.css
│       └── print.css
├── services/        # Business Logic Layer
│   ├── firebase.service.js
│   ├── auth.service.js
│   ├── student.service.js
│   └── utility.service.js
├── components/      # Reusable UI components
└── utils/           # Helper utilities
```

### 📱 Mobile-First Design
- **Touch-friendly** interface with 44px+ touch targets
- **Responsive grid** layouts that adapt to any screen size
- **iOS zoom prevention** with proper font sizing
- **Performance optimized** with GPU acceleration
- **Accessibility compliant** with proper contrast and focus states

### ⚡ Performance Features
- **Modular CSS** for faster loading and better caching
- **Service layer architecture** for maintainable code
- **Lazy loading** support for images
- **Print optimizations** for high-quality ID card printing
- **Reduced motion** support for accessibility

---

## 📋 Table of Contents

- [Features](#features)
- [How It Works](#how-it-works)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Setup Guide](#setup-guide)
- [Deployment](#deployment)
- [Usage Guide](#usage-guide)
- [Security](#security)
- [Browser Support](#browser-support)
- [License](#license)

---

## ✨ Features

### For Admin
- ✅ **Create School Accounts** — One-click school registration with auto-generated Firebase credentials
- ✅ **View All Schools** — See total schools, active/inactive counts, and student statistics
- ✅ **Manage Schools** — Activate/deactivate schools remotely
- ✅ **Access All Students** — View and search students across any school
- ✅ **Dashboard Analytics** — Real-time stats on total schools and total students

### For Schools
- ✅ **Student Management** — Add, edit, delete student records with photo upload
- ✅ **Bulk Operations** — Select multiple students for batch printing or deletion
- ✅ **Smart Search & Filter** — Find students instantly by name, ID, or class
- ✅ **Export Data** — Download student data as CSV/Excel
- ✅ **Photo Management** — Bulk download all student photos as ZIP archive
- ✅ **ID Card Preview** — Live preview before saving

### ID Card Printing
- ✅ **Batch Printing** — Print multiple ID cards at once (3 per A4 row)
- ✅ **PDF Export** — Save as PDF directly from browser
- ✅ **Individual Print** — Print single card from student card view
- ✅ **Professional Layout** — Clean, school-branded design with QR code

### User Experience
- ✅ **Dark & Light Themes** — Toggle between dark/light mode (persisted)
- ✅ **Fully Responsive** — Works on desktop, tablet, and mobile
- ✅ **Real-time Updates** — Instant feedback with toast notifications
- ✅ **Secure Authentication** — Role-based access control (Admin vs School)

---

## 🔧 How It Works

### Architecture

```
┌─────────────────┐
│   User (Browser)│
└────────┬────────┘
         │
         ▼
┌─────────────────┐      ┌────────────────────┐
│    Firebase     │◄────►│  Security Rules    │
│  Authentication │      │  (Data Isolation)  │
└────────┬────────┘      └────────────────────┘
         │
         ▼
┌─────────────────┐      ┌────────────────────┐
│   Firestore DB  │◄────►│  Per-School Data   │
│  (Users, Schools│      │   Segregation      │
│   Students)     │      └────────────────────┘
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Firebase Storage│
│  (Student Photos)│
└─────────────────┘
```

### User Roles

| Role | Access | Can Do |
|------|--------|--------|
| **Admin** | `admin-panel.html` | Create/disable schools, view all student data, full system control |
| **School** | `dashboard.html` | Manage own students only, create/print ID cards, export data |

### Authentication Flow

1. User visits `index.html` (login page)
2. Enters email/password
3. System checks user's `role` field in Firestore (`users/{uid}`)
4. Redirects automatically:
   - `admin` → Admin Panel
   - `school` → School Dashboard

### Data Isolation

Each school is identified by their Firebase User UID. Firestore security rules ensure:

- **Schools** can only read/write their own `schools/{schoolId}` and `schools/{schoolId}/students/{studentId}`
- **Admin** can read/write everything
- All data is automatically scoped by `request.auth.uid`

---

## 🚀 Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | HTML5, CSS3 (Modern), Vanilla JavaScript (ES6+) |
| **Backend** | Firebase (Serverless) |
| **Database** | Cloud Firestore (NoSQL) |
| **Auth** | Firebase Authentication (Email/Password) |
| **Storage** | Firebase Storage (Student photos) |
| **Hosting** | Firebase Hosting (or any static host) |
| **Fonts** | Google Fonts (Poppins) |

**No build process required** — pure static files deploy directly.

---

## 📁 Project Structure

```
id-card-pro/
│
├── 📄 index.html              # Login page (role-based redirect)
├── 📄 dashboard.html          # School dashboard (school view)
├── 📄 admin-panel.html        # Admin dashboard (manage schools)
├── 📄 id-form.html            # Create/Edit student + ID card form
├── 📄 students.html           # Manage students (view/edit/delete/bulk)
├── 📄 print.html              # Print ID cards (A4 layout)
│
├── 🗂️ css/
│   └── style.css              # All styles + dark/light theme
│
├── 🗂️ js/
│   ├── firebase-config.js     # Firebase project configuration
│   ├── auth.controller.js     # Login, logout, role detection
│   ├── dashboard.controller.js# School dashboard logic
│   ├── admin.controller.js    # Admin panel logic
│   ├── student.controller.js  # Student CRUD operations
│   ├── id-form.controller.js  # ID card creation + QR generator
│   ├── print.controller.js    # Print page logic
│   └── helpers.js             # Utility functions (CSV export, ZIP, etc.)
│
├── 🔒 firestore.rules         # Firestore security rules
├── 🗂️ storage.rules           # Firebase Storage security rules
├── 📘 firebase.json           # Firebase Hosting config
│
├── 🗂️ .firebase/              # Firebase CLI cache (gitignored)
├── 📄 package.json            # Dev tools (local server only)
│
└── 📖 README.md               # This file
```

---

## 🛠️ Setup Guide

Follow these steps to set up the system on your own Firebase project.

### Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Add project"**
3. Enter project name: `rk-choice-id` (or any name)
4. Enable Google Analytics (optional)
5. Click **Create project**

### Step 2: Enable Firebase Services

In your Firebase project, enable these services:

#### 1. Authentication
- Navigate to **Authentication → Sign-in method**
- Enable **Email/Password** provider
- (Optional: Enable Google Sign-In)

#### 2. Firestore Database
- Click **Create database**
- Start in **test mode** (we'll secure it with rules later)
- Choose a location closest to your users

#### 3. Storage
- Navigate to **Storage**
- Click **Get started**
- Accept default settings (test mode, then secure with rules)

### Step 3: Get Firebase Configuration

1. In Firebase Console, go to **Project Settings** (gear icon)
2. Scroll to **"Your apps"** section
3. Click **Web** icon (`</>`) to add a web app
4. Name it: `rk-choice-id-web` (or skip nickname)
5. Don't enable Firebase Hosting yet (optional)
6. Copy the **config object** (it looks like this):

```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project",
  storageBucket: "your-project.firebasestorage.app",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

7. Open `js/firebase-config.js`
8. Replace the entire content with your config values:

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

⚠️ **Important** — Security rules protect your data. Deploy them before adding any users.

#### Firestore Rules

1. Go to **Firestore Database → Rules** tab
2. Delete any existing rules
3. Copy & paste the contents of `firestore.rules` file:

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
             request.resource.data.section is string &&
             request.resource.data.mobile is string &&
             request.resource.data.mobile.size() == 10;
    }

    // ── Users ──────────────────────────────────────────────
    match /users/{uid} {
      allow read:  if request.auth != null && request.auth.uid == uid;
      allow write: if request.auth != null &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }

    // ── Schools ────────────────────────────────────────────
    match /schools/{schoolId} {
      allow read:  if isLoggedIn() && (isAdmin() || isSchoolOwner(schoolId));
      allow write: if isAdmin();

      // ── Classes subcollection ──────────────────────────
      match /classes/{className} {
        allow read:  if isLoggedIn() && (isAdmin() || isSchoolOwner(schoolId));
        allow write: if isLoggedIn() && (isAdmin() || isSchoolOwner(schoolId));

        // ── Students subcollection ─────────────────────
        match /students/{studentId} {
          allow read: if isLoggedIn() && (isAdmin() || isSchoolOwner(schoolId));

          allow create: if isLoggedIn() &&
            isSchoolOwner(schoolId) &&
            validStudentData() &&
            request.resource.data.class == className &&
            request.resource.data.schoolId == schoolId;

          allow update: if isLoggedIn() &&
            (isAdmin() || isSchoolOwner(schoolId)) &&
            validStudentData();

          allow delete: if isLoggedIn() && (isAdmin() || isSchoolOwner(schoolId));
        }
      }
    }
  }
}
```

4. Click **Publish**

#### Storage Rules

1. Go to **Storage → Rules** tab
2. Delete any existing rules
3. Copy & paste contents of `storage.rules` file:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /students/{schoolName}/{className}/{fileName} {
      allow read: if request.auth != null;
      allow write: if request.auth != null &&
        request.resource.size < 5 * 1024 * 1024 &&
        request.resource.contentType.matches('image/.*');
      allow delete: if request.auth != null;
    }
  }
}
```

4. Click **Publish**

---

### Step 5: Create Admin Account

You need one admin user to create schools.

#### Option A: Using Firebase Console (Recommended)

1. Go to **Firebase Console → Authentication → Users**
2. Click **"Add user"**
   - Email: `admin@yourdomain.com` (your choice)
   - Password: Choose a strong password
3. After creation, **copy the User UID** (long string like `AbCdEf123...`)

4. Go to **Firestore Database**
5. Create collection: `users` (if it doesn't exist)
6. Add document:
   - Document ID: **Paste the Admin's UID exactly**
   - Fields:
     ```
     role: "admin"
     email: "admin@yourdomain.com"
     createdAt: (set to current timestamp)
     ```
7. Done! You can now login at `index.html`

#### Option B: Using Code (Firebase Extensions or CLI)

If you prefer command-line, use Firebase Admin SDK to create the admin user and set role.

---

### Step 6: Test Locally

#### Option A: Using Firebase Hosting (Easiest)

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize in project folder
firebase init

# Choose:
# - Hosting: Configure files for Firebase Hosting
# - Firestore: Setup rules
# - Storage: Setup rules

# Deploy everything
firebase deploy
```

Your app will be live at: `https://your-project.web.app`

#### Option B: Using a Local Server

Just for testing on your machine:

```bash
# Using Python (no install needed)
python -m http.server 3000

# OR using Node.js
npx serve .

# Then open http://localhost:3000 in browser
```

---

### Step 7: Deploy to Production

#### 1. Deploy Rules First (Security)

```bash
firebase deploy --only firestore:rules,storage
```

#### 2. Deploy Hosting

```bash
firebase deploy --only hosting
```

---

## 📖 Usage Guide

### 🧑‍💻 Admin Workflow

| Action | How To |
|--------|--------|
| **Login** | Go to `index.html`, enter admin email/password |
| **Create School** | Admin Panel → "Add New School" → Enter school name, email, password |
| **Share Credentials** | Give the generated email/password to school principal |
| **View All Students** | Admin Panel → "View All Students" → See every student across all schools |
| **Disable School** | In school list, toggle "Active" switch (prevents login) |
| **Delete School** | Click delete icon (also deletes all student data) |

### 🏫 School Workflow

| Action | How To |
|--------|--------|
| **First Login** | Use credentials from admin → auto-redirect to Dashboard |
| **Create ID Card** | Dashboard → "Create New ID" → Fill form + upload photo → Save |
| **View Students** | Dashboard → "View Students" → Search/filter/edit/delete |
| **Print ID Cards** | In View Students → Check students → "Print Selected" OR click 🖨️ on a card |
| **Export Data** | In View Students → "Export CSV" → Downloads spreadsheet |
| **Download Photos** | In View Students → "Download ZIP" → All student photos in one archive |
| **Logout** | Click "Logout" in top-right corner |

### 🖨️ Printing Guide

1. Go to **View Students**
2. Select students with checkboxes
3. Click **"🖨️ Print Selected"**
4. Print page opens with A4 layout (3 cards per row)
5. Press **Ctrl+P** or click **"Print"** button
6. Choose printer or **"Save as PDF"** to generate digital copies

💡 **Tip:** Use high-quality photo paper (110lb+) for professional prints.

---

## 🔒 Security

### Data Isolation

Every school's data is completely isolated:

- Student records are stored under `schools/{schoolId}/classes/{className}/students/{studentId}`
- Firestore rules prevent cross-school data access
- Photos stored in `storage/students/{schoolId}/{className}/{filename}`

### Admin Privileges

- Admin user is identified by `role: "admin"` in `users/{uid}` document
- Admin can read/write any school's data
- Only admin can create/disable/delete school accounts

### Password Security

- Firebase handles password hashing (bcrypt)
- Minimum 6 characters enforced
- Rate limiting automatically applied by Firebase Auth

### File Upload Security

- Only image files allowed (`.jpg`, `.png`, `.gif`, `.webp`)
- Max file size: 5MB per photo
- Files scanned by Firebase for malware

---

## 🌐 Browser Support

| Browser | Version |
|---------|---------|
| Chrome | 90+ |
| Firefox | 88+ |
| Safari | 14+ |
| Edge | 90+ |

**Note:** Requires JavaScript enabled. Cookies/local storage required for theme persistence.

---

## 📝 License

MIT License — Free for personal and commercial use.

---

## 🙋 Support

For issues or feature requests, please open a GitHub issue.

---

> Built with ❤️ by RK Choice — Simplifying ID Card Management for Schools.
