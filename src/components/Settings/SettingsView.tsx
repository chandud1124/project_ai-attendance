import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Settings, Shield, Camera, Wifi, Bell, Save, AlertCircle } from 'lucide-react';
import { AttendanceConfig, DEFAULT_CONFIG, AuthMode } from '../../utils/attendanceEngine';

export function AttendanceView() { return <div className="space-y-6"><h2 className="text-2xl font-bold text-slate-900">Attendance Management</h2><div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200"><p className="text-slate-600">Attendance tracking and verification</p></div></div>; }
export function AlertsView() { return <div className="space-y-6"><h2 className="text-2xl font-bold text-slate-900">Alerts & Notifications</h2><div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200"><p className="text-slate-600">System alerts and notifications center</p></div></div>; }
export function ReportsView() { return <div className="space-y-6"><h2 className="text-2xl font-bold text-slate-900">Reports & Analytics</h2><div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200"><p className="text-slate-600">Analytics and reporting dashboard</p></div></div>; }

export function SettingsView() {
  const [config, setConfig] = useState<AttendanceConfig>(DEFAULT_CONFIG);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const response = await supabase.from('settings')
        .select('*')
        .eq('key', 'attendance_config')
        .single();
      
      if (response.data?.value) {
        setConfig(JSON.parse(response.data.value));
      }
    } catch (error) {
      console.error('Error loading config:', error);
    }
  };

  const saveConfig = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const existing = await supabase.from('settings')
        .select('id')
        .eq('key', 'attendance_config')
        .single();

      if (existing.data) {
        await supabase.from('settings')
          .update({ value: JSON.stringify(config) })
          .eq('key', 'attendance_config');
      } else {
        await supabase.from('settings')
          .insert([{ key: 'attendance_config', value: JSON.stringify(config) }]);
      }
      
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Error saving config:', error);
      alert('Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const authModes: { value: AuthMode; label: string; description: string; icon: any }[] = [
    {
      value: 'rfid_only',
      label: 'RFID Only',
      description: 'Students marked present with RFID card tap only. Fast but less secure.',
      icon: Wifi,
    },
    {
      value: 'face_only',
      label: 'Face Recognition Only',
      description: 'Uses AI face detection only. No RFID cards needed.',
      icon: Camera,
    },
    {
      value: 'dual_auth',
      label: 'Dual Authentication (Recommended)',
      description: 'RFID tap triggers face verification. Maximum security.',
      icon: Shield,
    },
    {
      value: 'rfid_or_face',
      label: 'RFID or Face',
      description: 'Either method is sufficient. Flexible attendance marking.',
      icon: Shield,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
            <Settings className="text-white" size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Attendance Settings</h2>
            <p className="text-sm text-slate-600">Configure authentication mode and behavior</p>
          </div>
        </div>
      </div>

      {/* Authentication Mode */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Shield size={20} className="text-blue-600" />
          Authentication Mode
        </h3>
        
        <div className="space-y-3">
          {authModes.map((mode) => {
            const Icon = mode.icon;
            return (
              <label
                key={mode.value}
                className={`flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  config.mode === mode.value
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-slate-200 hover:border-blue-300'
                }`}
              >
                <input
                  type="radio"
                  name="auth_mode"
                  value={mode.value}
                  checked={config.mode === mode.value}
                  onChange={(e) => setConfig({ ...config, mode: e.target.value as AuthMode })}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Icon size={18} className="text-blue-600" />
                    <span className="font-semibold text-slate-900">{mode.label}</span>
                  </div>
                  <p className="text-sm text-slate-600 mt-1">{mode.description}</p>
                </div>
              </label>
            );
          })}
        </div>
      </div>

      {/* Face Recognition Settings */}
      {(config.mode === 'dual_auth' || config.mode === 'face_only' || config.mode === 'rfid_or_face') && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Camera size={20} className="text-purple-600" />
            Face Recognition Settings
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Face Detection Retry Count
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={config.face_retry_count}
                onChange={(e) => setConfig({ ...config, face_retry_count: parseInt(e.target.value) })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-slate-500 mt-1">
                Number of times to retry face detection after RFID tap (1-10)
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Retry Interval (milliseconds)
              </label>
              <input
                type="number"
                min="1000"
                max="30000"
                step="1000"
                value={config.face_retry_interval_ms}
                onChange={(e) => setConfig({ ...config, face_retry_interval_ms: parseInt(e.target.value) })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-slate-500 mt-1">
                Time between retry attempts (1000ms = 1 second)
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Face Match Threshold
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={config.face_match_threshold}
                  onChange={(e) => setConfig({ ...config, face_match_threshold: parseFloat(e.target.value) })}
                  className="flex-1"
                />
                <span className="font-mono text-sm font-semibold text-blue-600 min-w-[3rem]">
                  {(config.face_match_threshold * 100).toFixed(0)}%
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Minimum confidence required for face match (higher = stricter)
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Failure Handling */}
      {config.mode === 'dual_auth' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <AlertCircle size={20} className="text-orange-600" />
            Failure Handling
          </h3>

          <div className="space-y-4">
            <label className="flex items-start gap-3 p-4 border border-slate-200 rounded-lg cursor-pointer hover:border-blue-300">
              <input
                type="checkbox"
                checked={config.auto_mark_rfid_only}
                onChange={(e) => setConfig({ ...config, auto_mark_rfid_only: e.target.checked })}
                className="mt-1"
              />
              <div>
                <div className="font-semibold text-slate-900">Auto-mark with RFID only</div>
                <p className="text-sm text-slate-600 mt-1">
                  If face detection fails after all retries, mark student as present anyway using RFID verification.
                </p>
              </div>
            </label>

            <label className="flex items-start gap-3 p-4 border border-slate-200 rounded-lg cursor-pointer hover:border-blue-300">
              <input
                type="checkbox"
                checked={config.notify_on_failure}
                onChange={(e) => setConfig({ ...config, notify_on_failure: e.target.checked })}
                className="mt-1"
              />
              <div>
                <div className="font-semibold text-slate-900 flex items-center gap-2">
                  <Bell size={16} />
                  Send notifications on failure
                </div>
                <p className="text-sm text-slate-600 mt-1">
                  Notify period teacher, class teacher, and admin when face verification fails.
                </p>
              </div>
            </label>
          </div>
        </div>
      )}

      {/* Save Button */}
      <div className="flex items-center gap-4">
        <button
          onClick={saveConfig}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-50"
        >
          <Save size={20} />
          {saving ? 'Saving...' : 'Save Configuration'}
        </button>
        
        {saved && (
          <div className="flex items-center gap-2 text-green-600">
            <div className="w-2 h-2 bg-green-600 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium">Configuration saved successfully!</span>
          </div>
        )}
      </div>

      {/* Current Configuration Summary */}
      <div className="bg-gradient-to-br from-slate-50 to-blue-50 rounded-xl p-6 border border-slate-200">
        <h4 className="font-bold text-slate-900 mb-3">Current Configuration</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <div className="text-slate-600">Mode</div>
            <div className="font-semibold text-slate-900 capitalize">{config.mode.replace('_', ' ')}</div>
          </div>
          <div>
            <div className="text-slate-600">Retry Count</div>
            <div className="font-semibold text-slate-900">{config.face_retry_count}</div>
          </div>
          <div>
            <div className="text-slate-600">Threshold</div>
            <div className="font-semibold text-slate-900">{(config.face_match_threshold * 100).toFixed(0)}%</div>
          </div>
          <div>
            <div className="text-slate-600">Auto-mark</div>
            <div className="font-semibold text-slate-900">{config.auto_mark_rfid_only ? 'Yes' : 'No'}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

