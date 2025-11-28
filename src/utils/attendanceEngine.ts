/**
 * Attendance Engine - Handles RFID + Face Recognition Dual Authentication
 * Features:
 * - RFID card detection
 * - Face recognition verification
 * - Configurable authentication modes
 * - Notification system for failures
 * - Retry mechanism
 */

export type AuthMode = 'rfid_only' | 'face_only' | 'dual_auth' | 'rfid_or_face';

export interface AttendanceConfig {
  mode: AuthMode;
  face_retry_count: number;
  face_retry_interval_ms: number;
  face_match_threshold: number; // 0-1, confidence threshold
  notify_on_failure: boolean;
  auto_mark_rfid_only: boolean; // If face fails, mark as present anyway
}

export interface RFIDEvent {
  device_id: string;
  card_id: string;
  classroom_id: string;
  timestamp: string;
  student_id?: string;
}

export interface FaceMatchResult {
  matched: boolean;
  confidence: number;
  student_id?: string;
  face_embedding?: number[];
}

export interface AttendanceRecord {
  id: string;
  student_id: string;
  classroom_id: string;
  timetable_id?: string;
  timestamp: string;
  verification_method: 'rfid_only' | 'face_only' | 'dual_verified' | 'rfid_pending';
  rfid_verified: boolean;
  face_verified: boolean;
  status: 'present' | 'pending' | 'failed';
  confidence_score?: number;
  retry_count?: number;
}

export interface NotificationEvent {
  id: string;
  type: 'attendance_failure' | 'face_not_detected' | 'rfid_mismatch';
  student_id: string;
  classroom_id: string;
  timestamp: string;
  message: string;
  recipients: string[]; // user IDs to notify
  severity: 'low' | 'medium' | 'high';
}

// Default configuration
export const DEFAULT_CONFIG: AttendanceConfig = {
  mode: 'dual_auth',
  face_retry_count: 3,
  face_retry_interval_ms: 5000,
  face_match_threshold: 0.75,
  notify_on_failure: true,
  auto_mark_rfid_only: false,
};

/**
 * Process RFID card tap event
 */
export async function processRFIDEvent(
  event: RFIDEvent,
  config: AttendanceConfig,
  apiClient: any
): Promise<AttendanceRecord | null> {
  console.log('Processing RFID event:', event);

  // Find student by RFID card
  const student = await findStudentByRFID(event.card_id, apiClient);
  
  if (!student) {
    console.error('Student not found for RFID:', event.card_id);
    return null;
  }

  const record: AttendanceRecord = {
    id: generateId(),
    student_id: student.id,
    classroom_id: event.classroom_id,
    timestamp: event.timestamp,
    verification_method: 'rfid_only',
    rfid_verified: true,
    face_verified: false,
    status: 'pending',
    retry_count: 0,
  };

  // Check authentication mode
  switch (config.mode) {
    case 'rfid_only':
      // RFID is sufficient
      record.status = 'present';
      record.verification_method = 'rfid_only';
      await saveAttendance(record, apiClient);
      return record;

    case 'face_only':
      // Ignore RFID, wait for face detection
      console.log('Face-only mode, RFID ignored');
      return null;

    case 'dual_auth':
      // RFID detected, now need face verification
      record.verification_method = 'rfid_pending';
      await saveAttendance(record, apiClient);
      
      // Trigger face detection workflow
      await triggerFaceDetection(record, config, apiClient);
      return record;

    case 'rfid_or_face':
      // Either RFID or face is sufficient
      record.status = 'present';
      record.verification_method = 'rfid_only';
      await saveAttendance(record, apiClient);
      return record;

    default:
      return null;
  }
}

/**
 * Trigger face detection after RFID tap
 */
async function triggerFaceDetection(
  record: AttendanceRecord,
  config: AttendanceConfig,
  apiClient: any
): Promise<void> {
  console.log('Triggering face detection for student:', record.student_id);
  
  let retries = 0;
  const maxRetries = config.face_retry_count;

  const attemptFaceVerification = async () => {
    retries++;
    console.log(`Face verification attempt ${retries}/${maxRetries}`);

    // Get camera feed for the classroom
    const cameraFeed = await getCameraFeed(record.classroom_id, apiClient);
    
    if (!cameraFeed) {
      console.error('No camera feed available for classroom:', record.classroom_id);
      await handleFaceDetectionFailure(record, config, apiClient, 'no_camera');
      return;
    }

    // Attempt face detection and matching
    const matchResult = await detectAndMatchFace(
      cameraFeed,
      record.student_id,
      config.face_match_threshold,
      apiClient
    );

    if (matchResult.matched) {
      // Success! Face verified
      console.log('Face verified successfully');
      record.face_verified = true;
      record.status = 'present';
      record.verification_method = 'dual_verified';
      record.confidence_score = matchResult.confidence;
      await updateAttendance(record, apiClient);
    } else if (retries < maxRetries) {
      // Retry after interval
      console.log(`Face not detected, retrying in ${config.face_retry_interval_ms}ms...`);
      setTimeout(attemptFaceVerification, config.face_retry_interval_ms);
    } else {
      // Max retries reached, handle failure
      console.error('Face detection failed after max retries');
      await handleFaceDetectionFailure(record, config, apiClient, 'max_retries');
    }
  };

  // Start first attempt
  attemptFaceVerification();
}

/**
 * Handle face detection failure
 */
