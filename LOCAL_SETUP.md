# Local Backend Setup Instructions

## 🚀 Quick Start

### 1. Install Backend Dependencies

```bash
cd backend
npm install
```

### 2. Setup Database

```bash
node setup-database.js
```

This will:
- Create SQLite database with all tables
- Create default department (Computer Science)
- Create 5 demo user accounts with passwords

### 3. Start Backend Server

```bash
npm start
```

Or for development with auto-reload:
```bash
npm run dev
```

Backend will run on: **http://localhost:3000**

### 4. Start Frontend (in new terminal)

```bash
cd /Users/chandu/Downloads/project
npm run dev
```

Frontend will run on: **http://localhost:5173**

## 🔐 Login Credentials

All demo accounts are ready to use:

| Role | Email | Password |
|------|-------|----------|
| Super Admin | admin@institute.edu | Admin@123 |
| Dept Admin | dept@institute.edu | Dept@123 |
| Teacher | teacher@institute.edu | Teacher@123 |
| Student | student@institute.edu | Student@123 |
| Technician | tech@institute.edu | Tech@123 |

## 📁 Project Structure

```
project/
├── backend/              # Local Express.js backend
│   ├── server.js        # Main server file
│   ├── setup-database.js # Database setup script
│   ├── database.db      # SQLite database (created after setup)
│   ├── package.json
│   └── .env
├── src/                 # React frontend
│   └── lib/
│       └── supabase.ts  # Updated to use local API
└── .env                 # Frontend environment (updated)
```

## 🔧 Backend API Endpoints

### Authentication
- `POST /api/auth/login` - Login with email/password
- `GET /api/auth/me` - Get current user

### Resources (all require authentication)
- `GET /api/departments` - Get all departments
- `GET /api/classrooms` - Get all classrooms
- `POST /api/classrooms` - Create classroom
- `PATCH /api/classrooms/:id` - Update classroom
- `DELETE /api/classrooms/:id` - Delete classroom
- `GET /api/rfid-devices` - Get all RFID devices
- `POST /api/rfid-devices` - Create RFID device
- `PATCH /api/rfid-devices/:id` - Update RFID device
- `DELETE /api/rfid-devices/:id` - Delete RFID device
- `GET /api/cameras` - Get all cameras
- `POST /api/cameras` - Create camera
- `PATCH /api/cameras/:id` - Update camera
- `DELETE /api/cameras/:id` - Delete camera
- `GET /api/users?role=student` - Get all users/students
- `POST /api/users` - Create user
- `PATCH /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user
- `GET /api/timetable` - Get timetable
- `POST /api/timetable` - Create timetable entry
- `PATCH /api/timetable/:id` - Update timetable entry
- `DELETE /api/timetable/:id` - Delete timetable entry
- `GET /api/audit-logs` - Get audit logs
- `POST /api/device-health-logs` - Create device health log

## 🗄️ Database

- **Type**: SQLite3 (local file-based database)
- **Location**: `backend/database.db`
- **Management**: You can use [DB Browser for SQLite](https://sqlitebrowser.org/) to view/edit data

### Database Tables:
- users
- departments
- classrooms
- rfid_devices
- cameras
- timetable
- audit_logs
- rfid_scans
- device_health_logs
- attendance_records
- alerts

## 🔒 Security Features

- JWT token-based authentication
- Bcrypt password hashing
- Token stored in localStorage
- Protected API routes
- CORS enabled for local development

## 🐛 Troubleshooting

### Backend won't start
```bash
# Check if port 3000 is in use
lsof -i :3000

# Kill process if needed
kill -9 <PID>
```

### Database errors
```bash
# Delete and recreate database
rm backend/database.db
node backend/setup-database.js
```

### Frontend can't connect
- Make sure backend is running on port 3000
- Check `.env` file has: `VITE_API_URL=http://localhost:3000`
- Restart frontend: `npm run dev`

## ✨ Features Working Locally

✅ Login/Logout
✅ Dashboard
✅ RFID Device Management (with secret key modal)
✅ Camera Management (with system camera test)
✅ Classroom Management
✅ Student Management
✅ Timetable Management
✅ Audit Logs
✅ Device Linking
✅ Real-time updates (within same session)

## 🚀 Next Steps

1. **Production Deployment**: Replace SQLite with PostgreSQL or MySQL
2. **Real-time Updates**: Add WebSocket support for live device status
3. **MQTT Integration**: Connect actual RFID readers and cameras
4. **Face Recognition**: Integrate AI model for face verification
5. **Email/SMS**: Add notification services

## 📝 Notes

- SQLite is perfect for local development and testing
- All data is stored locally in `backend/database.db`
- No cloud services or API keys required
- Everything runs on your machine

**Your system is now 100% local and ready to use!** 🎉
