import { loadStudentFaceDatabase } from './utils/faceRecognition';

// Test function to verify face recognition database loading
async function testFaceRecognitionDatabase() {
  console.log('Testing face recognition database loading...');

  try {
    await loadStudentFaceDatabase();
    console.log('Face recognition database loaded successfully');

    // Check if admin user is included
    const adminUser = (global as any).studentFaceDatabase?.find((student: any) =>
      student.student_name === 'Updated Admin' || student.roll_number === 'admin@institute.edu'
    );

    if (adminUser) {
      console.log('✅ Admin user found in face recognition database:', adminUser.student_name);
      console.log('✅ Photo URL present:', adminUser.photo_url ? 'Yes' : 'No');
    } else {
      console.log('❌ Admin user not found in face recognition database');
    }

    console.log('Total users with photos:', (global as any).studentFaceDatabase?.length || 0);

  } catch (error) {
    console.error('❌ Error testing face recognition:', error);
  }
}

// Run the test
testFaceRecognitionDatabase();