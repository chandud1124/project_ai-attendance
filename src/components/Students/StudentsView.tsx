import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, Edit, Trash2, Camera, X, Check, AlertCircle } from 'lucide-react';
import { startFaceDetection, loadFaceDetectionModel } from '../../utils/faceDetection';

export function StudentsView() {
  const [users, setUsers] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [userType, setUserType] = useState<'student' | 'teacher' | 'technical_staff'>('student');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [usersRes, deptRes] = await Promise.all([
        supabase.from('users').select('*, departments(name)').in('role', ['student', 'teacher', 'technical_staff']).order('full_name'),
        supabase.from('departments').select('*').eq('is_active', true)
      ]);
      if (usersRes.data && !usersRes.error) setUsers(usersRes.data);
      if (deptRes.data && !deptRes.error) setDepartments(deptRes.data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this user?')) return;
    try {
      await supabase.from('users').delete().eq('id', id);
      await fetchData();
    } catch (error: any) {
      alert('Error: ' + error.message);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-96"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h2 className="text-2xl font-bold text-slate-900">Students & Staff</h2><p className="text-slate-600">Manage students, teachers, and technical staff</p></div>
        <button onClick={() => { setSelectedUser(null); setShowModal(true); }} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg"><Plus size={20} />Add User</button>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left py-3 px-4">Photo</th>
              <th className="text-left py-3 px-4">Name</th>
              <th className="text-left py-3 px-4">Role</th>
              <th className="text-left py-3 px-4">ID/Reg. Number</th>
              <th className="text-left py-3 px-4">Class/Phone</th>
              <th className="text-left py-3 px-4">Email</th>
              <th className="text-left py-3 px-4">Department</th>
              <th className="text-left py-3 px-4">RFID Card</th>
              <th className="text-left py-3 px-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user: any) => (
              <tr key={user.id} className="border-t hover:bg-slate-50">
                <td className="py-3 px-4">
                  {user.photo ? (
                    <img src={user.photo} alt={user.full_name} className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 text-xs">
                      No Photo
                    </div>
                  )}
                </td>
                <td className="py-3 px-4 font-medium">{user.full_name}</td>
                <td className="py-3 px-4">
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                    user.role === 'student' ? 'bg-blue-100 text-blue-800' :
                    user.role === 'teacher' ? 'bg-green-100 text-green-800' :
                    'bg-purple-100 text-purple-800'
                  }`}>
                    {user.role === 'student' ? 'Student' :
                     user.role === 'teacher' ? 'Teacher' :
                     'Technician'}
                  </span>
                </td>
                <td className="py-3 px-4 font-mono text-sm">{user.registration_number || user.phone || '-'}</td>
                <td className="py-3 px-4">{user.class_name || '-'}</td>
                <td className="py-3 px-4 text-sm text-slate-600">{user.email}</td>
                <td className="py-3 px-4">{user.departments?.name}</td>
                <td className="py-3 px-4 font-mono text-sm">{user.rfid_card_id || '-'}</td>
                <td className="py-3 px-4 flex gap-2">
                  <button
                    onClick={() => { setSelectedUser(user); setShowModal(true); }}
                    className="text-blue-600 hover:bg-blue-50 p-2 rounded"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(user.id)}
                    className="text-red-600 hover:bg-red-50 p-2 rounded"
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {showModal && <StudentModal student={selectedUser} departments={departments} onClose={() => setShowModal(false)} onSave={fetchData} />}
    </div>
  );
}

function StudentModal({ student, departments, onClose, onSave }: any) {
  const [formData, setFormData] = useState({
    full_name: student?.full_name || '',
    email: student?.email || '',
    department_id: student?.department_id || '',
    rfid_card_id: student?.rfid_card_id || '',
    registration_number: student?.registration_number || '',
    class_name: student?.class_name || '',
    phone: student?.phone || '',
    photo: student?.photo || null,
    password: '', // Password is not returned from API for security
    role: student?.role || 'student'
  });
  const [saving, setSaving] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(student?.photo || null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [faceDetected, setFaceDetected] = useState(false);
  const [faceCount, setFaceCount] = useState(0);
  const stopDetectionRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (stopDetectionRef.current) {
        stopDetectionRef.current();
      }
    };
  }, [stream]);

  const startCamera = async () => {
    try {
      setCameraLoading(true);
      console.log('Requesting camera access...');
      console.log('Loading face detection model...');
      
      // Load face detection model in parallel with camera access
      const modelPromise = loadFaceDetectionModel();
      
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'user', 
          width: { ideal: 1280 }, 
          height: { ideal: 720 } 
        } 
      });
      
      console.log('Camera access granted, stream:', mediaStream);
      console.log('Video tracks:', mediaStream.getVideoTracks());
      
      setStream(mediaStream);
      setShowCamera(true); // Show video element immediately
      
      // Use requestAnimationFrame to ensure DOM is ready
      requestAnimationFrame(async () => {
        if (videoRef.current) {
          console.log('Setting video srcObject...');
          videoRef.current.srcObject = mediaStream;
          
          // Try to play immediately
          videoRef.current.play().then(async () => {
            console.log('Video playing successfully');
            setCameraLoading(false);
            
            // Wait for model to load
            await modelPromise;
            console.log('Face detection model ready');
            
            // Start real-time face detection
            if (videoRef.current) {
              stopDetectionRef.current = startFaceDetection(
                videoRef.current,
                (count) => {
                  console.log(`Detected ${count} face(s)`);
                  setFaceDetected(count > 0);
                  setFaceCount(count);
                },
                () => {
                  console.log('No faces detected');
                  setFaceDetected(false);
                  setFaceCount(0);
                },
                300 // Check every 300ms
              );
            }
          }).catch(err => {
            console.error('Error playing video:', err);
            
            // Wait for metadata event as fallback
            videoRef.current!.onloadedmetadata = async () => {
              console.log('Video metadata loaded (fallback)');
              try {
                await videoRef.current?.play();
                console.log('Video playing successfully via metadata event');
                setCameraLoading(false);
                
                // Start face detection
                await modelPromise;
                if (videoRef.current) {
                  stopDetectionRef.current = startFaceDetection(
                    videoRef.current,
                    (count) => {
                      setFaceDetected(count > 0);
                      setFaceCount(count);
                    },
                    () => {
                      setFaceDetected(false);
                      setFaceCount(0);
                    }
                  );
                }
              } catch (err2: any) {
                console.error('Error playing video in metadata handler:', err2);
                setCameraLoading(false);
                alert('Failed to play video: ' + err2.message);
              }
            };
          });
        }
      });
    } catch (error: any) {
      console.error('Camera error:', error);
      setCameraLoading(false);
      setShowCamera(false);
      alert('Camera access denied. Please allow camera permissions and ensure no other app is using the camera.');
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        const imageData = canvas.toDataURL('image/jpeg');
        setCapturedImage(imageData);
        setFormData({ ...formData, photo: imageData });
        stopCamera();
      }
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    if (stopDetectionRef.current) {
      stopDetectionRef.current();
      stopDetectionRef.current = null;
    }
    setShowCamera(false);
    setCameraLoading(false);
    setFaceDetected(false);
    setFaceCount(0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      // Validate required fields
      if (!formData.full_name.trim()) {
        throw new Error('Full name is required');
      }
      if (!formData.email.trim()) {
        throw new Error('Email is required');
      }
      if (!formData.role) {
        throw new Error('Role is required');
      }
      // Validate password
      if (!student && !formData.password.trim()) {
        throw new Error('Password is required for new users');
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        throw new Error('Please enter a valid email address');
      }

      // Validate photo if provided
      if (formData.photo && !formData.photo.startsWith('data:image/')) {
        throw new Error('Invalid photo format. Please capture a photo using the camera.');
      }

      const submitData = { ...formData };
      if (!submitData.password.trim()) {
        delete (submitData as any).password; // Don't send empty password for updates
      }

      if (student) {
        await supabase.from('users').update(submitData).eq('id', student.id);
      } else {
        await supabase.from('users').insert([{ ...submitData, is_active: true }]);
      }
      await onSave();
      onClose();
    } catch (error: any) {
      console.error('Error saving user:', error);

      // Provide user-friendly error messages
      let errorMessage = 'Failed to save user';

      if (error.message) {
        errorMessage = error.message;
      } else if (error.details) {
        errorMessage = error.details;
      } else if (error.code === '23505') {
        errorMessage = 'A user with this email already exists';
      } else if (error.code === '23503') {
        errorMessage = 'Invalid department selected';
      }

      alert(`Error: ${errorMessage}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-bold mb-4">{student ? 'Edit' : 'Add'} User</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Role Selection */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">User Type *</label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg"
              required
              disabled={!!student} // Don't allow role changes for existing users
            >
              <option value="student">Student</option>
              <option value="teacher">Teacher</option>
              <option value="technical_staff">Technical Staff</option>
            </select>
          </div>

          {/* Photo Capture Section */}
          <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 bg-slate-50">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              <Camera className="inline mr-2" size={16} />
              {formData.role === 'student' ? 'Student Photo (For Face Recognition)' : 'Profile Photo'}
            </label>
            {!showCamera && !capturedImage && !cameraLoading && (
              <button
                type="button"
                onClick={startCamera}
                className="w-full py-8 border-2 border-dashed border-blue-300 rounded-lg hover:bg-blue-50 transition-colors"
              >
                <Camera size={48} className="mx-auto text-blue-600 mb-2" />
                <p className="text-blue-600 font-medium">Click to Capture Photo</p>
                <p className="text-sm text-slate-500 mt-1">
                  {formData.role === 'student' ? 'Required for face attendance' : 'Optional profile photo'}
                </p>
              </button>
            )}
            
            {showCamera && (
              <div className="relative bg-black rounded-lg overflow-hidden">
                <video 
                  ref={videoRef} 
                  autoPlay 
                  playsInline
                  muted
                  className="w-full rounded-lg"
                  style={{ maxHeight: '400px', objectFit: 'contain' }}
                />
                <canvas ref={canvasRef} className="hidden" />
                
                {cameraLoading && (
                  <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-3"></div>
                      <p className="text-white font-medium">Starting video...</p>
                    </div>
                  </div>
                )}
                
                {!cameraLoading && faceDetected && (
                  <div className="absolute top-2 right-2 bg-green-500 text-white px-3 py-1 rounded-full text-sm flex items-center gap-1">
                    <Check size={16} />
                    {faceCount === 1 ? 'Face Detected' : `${faceCount} Faces Detected`}
                  </div>
                )}
                
                {!cameraLoading && !faceDetected && (
                  <div className="absolute top-2 right-2 bg-yellow-500 text-white px-3 py-1 rounded-full text-sm flex items-center gap-1">
                    <AlertCircle size={16} />
                    Looking for face...
                  </div>
                )}
                
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={capturePhoto}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Camera size={16} className="inline mr-2" />
                    {faceDetected ? 'Capture Photo' : 'Capture Anyway'}
                  </button>
                  <button
                    type="button"
                    onClick={stopCamera}
                    className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50"
                  >
                    <X size={16} className="inline mr-2" />
                    Cancel
                  </button>
                </div>
              </div>
            )}
            
            {capturedImage && !showCamera && (
              <div className="relative">
                <img src={capturedImage} alt="Captured" className="w-full rounded-lg" />
                <button
                  type="button"
                  onClick={() => {
                    setCapturedImage(null);
                    setFormData({ ...formData, photo: null });
                  }}
                  className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full hover:bg-red-600"
                >
                  <X size={16} />
                </button>
                <div className="mt-2 text-center">
                  <button
                    type="button"
                    onClick={startCamera}
                    className="text-blue-600 hover:underline text-sm"
                  >
                    Retake Photo
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Basic Information */}
          <div className="grid grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Full Name *"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg"
              required
            />
            <input
              type={formData.role === 'student' ? 'text' : 'tel'}
              placeholder={formData.role === 'student' ? 'Registration Number *' : 'Employee ID *'}
              value={formData.registration_number}
              onChange={(e) => setFormData({ ...formData, registration_number: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg font-mono"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <input
              type="email"
              placeholder="Email *"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg"
              required
            />
            <input
              type="tel"
              placeholder="Phone Number"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <select
              value={formData.department_id}
              onChange={(e) => setFormData({ ...formData, department_id: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg"
              required
            >
              <option value="">Select Department *</option>
              {departments.map((d: any) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
            {formData.role === 'student' ? (
              <input
                type="text"
                placeholder="Class/Year (e.g., CS-3A)"
                value={formData.class_name}
                onChange={(e) => setFormData({ ...formData, class_name: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg"
              />
            ) : (
              <input
                type="text"
                placeholder="Designation (e.g., Professor, Technician)"
                value={formData.class_name}
                onChange={(e) => setFormData({ ...formData, class_name: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg"
              />
            )}
          </div>

          <input
            type="text"
            placeholder="RFID Card ID (Optional)"
            value={formData.rfid_card_id}
            onChange={(e) => setFormData({ ...formData, rfid_card_id: e.target.value })}
            className="w-full px-4 py-2 border rounded-lg font-mono"
          />

          <input
            type="password"
            placeholder={student ? 'New Password (leave empty to keep current)' : 'Password *'}
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            className="w-full px-4 py-2 border rounded-lg"
            required={!student}
          />

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded-lg hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || (formData.role === 'student' && !capturedImage)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:bg-slate-300 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : `Save ${formData.role === 'student' ? 'Student' : formData.role === 'teacher' ? 'Teacher' : 'Staff'}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
