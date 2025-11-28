import React from 'react';
import { Users, CheckCircle, Camera, AlertTriangle } from 'lucide-react';

export function DashboardView() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-1">Dashboard</h2>
        <p className="text-slate-600">Real-time system overview and monitoring</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-lg bg-blue-600">
              <Users size={24} className="text-white" />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-slate-900 mb-1">0</h3>
          <p className="text-sm font-medium text-slate-600">Total Students</p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-lg bg-green-600">
              <CheckCircle size={24} className="text-white" />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-slate-900 mb-1">0%</h3>
          <p className="text-sm font-medium text-slate-600">Attendance Rate</p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-lg bg-purple-600">
              <Camera size={24} className="text-white" />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-slate-900 mb-1">0</h3>
          <p className="text-sm font-medium text-slate-600">Active Devices</p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-lg bg-orange-600">
              <AlertTriangle size={24} className="text-white" />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-slate-900 mb-1">0</h3>
          <p className="text-sm font-medium text-slate-600">Pending Alerts</p>
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
        <h3 className="text-lg font-bold text-slate-900 mb-4">Quick Start</h3>
        <div className="space-y-3">
          <p className="text-slate-600">1. Add departments and classrooms</p>
          <p className="text-slate-600">2. Register students and staff</p>
          <p className="text-slate-600">3. Configure RFID devices and cameras</p>
          <p className="text-slate-600">4. Set up timetable schedules</p>
          <p className="text-slate-600">5. Start monitoring attendance</p>
        </div>
      </div>
    </div>
  );
}
