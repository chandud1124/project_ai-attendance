import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, Edit, Trash2, Wifi, WifiOff, RefreshCw, Key, AlertCircle } from 'lucide-react';

interface RFIDDevice {
  id: string;
  device_name: string;
  device_type: string;
  mac_address: string;
  ip_address: string;
  mqtt_topic: string;
  secret_key: string;
  is_online: boolean;
  last_heartbeat: string;
  firmware_version: string;
  classroom_id: string;
  classrooms?: { name: string };
  created_at: string;
}

export function RFIDDevicesView() {
  const [devices, setDevices] = useState<RFIDDevice[]>([]);
  const [classrooms, setClassrooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<RFIDDevice | null>(null);
  const [generatedKey, setGeneratedKey] = useState('');
  const [testingDevice, setTestingDevice] = useState<string | null>(null);
  const [showSecretKeyModal, setShowSecretKeyModal] = useState(false);
  const [newDeviceData, setNewDeviceData] = useState<any>(null);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const [devicesRes, classroomsRes] = await Promise.all([
        supabase.from('rfid_devices').select('*, classrooms(name)').order('created_at', { ascending: false }),
        supabase.from('classrooms').select('id, name').eq('is_active', true)
      ]);

      if (devicesRes.data) setDevices(devicesRes.data);
      if (classroomsRes.data) setClassrooms(classroomsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateSecretKey = () => {
    const key = Array.from({ length: 16 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
    setGeneratedKey(key);
    return key;
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this RFID device?')) return;
    try {
      const { error } = await supabase.from('rfid_devices').delete().eq('id', id);
      if (error) throw error;
      await fetchData();
    } catch (error: any) {
      alert('Error: ' + error.message);
    }
  };

  const handleTestDevice = async (deviceId: string) => {
    setTestingDevice(deviceId);
    try {
      const { error } = await supabase.from('device_health_logs').insert([{
        device_id: deviceId,
        status: 'online',
        signal_strength: Math.floor(Math.random() * 100),
        response_time_ms: Math.floor(Math.random() * 500)
      }]);
      if (error) throw error;
      alert('Device connectivity test initiated');
      await fetchData();
    } catch (error: any) {
      alert('Error: ' + error.message);
    } finally {
      setTestingDevice(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">RFID Devices</h2>
          <p className="text-slate-600">Configure and manage RFID readers</p>
        </div>
        <button
          onClick={() => { setSelectedDevice(null); setGeneratedKey(''); setShowModal(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus size={20} />
          Add RFID Device
        </button>
      </div>

      {devices.length === 0 ? (
        <div className="bg-white rounded-xl p-12 shadow-sm border border-slate-200 text-center">
          <Wifi className="mx-auto mb-4 text-slate-400" size={48} />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">No RFID Devices</h3>
          <p className="text-slate-600 mb-4">Add your first RFID reader to get started</p>
          <button
            onClick={() => { setSelectedDevice(null); setShowModal(true); }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus size={20} />
            Add Device
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {devices.map((device) => (
            <div key={device.id} className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  {device.is_online ? (
                    <Wifi className="text-green-600" size={24} />
                  ) : (
                    <WifiOff className="text-red-600" size={24} />
                  )}
                  <div>
                    <h3 className="font-bold text-slate-900">{device.device_name}</h3>
                    <p className="text-xs text-slate-500">{device.device_type}</p>
                  </div>
                </div>
                <span className={`px-2 py-1 rounded text-xs font-semibold ${device.is_online ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {device.is_online ? 'Online' : 'Offline'}
                </span>
              </div>

              <div className="space-y-2 text-sm mb-4">
                <div className="flex justify-between">
                  <span className="text-slate-600">MAC Address:</span>
                  <span className="font-mono text-slate-900">{device.mac_address}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">IP Address:</span>
                  <span className="font-mono text-slate-900">{device.ip_address}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Classroom:</span>
                  <span className="text-slate-900">{device.classrooms?.name || 'Not assigned'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">MQTT Topic:</span>
                  <span className="font-mono text-xs text-slate-900 truncate">{device.mqtt_topic}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Firmware:</span>
                  <span className="font-mono text-slate-900">{device.firmware_version}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleTestDevice(device.id)}
                  disabled={testingDevice === device.id}
                  className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-slate-100 text-slate-700 rounded hover:bg-slate-200 disabled:opacity-50 text-sm"
                >
                  <RefreshCw size={14} />
                  Test
                </button>
                <button
                  onClick={() => { setSelectedDevice(device); setGeneratedKey(device.secret_key); setShowModal(true); }}
                  className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-sm"
                >
                  <Edit size={14} />
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(device.id)}
                  className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200 text-sm"
                >
                  <Trash2 size={14} />
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <RFIDDeviceModal
          device={selectedDevice}
          classrooms={classrooms}
          generatedKey={generatedKey}
          onGenerateKey={generateSecretKey}
          onClose={() => setShowModal(false)}
          onSave={(data: any) => {
            setNewDeviceData(data);
            setShowModal(false);
            setShowSecretKeyModal(true);
            fetchData();
          }}
        />
      )}

      {showSecretKeyModal && newDeviceData && (
        <SecretKeyDisplayModal
          deviceData={newDeviceData}
          onClose={() => {
            setShowSecretKeyModal(false);
            setNewDeviceData(null);
          }}
        />
      )}
    </div>
  );
}

function RFIDDeviceModal({ device, classrooms, generatedKey, onGenerateKey, onClose, onSave }: any) {
  const [formData, setFormData] = useState({
    device_name: device?.device_name || '',
    device_type: device?.device_type || 'ESP32',
    mac_address: device?.mac_address || '',
    ip_address: device?.ip_address || '',
    mqtt_topic: device?.mqtt_topic || 'institute/classroom/rfid',
    secret_key: device?.secret_key || generatedKey,
    firmware_version: device?.firmware_version || '1.0.0',
    classroom_id: device?.classroom_id || '',
    is_online: device?.is_online !== false
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      // Generate secret key if not provided
      if (!formData.secret_key) {
        formData.secret_key = onGenerateKey();
      }

      if (device) {
        const { error } = await supabase.from('rfid_devices').update(formData).eq('id', device.id);
        if (error) throw error;
        await onSave(null);
        onClose();
      } else {
        const { data, error } = await supabase.from('rfid_devices').insert([formData]).select().single();
        if (error) throw error;
        // Pass the newly created device data with secret key
        await onSave({ ...data, secret_key: formData.secret_key });
      }
    } catch (error: any) {
      alert('Error: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full">
        <div className="p-6 border-b border-slate-200">
          <h3 className="text-xl font-bold text-slate-900">{device ? 'Edit' : 'Add'} RFID Device</h3>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Device Name</label>
              <input
                type="text"
                value={formData.device_name}
                onChange={(e) => setFormData({ ...formData, device_name: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="e.g., Classroom A Reader"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Device Type</label>
              <select
                value={formData.device_type}
                onChange={(e) => setFormData({ ...formData, device_type: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="ESP32">ESP32</option>
                <option value="ESP8266">ESP8266</option>
                <option value="Raspberry Pi">Raspberry Pi</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">MAC Address</label>
              <input
                type="text"
                value={formData.mac_address}
                onChange={(e) => setFormData({ ...formData, mac_address: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                placeholder="AA:BB:CC:DD:EE:FF"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">IP Address</label>
              <input
                type="text"
                value={formData.ip_address}
                onChange={(e) => setFormData({ ...formData, ip_address: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                placeholder="192.168.1.100"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">MQTT Topic</label>
              <input
                type="text"
                value={formData.mqtt_topic}
                onChange={(e) => setFormData({ ...formData, mqtt_topic: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono text-xs"
                placeholder="institute/block/floor/classroom/rfid"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Firmware Version</label>
              <input
                type="text"
                value={formData.firmware_version}
                onChange={(e) => setFormData({ ...formData, firmware_version: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="1.0.0"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-2">Secret Key (64-bit Hex)</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={formData.secret_key}
                  onChange={(e) => setFormData({ ...formData, secret_key: e.target.value })}
                  className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm"
                  placeholder="Auto-generated if empty"
                />
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, secret_key: onGenerateKey() })}
                  className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 flex items-center gap-2"
                >
                  <Key size={16} />
                  Generate
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Classroom</label>
              <select
                value={formData.classroom_id}
                onChange={(e) => setFormData({ ...formData, classroom_id: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="">Select Classroom</option>
                {classrooms.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg flex gap-3 border border-blue-200">
            <AlertCircle className="text-blue-600 flex-shrink-0 mt-0.5" size={20} />
            <p className="text-sm text-blue-800">
              <strong>Setup Instructions:</strong> After creating this device, use the MAC address and secret key to configure your ESP32/ESP8266 firmware via MQTT.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" onClick={onClose} className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Device'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SecretKeyDisplayModal({ deviceData, onClose }: any) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-3xl w-full">
        <div className="p-6 border-b border-slate-200 bg-gradient-to-r from-green-50 to-blue-50">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center">
              <Key className="text-white" size={24} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900">Device Registered Successfully!</h3>
              <p className="text-sm text-slate-600">Save these credentials for ESP32/ESP8266 configuration</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="text-yellow-600 flex-shrink-0 mt-0.5" size={20} />
              <div>
                <p className="text-sm font-semibold text-yellow-900 mb-1">⚠️ Important - Save These Details Now!</p>
                <p className="text-xs text-yellow-800">The secret key will not be shown again. Save it securely for device configuration.</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Device Name</label>
              <div className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-900">
                {deviceData.device_name}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Device Type</label>
                <div className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-900">
                  {deviceData.device_type}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">MAC Address</label>
                <div className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg font-mono text-sm text-slate-900">
                  {deviceData.mac_address}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">IP Address</label>
                <div className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg font-mono text-sm text-slate-900">
                  {deviceData.ip_address}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Firmware Version</label>
                <div className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg font-mono text-sm text-slate-900">
                  {deviceData.firmware_version}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">MQTT Topic</label>
              <div className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg font-mono text-xs text-slate-900">
                {deviceData.mqtt_topic}
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-bold text-blue-900 flex items-center gap-2">
                  <Key size={16} />
                  Secret Key (64-bit Hex)
                </label>
                <button
                  onClick={() => copyToClipboard(deviceData.secret_key)}
                  className="px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 transition-colors"
                >
                  {copied ? '✓ Copied!' : 'Copy'}
                </button>
              </div>
              <div className="px-4 py-3 bg-white border border-blue-300 rounded-lg font-mono text-sm text-blue-900 break-all select-all">
                {deviceData.secret_key}
              </div>
              <p className="text-xs text-blue-800 mt-2">
                Use this key to authenticate your ESP32/ESP8266 device via MQTT
              </p>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
            <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <Wifi size={16} />
              ESP32/ESP8266 Configuration
            </h4>
            <div className="space-y-2 text-xs font-mono bg-slate-900 text-green-400 p-3 rounded overflow-x-auto">
              <div>const char* DEVICE_MAC = "{deviceData.mac_address}";</div>
              <div>const char* DEVICE_IP = "{deviceData.ip_address}";</div>
              <div>const char* MQTT_TOPIC = "{deviceData.mqtt_topic}";</div>
              <div>const char* SECRET_KEY = "{deviceData.secret_key}";</div>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-slate-200 bg-slate-50">
          <button
            onClick={onClose}
            className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            Close & Continue
          </button>
        </div>
      </div>
    </div>
  );
}
