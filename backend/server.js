import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import { randomBytes } from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const DB_FILE = './database.json';

// Middleware
app.use(cors());
app.use(express.json());

// Generate UUID
const generateId = () => randomBytes(16).toString('hex');

// Load database from file
let db = {
  users: [],
  departments: [],
  classrooms: [],
  rfid_devices: [],
  cameras: [],
  students: [],
  timetable: [],
  attendance: [],
  audit_logs: [],
  device_health_logs: [],
  settings: []
};

// Load database
if (fs.existsSync(DB_FILE)) {
  try {
    db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    console.log('✅ Database loaded successfully');
  } catch (error) {
    console.error('❌ Error loading database:', error);
  }
} else {
  // Initialize with demo data
  const hashedPasswords = {
    admin: bcrypt.hashSync('Admin@123', 10),
    dept: bcrypt.hashSync('Dept@123', 10),
    teacher: bcrypt.hashSync('Teacher@123', 10),
    student: bcrypt.hashSync('Student@123', 10),
    tech: bcrypt.hashSync('Tech@123', 10)
  };

  db.departments.push({
    id: generateId(),
    name: 'Computer Science',
    code: 'CS',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  });

  const deptId = db.departments[0].id;

  db.users.push(
    {
      id: generateId(),
      email: 'admin@institute.edu',
      password_hash: hashedPasswords.admin,
      full_name: 'System Administrator',
      role: 'admin',
      department_id: deptId,
      phone: '+1234567890',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: generateId(),
      email: 'dept@institute.edu',
      password_hash: hashedPasswords.dept,
      full_name: 'Department Head',
      role: 'department_head',
      department_id: deptId,
      phone: '+1234567891',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: generateId(),
      email: 'teacher@institute.edu',
      password_hash: hashedPasswords.teacher,
      full_name: 'John Teacher',
      role: 'teacher',
      department_id: deptId,
      phone: '+1234567892',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: generateId(),
      email: 'student@institute.edu',
      password_hash: hashedPasswords.student,
      full_name: 'Jane Student',
      role: 'student',
      department_id: deptId,
      phone: '+1234567893',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: generateId(),
      email: 'tech@institute.edu',
      password_hash: hashedPasswords.tech,
      full_name: 'Technical Support',
      role: 'technical_staff',
      department_id: deptId,
      phone: '+1234567894',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  );

  saveDB();
  console.log('✅ Database initialized with demo data');
}

// Save database to file
function saveDB() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
  } catch (error) {
    console.error('Error saving database:', error);
  }
}

// Auth middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// ==================== AUTH ROUTES ====================

