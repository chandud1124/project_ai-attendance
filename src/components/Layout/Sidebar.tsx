import { LayoutDashboard, Users, School, Wifi, Camera, Calendar, ClipboardCheck, Bell, FileText, Settings, LogOut, Activity, Building2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface SidebarProps {
  currentView: string;
  onViewChange: (view: string) => void;
}

export function Sidebar({ currentView, onViewChange }: SidebarProps) {
  const { userProfile, signOut } = useAuth();

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'department_head', 'teacher', 'technical_staff'] },
    { id: 'students', label: 'Students & Staff', icon: Users, roles: ['admin', 'department_head'] },
    { id: 'departments', label: 'Departments', icon: Building2, roles: ['admin', 'department_head'] },
    { id: 'classrooms', label: 'Classrooms', icon: School, roles: ['admin', 'department_head', 'technical_staff'] },
    { id: 'rfid-devices', label: 'RFID Devices', icon: Wifi, roles: ['admin', 'department_head', 'technical_staff'] },
    { id: 'cameras', label: 'Cameras', icon: Camera, roles: ['admin', 'department_head', 'technical_staff'] },
    { id: 'timetable', label: 'Timetable', icon: Calendar, roles: ['admin', 'department_head', 'teacher'] },
    { id: 'attendance', label: 'Attendance', icon: ClipboardCheck, roles: ['admin', 'department_head', 'teacher'] },
    { id: 'alerts', label: 'Alerts', icon: Bell, roles: ['admin', 'department_head', 'teacher', 'technical_staff'] },
    { id: 'reports', label: 'Reports', icon: FileText, roles: ['admin', 'department_head', 'teacher'] },
    { id: 'logs', label: 'Audit Logs', icon: Activity, roles: ['admin'] },
    { id: 'settings', label: 'Settings', icon: Settings, roles: ['admin'] },
  ];

  const filteredMenuItems = menuItems.filter(item =>
    userProfile && item.roles.includes(userProfile.role)
  );

  return (
    <div className="h-screen w-64 bg-slate-900 text-white flex flex-col">
      <div className="p-6 border-b border-slate-800">
        <h1 className="text-2xl font-bold">RFID Attendance</h1>
        <p className="text-sm text-slate-400 mt-1">AI-Powered System</p>
      </div>

      <nav className="flex-1 overflow-y-auto p-4">
        {filteredMenuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg mb-2 transition-colors ${
                isActive ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Icon size={20} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <div className="flex items-center gap-3 px-4 py-3 mb-2">
          <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-sm font-semibold">
            {userProfile?.full_name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-medium truncate">{userProfile?.full_name}</p>
            <p className="text-xs text-slate-400 capitalize">{userProfile?.role.replace('_', ' ')}</p>
          </div>
        </div>
        <button
          onClick={() => signOut()}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-slate-300 hover:bg-slate-800 transition-colors"
        >
          <LogOut size={20} />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
}
