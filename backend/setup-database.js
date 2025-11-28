import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';

const db = new Database('./database.db');

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Create tables
db.exec(`
  -- Users table
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    auth_user_id TEXT UNIQUE,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('super_admin', 'dept_admin', 'teacher', 'student', 'technician')),
    department_id TEXT,
    rfid_card_id TEXT,
    profile_image_url TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  -- Departments table
  CREATE TABLE IF NOT EXISTS departments (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT UNIQUE,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  -- Classrooms table
  CREATE TABLE IF NOT EXISTS classrooms (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    location TEXT,
    capacity INTEGER,
    department_id TEXT,
    floor TEXT,
    block TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (department_id) REFERENCES departments(id)
  );

  -- RFID Devices table
  CREATE TABLE IF NOT EXISTS rfid_devices (
    id TEXT PRIMARY KEY,
    device_name TEXT NOT NULL,
    device_type TEXT NOT NULL,
    mac_address TEXT UNIQUE NOT NULL,
    ip_address TEXT,
    mqtt_topic TEXT,
    secret_key TEXT NOT NULL,
    firmware_version TEXT,
    classroom_id TEXT,
    is_online INTEGER DEFAULT 0,
    last_heartbeat TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (classroom_id) REFERENCES classrooms(id)
  );

  -- Cameras table
  CREATE TABLE IF NOT EXISTS cameras (
    id TEXT PRIMARY KEY,
    camera_name TEXT NOT NULL,
    camera_type TEXT NOT NULL,
    stream_url TEXT NOT NULL,
    resolution TEXT,
    fps INTEGER,
    trigger_mode TEXT,
    classroom_id TEXT,
    is_online INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (classroom_id) REFERENCES classrooms(id)
  );

  -- Timetable table
  CREATE TABLE IF NOT EXISTS timetable (
    id TEXT PRIMARY KEY,
    classroom_id TEXT NOT NULL,
    teacher_id TEXT,
    subject_name TEXT NOT NULL,
    section TEXT,
    day_of_week INTEGER CHECK(day_of_week BETWEEN 0 AND 6),
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (classroom_id) REFERENCES classrooms(id),
    FOREIGN KEY (teacher_id) REFERENCES users(id)
  );

  -- Audit Logs table
  CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    action_type TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    old_values TEXT,
    new_values TEXT,
    ip_address TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  -- RFID Scans table
  CREATE TABLE IF NOT EXISTS rfid_scans (
    id TEXT PRIMARY KEY,
    device_id TEXT NOT NULL,
    rfid_card_id TEXT NOT NULL,
    user_id TEXT,
    scan_timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
    classroom_id TEXT,
    FOREIGN KEY (device_id) REFERENCES rfid_devices(id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (classroom_id) REFERENCES classrooms(id)
  );

  -- Device Health Logs table
  CREATE TABLE IF NOT EXISTS device_health_logs (
    id TEXT PRIMARY KEY,
    device_id TEXT NOT NULL,
    status TEXT,
    signal_strength INTEGER,
    response_time_ms INTEGER,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (device_id) REFERENCES rfid_devices(id)
  );

  -- Attendance Records table
  CREATE TABLE IF NOT EXISTS attendance_records (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    classroom_id TEXT NOT NULL,
    date TEXT NOT NULL,
    time_in TEXT,
    time_out TEXT,
    status TEXT,
    verified_by_face INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (classroom_id) REFERENCES classrooms(id)
  );

  -- Alerts table
  CREATE TABLE IF NOT EXISTS alerts (
    id TEXT PRIMARY KEY,
    alert_type TEXT NOT NULL,
    severity TEXT,
    message TEXT NOT NULL,
    entity_type TEXT,
    entity_id TEXT,
    is_resolved INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
`);

console.log('Database schema created successfully');

// Create default department
const deptId = 'dept-' + Date.now();
const insertDept = db.prepare(`
  INSERT OR IGNORE INTO departments (id, name, code, is_active)
  VALUES (?, ?, ?, 1)
`);
insertDept.run(deptId, 'Computer Science', 'CS');
console.log('Default department created');

// Create demo users
const users = [
  {
    id: 'user-admin-' + Date.now(),
    auth_user_id: 'auth-admin-' + Date.now(),
    email: 'admin@institute.edu',
    password: 'Admin@123',
    full_name: 'System Administrator',
    role: 'super_admin',
    department_id: null
  },
  {
    id: 'user-dept-' + Date.now(),
    auth_user_id: 'auth-dept-' + Date.now(),
    email: 'dept@institute.edu',
    password: 'Dept@123',
    full_name: 'Department Administrator',
    role: 'dept_admin',
    department_id: deptId
  },
  {
    id: 'user-teacher-' + Date.now(),
    auth_user_id: 'auth-teacher-' + Date.now(),
    email: 'teacher@institute.edu',
    password: 'Teacher@123',
    full_name: 'John Teacher',
    role: 'teacher',
    department_id: deptId
  },
  {
    id: 'user-student-' + Date.now(),
    auth_user_id: 'auth-student-' + Date.now(),
    email: 'student@institute.edu',
    password: 'Student@123',
    full_name: 'Jane Student',
    role: 'student',
    department_id: deptId
  },
  {
    id: 'user-tech-' + Date.now(),
    auth_user_id: 'auth-tech-' + Date.now(),
    email: 'tech@institute.edu',
    password: 'Tech@123',
    full_name: 'Technical Support',
    role: 'technician',
    department_id: null
  }
];

const insertUser = db.prepare(`
  INSERT OR IGNORE INTO users (id, auth_user_id, email, password_hash, full_name, role, department_id, is_active)
  VALUES (?, ?, ?, ?, ?, ?, ?, 1)
`);

for (const user of users) {
  const passwordHash = bcrypt.hashSync(user.password, 10);
  insertUser.run(
    user.id,
    user.auth_user_id,
    user.email,
    passwordHash,
    user.full_name,
    user.role,
    user.department_id
  );
  console.log(`Created user: ${user.email}`);
}

console.log('Demo users created successfully');
console.log('\nDatabase setup complete!');

db.close();