async function handleFaceDetectionFailure(
  record: AttendanceRecord,
  config: AttendanceConfig,
  apiClient: any,
  reason: 'no_camera' | 'max_retries' | 'no_match'
): Promise<void> {
  console.log('Handling face detection failure:', reason);

  if (config.auto_mark_rfid_only) {
    // Mark as present anyway (RFID is sufficient)
    record.status = 'present';
    record.verification_method = 'rfid_only';
    record.face_verified = false;
    await updateAttendance(record, apiClient);
  } else {
    // Keep as pending/failed
    record.status = 'failed';
    record.retry_count = config.face_retry_count;
    await updateAttendance(record, apiClient);
  }

  if (config.notify_on_failure) {
    // Send notifications
    await sendFailureNotifications(record, reason, apiClient);
  }
}

/**
 * Send notifications to teachers and admin
 */
async function sendFailureNotifications(
  record: AttendanceRecord,
  reason: string,
  apiClient: any
): Promise<void> {
  console.log('Sending failure notifications');

  // Get student info
  const student = await apiClient.from('users').select('*').eq('id', record.student_id).single();
  
  // Get classroom and timetable info
  const classroom = await apiClient.from('classrooms').select('*').eq('id', record.classroom_id).single();
  
  // Find current period teacher
  const currentPeriod = await getCurrentPeriod(record.classroom_id, apiClient);
  
  const notification: NotificationEvent = {
    id: generateId(),
    type: reason === 'no_camera' ? 'face_not_detected' : 'attendance_failure',
    student_id: record.student_id,
    classroom_id: record.classroom_id,
    timestamp: new Date().toISOString(),
    message: `Attendance verification failed for ${student.data?.full_name || 'Unknown'}. RFID detected but face recognition failed (${reason}).`,
    recipients: [],
    severity: 'medium',
  };

  // Add recipients: period teacher, class teacher, admin
  const recipients = [];
  
  if (currentPeriod?.teacher_id) {
    recipients.push(currentPeriod.teacher_id);
  }
  
  // Get class teacher (department head or assigned teacher)
  if (classroom.data?.assigned_teacher_id) {
    recipients.push(classroom.data.assigned_teacher_id);
  }
  
  // Get admins
  const admins = await apiClient.from('users').select('id').eq('role', 'admin');
  if (admins.data) {
    recipients.push(...admins.data.map((a: any) => a.id));
  }

  notification.recipients = [...new Set(recipients)]; // Remove duplicates

  // Save notification
  await apiClient.from('alerts').insert([notification]);
  
  console.log('Notifications sent to:', notification.recipients);
}

/**
 * Detect face in camera feed and match with student photo
 */
async function detectAndMatchFace(
  _cameraFeed: any,
  studentId: string,
  threshold: number,
  apiClient: any
): Promise<FaceMatchResult> {
  console.log('Attempting face detection and matching...');

  // This is a placeholder - integrate with real face recognition
  // In production, use face-api.js or similar for face embeddings
  
  try {
    // Get student's stored face image
    const student = await apiClient.from('users').select('face_image').eq('id', studentId).single();
    
    if (!student.data?.face_image) {
      console.error('No face image stored for student');
      return { matched: false, confidence: 0 };
    }

    // TODO: Implement actual face recognition
    // 1. Extract face embedding from camera feed (use _cameraFeed)
    // 2. Extract face embedding from stored image
    // 3. Calculate similarity (cosine distance)
    // 4. Compare with threshold
    
    // Simulated result for now
    const simulatedConfidence = Math.random();
    
    return {
      matched: simulatedConfidence >= threshold,
      confidence: simulatedConfidence,
      student_id: studentId,
    };
  } catch (error) {
    console.error('Face matching error:', error);
    return { matched: false, confidence: 0 };
  }
}

/**
 * Helper functions
 */

async function findStudentByRFID(cardId: string, apiClient: any): Promise<any> {
  const response = await apiClient.from('users')
    .select('*')
    .eq('rfid_card_id', cardId)
    .eq('role', 'student')
    .single();
  return response.data;
}

async function saveAttendance(record: AttendanceRecord, apiClient: any): Promise<void> {
  await apiClient.from('attendance').insert([record]);
  console.log('Attendance record saved:', record.id);
}

async function updateAttendance(record: AttendanceRecord, apiClient: any): Promise<void> {
  await apiClient.from('attendance')
    .update({
      status: record.status,
      verification_method: record.verification_method,
      face_verified: record.face_verified,
      confidence_score: record.confidence_score,
      retry_count: record.retry_count,
    })
    .eq('id', record.id);
  console.log('Attendance record updated:', record.id);
}

async function getCameraFeed(classroomId: string, apiClient: any): Promise<any> {
  const response = await apiClient.from('cameras')
    .select('*')
    .eq('classroom_id', classroomId)
    .eq('status', 'online')
    .single();
  return response.data;
}

async function getCurrentPeriod(classroomId: string, apiClient: any): Promise<any> {
  const now = new Date();
  const dayOfWeek = now.toLocaleString('en-US', { weekday: 'long' });
  const currentTime = now.toTimeString().slice(0, 5); // HH:MM

  const response = await apiClient.from('timetable')
    .select('*')
    .eq('classroom_id', classroomId)
    .eq('day_of_week', dayOfWeek)
    .gte('end_time', currentTime)
    .lte('start_time', currentTime)
    .single();
  
  return response.data;
}

function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}