// Login
app.post('/api/auth/login', (req, res) => {
  try {
    const { email, password } = req.body;

    const user = db.users.find(u => u.email === email && u.is_active);

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isPasswordValid = bcrypt.compareSync(password, user.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    const { password_hash, ...userWithoutPassword } = user;

    res.json({
      user: userWithoutPassword,
      session: {
        access_token: token,
        user: userWithoutPassword
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get current user
app.get('/api/auth/me', authenticateToken, (req, res) => {
  try {
    const user = db.users.find(u => u.id === req.user.userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { password_hash, ...userWithoutPassword } = user;
    res.json({ user: userWithoutPassword });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Logout
app.post('/api/auth/logout', (req, res) => {
  res.json({ message: 'Logged out successfully' });
});

// ==================== DEPARTMENTS ====================

app.get('/api/departments', authenticateToken, (req, res) => {
  res.json(db.departments);
});

// ==================== CLASSROOMS ====================

app.get('/api/classrooms', authenticateToken, (req, res) => {
  res.json(db.classrooms);
});

app.post('/api/classrooms', authenticateToken, (req, res) => {
  try {
    const { name, building, floor, capacity, department_id } = req.body;
    const newClassroom = {
      id: generateId(),
      name,
      building,
      floor,
      capacity: capacity || null,
      department_id: department_id || null,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    db.classrooms.push(newClassroom);
    saveDB();
    res.status(201).json(newClassroom);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.patch('/api/classrooms/:id', authenticateToken, (req, res) => {
  try {
    const index = db.classrooms.findIndex(c => c.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: 'Classroom not found' });
    }
    db.classrooms[index] = {
      ...db.classrooms[index],
      ...req.body,
      updated_at: new Date().toISOString()
    };
    saveDB();
    res.json(db.classrooms[index]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/classrooms/:id', authenticateToken, (req, res) => {
  try {
    const index = db.classrooms.findIndex(c => c.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: 'Classroom not found' });
    }
    db.classrooms.splice(index, 1);
    saveDB();
    res.json({ message: 'Classroom deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== RFID DEVICES ====================

app.get('/api/rfid-devices', authenticateToken, (req, res) => {
  res.json(db.rfid_devices);
});

app.post('/api/rfid-devices', authenticateToken, (req, res) => {
  try {
    const { device_id, device_name, classroom_id } = req.body;
    const secretKey = randomBytes(32).toString('hex');
    
    const newDevice = {
      id: generateId(),
      device_id,
      device_name,
      classroom_id: classroom_id || null,
      secret_key: secretKey,
      is_active: true,
      last_heartbeat: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    db.rfid_devices.push(newDevice);
    saveDB();
    res.status(201).json(newDevice);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.patch('/api/rfid-devices/:id', authenticateToken, (req, res) => {
  try {
    const index = db.rfid_devices.findIndex(d => d.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: 'Device not found' });
    }
    db.rfid_devices[index] = {
      ...db.rfid_devices[index],
      ...req.body,
      updated_at: new Date().toISOString()
    };
    saveDB();
    res.json(db.rfid_devices[index]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/rfid-devices/:id', authenticateToken, (req, res) => {
  try {
    const index = db.rfid_devices.findIndex(d => d.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: 'Device not found' });
    }
    db.rfid_devices.splice(index, 1);
    saveDB();
    res.json({ message: 'Device deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== CAMERAS ====================

app.get('/api/cameras', authenticateToken, (req, res) => {
  res.json(db.cameras);
});

app.post('/api/cameras', authenticateToken, (req, res) => {
  try {
    const { camera_id, camera_name, classroom_id, stream_url } = req.body;
    const apiKey = randomBytes(32).toString('hex');
    
    const newCamera = {
      id: generateId(),
      camera_id,
      camera_name,
      classroom_id: classroom_id || null,
      stream_url: stream_url || null,
      api_key: apiKey,
      is_active: true,
      last_heartbeat: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    db.cameras.push(newCamera);
    saveDB();
    res.status(201).json(newCamera);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.patch('/api/cameras/:id', authenticateToken, (req, res) => {
  try {
    const index = db.cameras.findIndex(c => c.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: 'Camera not found' });
    }
    db.cameras[index] = {
      ...db.cameras[index],
      ...req.body,
      updated_at: new Date().toISOString()
    };
    saveDB();
    res.json(db.cameras[index]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/cameras/:id', authenticateToken, (req, res) => {
  try {
    const index = db.cameras.findIndex(c => c.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: 'Camera not found' });
    }
    db.cameras.splice(index, 1);
    saveDB();
    res.json({ message: 'Camera deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== USERS ====================

app.get('/api/users', authenticateToken, (req, res) => {
  const users = db.users.map(({ password_hash, ...user }) => user);
  res.json(users);
});

app.post('/api/users', authenticateToken, (req, res) => {
  try {
    const { email, password, full_name, role, department_id, phone, photo, rfid_card_id, registration_number, class_name } = req.body;

    if (!email || !password || !full_name || !role) {
      return res.status(400).json({ error: 'Email, password, full_name, and role are required' });
    }

    // Check if user already exists
    const existingUser = db.users.find(u => u.email === email);
    if (existingUser) {
      return res.status(409).json({ error: 'User with this email already exists' });
    }

    const password_hash = bcrypt.hashSync(password, 10);

    const newUser = {
      id: generateId(),
      email,
      password_hash,
      full_name,
      role,
      department_id: department_id || null,
      phone: phone || null,
      photo: photo || null,
      rfid_card_id: rfid_card_id || null,
      registration_number: registration_number || null,
      class_name: class_name || null,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    db.users.push(newUser);
    saveDB();

    const { password_hash: _, ...userWithoutPassword } = newUser;
    res.status(201).json(userWithoutPassword);
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: error.message || 'Failed to create user' });
  }
});

app.patch('/api/users/:id', authenticateToken, (req, res) => {
  try {
    const index = db.users.findIndex(u => u.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const updates = { ...req.body };
    if (updates.password) {
      updates.password_hash = bcrypt.hashSync(updates.password, 10);
      delete updates.password;
    }
    
    db.users[index] = {
      ...db.users[index],
      ...updates,
      updated_at: new Date().toISOString()
    };
    saveDB();
    
    const { password_hash: _, ...userWithoutPassword } = db.users[index];
    res.json(userWithoutPassword);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/users/:id', authenticateToken, (req, res) => {
  try {
    const index = db.users.findIndex(u => u.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: 'User not found' });
    }
    db.users.splice(index, 1);
    saveDB();
    res.json({ message: 'User deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== DEPARTMENTS ====================

app.get('/api/departments', authenticateToken, (req, res) => {
  try {
    // Enhance departments with head information and counts
    const enhancedDepartments = db.departments.map(dept => {
      const head = db.users.find(u => u.id === dept.head_id);
      const studentCount = db.users.filter(u => u.department_id === dept.id && u.role === 'student').length;
      const staffCount = db.users.filter(u => u.department_id === dept.id && ['teacher', 'department_head'].includes(u.role)).length;
      
      return {
        ...dept,
        head_name: head ? head.full_name : null,
        student_count: studentCount,
        staff_count: staffCount
      };
    });
    res.json(enhancedDepartments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/departments', authenticateToken, (req, res) => {
  try {
    const { name, code, head_id, description } = req.body;
    
    // Check if code already exists
    const existingDept = db.departments.find(d => d.code === code);
    if (existingDept) {
      return res.status(400).json({ error: 'Department code already exists' });
    }
    
    const newDepartment = {
      id: generateId(),
      name,
      code: code.toUpperCase(),
      head_id: head_id || null,
      description: description || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    db.departments.push(newDepartment);
    saveDB();
    res.status(201).json(newDepartment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.patch('/api/departments/:id', authenticateToken, (req, res) => {
  try {
    const index = db.departments.findIndex(d => d.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: 'Department not found' });
    }
    
    const updates = { ...req.body };
    if (updates.code) {
      updates.code = updates.code.toUpperCase();
      // Check if new code conflicts with another department
      const conflict = db.departments.find(d => d.code === updates.code && d.id !== req.params.id);
      if (conflict) {
        return res.status(400).json({ error: 'Department code already exists' });
      }
    }
    
    db.departments[index] = {
      ...db.departments[index],
      ...updates,
      updated_at: new Date().toISOString()
    };
    saveDB();
    res.json(db.departments[index]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/departments/:id', authenticateToken, (req, res) => {
  try {
    const index = db.departments.findIndex(d => d.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: 'Department not found' });
    }
    
    // Check if department has users
    const hasUsers = db.users.some(u => u.department_id === req.params.id);
    if (hasUsers) {
      return res.status(400).json({ error: 'Cannot delete department with assigned users' });
    }
    
    db.departments.splice(index, 1);
    saveDB();
    res.json({ message: 'Department deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== STUDENTS ====================

app.get('/api/students', authenticateToken, (req, res) => {
  res.json(db.students);
});

app.post('/api/students', authenticateToken, (req, res) => {
  try {
    const newStudent = {
      id: generateId(),
      ...req.body,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    db.students.push(newStudent);
    saveDB();
    res.status(201).json(newStudent);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== TIMETABLE ====================

app.get('/api/timetable', authenticateToken, (req, res) => {
  res.json(db.timetable);
});

app.post('/api/timetable', authenticateToken, (req, res) => {
  try {
    const newEntry = {
      id: generateId(),
      ...req.body,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    db.timetable.push(newEntry);
    saveDB();
    res.status(201).json(newEntry);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.patch('/api/timetable/:id', authenticateToken, (req, res) => {
  try {
    const index = db.timetable.findIndex(t => t.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: 'Timetable entry not found' });
    }
    db.timetable[index] = {
      ...db.timetable[index],
      ...req.body,
      updated_at: new Date().toISOString()
    };
    saveDB();
    res.json(db.timetable[index]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/timetable/:id', authenticateToken, (req, res) => {
  try {
    const index = db.timetable.findIndex(t => t.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: 'Timetable entry not found' });
    }
    db.timetable.splice(index, 1);
    saveDB();
    res.json({ message: 'Timetable entry deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== ATTENDANCE ====================

app.get('/api/attendance', authenticateToken, (req, res) => {
  res.json(db.attendance);
});

app.post('/api/attendance', authenticateToken, (req, res) => {
  try {
    const newRecord = {
      id: generateId(),
      ...req.body,
      created_at: new Date().toISOString()
    };
    db.attendance.push(newRecord);
    saveDB();
    res.status(201).json(newRecord);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== AUDIT LOGS ====================

app.get('/api/audit-logs', authenticateToken, (req, res) => {
  const logs = [...db.audit_logs].sort((a, b) => 
    new Date(b.created_at) - new Date(a.created_at)
  );
  res.json(logs);
});

app.post('/api/audit-logs', authenticateToken, (req, res) => {
  try {
    const newLog = {
      id: generateId(),
      user_id: req.user.userId,
      action: req.body.action,
      entity_type: req.body.entity_type,
      entity_id: req.body.entity_id,
      details: req.body.details || null,
      created_at: new Date().toISOString()
    };
    db.audit_logs.push(newLog);
    saveDB();
    res.status(201).json(newLog);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== DEVICE HEALTH ====================

app.post('/api/device-health-logs', (req, res) => {
  try {
    const newLog = {
      id: generateId(),
      ...req.body,
      created_at: new Date().toISOString()
    };
    db.device_health_logs.push(newLog);
    saveDB();
    res.status(201).json(newLog);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== SETTINGS ====================

app.get('/api/settings', authenticateToken, (req, res) => {
  res.json(db.settings);
});

app.post('/api/settings', authenticateToken, (req, res) => {
  try {
    const { key, value } = req.body;
    const index = db.settings.findIndex(s => s.key === key);
    
    if (index >= 0) {
      db.settings[index] = { key, value, updated_at: new Date().toISOString() };
    } else {
      db.settings.push({ key, value, created_at: new Date().toISOString() });
    }
    saveDB();
    res.json({ key, value });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║   🚀 Local Backend Server Running                          ║
║   📡 Port: ${PORT}                                             ║
║   🗄️  Database: JSON file (database.json)                  ║
║   🔐 JWT Secret: ${JWT_SECRET.substring(0, 20)}...                    ║
║                                                            ║
║   📚 Demo Accounts:                                        ║
║   • admin@institute.edu / Admin@123                        ║
║   • dept@institute.edu / Dept@123                          ║
║   • teacher@institute.edu / Teacher@123                    ║
║   • student@institute.edu / Student@123                    ║
║   • tech@institute.edu / Tech@123                          ║
╚════════════════════════════════════════════════════════════╝
  `);
});
