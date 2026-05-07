/**
 * Student Service
 * Handles all student-related operations
 */

class StudentService {
  constructor() {
    this.firebaseService = window.firebaseService;
    this.authService = window.authService;
  }

  // Generate unique student ID
  async generateStudentId(schoolId) {
    const year = new Date().getFullYear();
    
    // Get school code
    let schoolCode = 'SCH';
    try {
      const school = await this.firebaseService.getSchool(schoolId);
      if (school && school.schoolName) {
        schoolCode = school.schoolName
          .split(/\s+/)
          .filter(word => word.length > 0)
          .map(word => word[0].toUpperCase())
          .join('')
          .slice(0, 4) || 'SCH';
      }
    } catch (error) {
      console.warn('Failed to get school code:', error);
    }

    // Get next serial number
    const serialNumber = await this.firebaseService.getNextStudentNumber(schoolId);
    
    return `${schoolCode}-${year}-${String(serialNumber).padStart(4, '0')}`;
  }

  // Upload student photo
  async uploadPhoto(schoolId, studentId, file, className, studentName) {
    try {
      // Get school name for path
      let schoolName = 'School';
      try {
        const school = await this.firebaseService.getSchool(schoolId);
        if (school && school.schoolName) {
          schoolName = school.schoolName;
        }
      } catch (error) {
        console.warn('Failed to get school name for photo path');
      }

      // Sanitize path components
      const safeSchoolName = schoolName.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '');
      const safeClassName = (className || 'Unknown').replace(/[^a-zA-Z0-9 _-]/g, '');
      const safeStudentName = (studentName || studentId).replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '');
      
      // Determine file extension
      const extension = file.type.includes('png') ? 'png' : 'jpg';
      
      // Create storage path
      const path = `student_photos/${safeSchoolName}/${safeClassName}/${safeStudentName}_${studentId}.${extension}`;
      
      // Upload file
      return await this.firebaseService.uploadFile(path, file, {
        contentType: file.type
      });
    } catch (error) {
      throw new Error('Photo upload failed: ' + error.message);
    }
  }

  // Create new student
  async createStudent(studentData, photoFile) {
    try {
      const user = this.authService.getUser();
      if (!user) throw new Error('User not authenticated');

      // Generate student ID
      const studentId = await this.generateStudentId(user.uid);
      
      // Upload photo if provided
      let photoUrl = null;
      if (photoFile) {
        photoUrl = await this.uploadPhoto(
          user.uid, 
          studentId, 
          photoFile, 
          studentData.class, 
          studentData.name
        );
      }

      // Prepare student document
      const studentDoc = {
        ...studentData,
        id: studentId,
        photo: photoUrl,
        schoolId: user.uid,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      // Save to Firestore
      const docRef = await this.firebaseService.createStudent(
        user.uid, 
        studentData.class, 
        studentDoc
      );

      return { docId: docRef.id, ...studentDoc };
    } catch (error) {
      throw new Error('Failed to create student: ' + error.message);
    }
  }

  // Update existing student
  async updateStudent(docId, className, updates, photoFile = null) {
    try {
      const user = this.authService.getUser();
      if (!user) throw new Error('User not authenticated');

      // Upload new photo if provided
      if (photoFile) {
        const photoUrl = await this.uploadPhoto(
          user.uid,
          updates.id || docId,
          photoFile,
          updates.class || className,
          updates.name
        );
        updates.photo = photoUrl;
      }

      updates.updatedAt = Date.now();

      // Update in Firestore
      await this.firebaseService.updateStudent(user.uid, className, docId, updates);
      
      return true;
    } catch (error) {
      throw new Error('Failed to update student: ' + error.message);
    }
  }

  // Delete student
  async deleteStudent(docId, className) {
    try {
      const user = this.authService.getUser();
      if (!user) throw new Error('User not authenticated');

      await this.firebaseService.deleteStudent(user.uid, className, docId);
      return true;
    } catch (error) {
      throw new Error('Failed to delete student: ' + error.message);
    }
  }

  // Get all students for current school
  async getAllStudents(filters = {}) {
    try {
      const user = this.authService.getUser();
      if (!user) throw new Error('User not authenticated');

      return await this.firebaseService.getAllStudents(user.uid, filters);
    } catch (error) {
      throw new Error('Failed to load students: ' + error.message);
    }
  }

  // Get students for admin (all schools)
  async getAllStudentsForAdmin(schoolId = null, filters = {}) {
    try {
      if (!this.authService.isAdmin()) {
        throw new Error('Admin access required');
      }

      if (schoolId) {
        return await this.firebaseService.getAllStudents(schoolId, filters);
      }

      // Get all schools and their students
      const schools = await this.firebaseService.getAllSchools();
      const allStudents = [];

      for (const school of schools) {
        try {
          const students = await this.firebaseService.getAllStudents(school.id, filters);
          students.forEach(student => {
            student.schoolName = school.schoolName;
            student.schoolEmail = school.email;
          });
          allStudents.push(...students);
        } catch (error) {
          console.warn(`Failed to load students for school ${school.id}:`, error);
        }
      }

      return allStudents.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    } catch (error) {
      throw new Error('Failed to load students: ' + error.message);
    }
  }

  // Validate student data
  validateStudentData(data) {
    const errors = [];

    if (!data.name || data.name.trim().length === 0) {
      errors.push('Student name is required');
    }

    if (!data.father || data.father.trim().length === 0) {
      errors.push('Father name is required');
    }

    if (!data.class) {
      errors.push('Class is required');
    }

    if (!data.section) {
      errors.push('Section is required');
    }

    if (!data.mobile || !/^\d{10}$/.test(data.mobile)) {
      errors.push('Valid 10-digit mobile number is required');
    }

    return errors;
  }

  // Import students from CSV data
  async importFromCSV(csvData) {
    try {
      const user = this.authService.getUser();
      if (!user) throw new Error('User not authenticated');

      const results = {
        success: 0,
        failed: 0,
        errors: []
      };

      for (const row of csvData) {
        try {
          // Validate row data
          const errors = this.validateStudentData(row);
          if (errors.length > 0) {
            results.failed++;
            results.errors.push(`Row ${results.success + results.failed}: ${errors.join(', ')}`);
            continue;
          }

          // Generate student ID
          const studentId = await this.generateStudentId(user.uid);

          // Create student document (without photo)
          const studentDoc = {
            ...row,
            id: studentId,
            photo: null, // Will be added later
            schoolId: user.uid,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            imported: true
          };

          // Save to Firestore
          await this.firebaseService.createStudent(user.uid, row.class, studentDoc);
          results.success++;
        } catch (error) {
          results.failed++;
          results.errors.push(`Row ${results.success + results.failed}: ${error.message}`);
        }
      }

      return results;
    } catch (error) {
      throw new Error('CSV import failed: ' + error.message);
    }
  }
}

// Global Student Service Instance
window.studentService = new StudentService();