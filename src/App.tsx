import { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LoginForm } from './components/Auth/LoginForm';
import { Sidebar } from './components/Layout/Sidebar';
import { DashboardView } from './components/Dashboard/DashboardView';
import { StudentsView } from './components/Students/StudentsView';
import { DepartmentsView } from './components/Departments/DepartmentsView';
import { ClassroomsView } from './components/Classrooms/ClassroomsView';
import { RFIDDevicesView } from './components/Devices/RFIDDevicesView';
import { CamerasView } from './components/Devices/CamerasView';
import { TimetableView } from './components/Timetable/TimetableView';
import { AttendanceView } from './components/Attendance/AttendanceView';
import { AlertsView } from './components/Alerts/AlertsView';
import { ReportsView } from './components/Reports/ReportsView';
import { LogsView } from './components/Logs/LogsView';
import { SettingsView } from './components/Settings/SettingsView';

function AppContent() {
  const { user, loading } = useAuth();
  const [currentView, setCurrentView] = useState('dashboard');

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return <LoginForm />;
  }

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <DashboardView />;
      case 'students':
        return <StudentsView />;
      case 'departments':
        return <DepartmentsView />;
      case 'classrooms':
        return <ClassroomsView />;
      case 'rfid-devices':
        return <RFIDDevicesView />;
      case 'cameras':
        return <CamerasView />;
      case 'timetable':
        return <TimetableView />;
      case 'attendance':
        return <AttendanceView />;
      case 'alerts':
        return <AlertsView />;
      case 'reports':
        return <ReportsView />;
      case 'logs':
        return <LogsView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden">
      <Sidebar currentView={currentView} onViewChange={setCurrentView} />
      <main className="flex-1 overflow-y-auto">
        <div className="p-8">
          {renderView()}
        </div>
      </main>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
