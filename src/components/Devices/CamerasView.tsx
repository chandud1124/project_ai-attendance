import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, Edit, Trash2, Camera, CameraOff, Play, AlertCircle, Users } from 'lucide-react';
import { detectFaces, loadFaceDetectionModel } from '../../utils/faceDetection';
import { startFaceRecognition, drawRecognizedFaces, RecognizedFace } from '../../utils/faceRecognition';

interface CameraDevice {
  id: string;
  camera_name: string;
  stream_url: string;
  camera_type: string;
  resolution: string;
  fps: number;
  is_online: boolean;
  trigger_mode: string;
  classroom_id: string;
  classrooms?: { name: string };
  created_at: string;
}

export function CamerasView() {
  const [cameras, setCameras] = useState<CameraDevice[]>([]);
  const [classrooms, setClassrooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedCamera, setSelectedCamera] = useState<CameraDevice | null>(null);
  const [testingCamera, setTestingCamera] = useState<string | null>(null);
  const [showSystemCamTest, setShowSystemCamTest] = useState(false);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const [camerasRes, classroomsRes] = await Promise.all([
        supabase.from('cameras').select('*, classrooms(name)').order('created_at', { ascending: false }),
        supabase.from('classrooms').select('id, name').eq('is_active', true)
      ]);

      if (camerasRes.data) setCameras(camerasRes.data);
      if (classroomsRes.data) setClassrooms(classroomsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this camera?')) return;
    try {
      const { error } = await supabase.from('cameras').delete().eq('id', id);
      if (error) throw error;
      await fetchData();
    } catch (error: any) {
      alert('Error: ' + error.message);
    }
  };

  const handleTestStream = async (cameraId: string, streamUrl: string) => {
    setTestingCamera(cameraId);
    try {
      const response = await fetch(streamUrl, { method: 'HEAD' });
      if (response.ok) {
        alert('Camera stream is accessible');
      } else {
        alert('Camera stream returned status: ' + response.status);
      }
    } catch {
      alert('Camera stream is not accessible. Check URL and connectivity.');
    } finally {
      setTestingCamera(null);
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
          <h2 className="text-2xl font-bold text-slate-900">Cameras</h2>
          <p className="text-slate-600">Manage IP cameras and video streams</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowSystemCamTest(true)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            <Play size={20} />
            Test System Camera
          </button>
          <button
            onClick={() => { setSelectedCamera(null); setShowModal(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus size={20} />
            Add Camera
          </button>
        </div>
      </div>

      {cameras.length === 0 ? (
        <div className="bg-white rounded-xl p-12 shadow-sm border border-slate-200 text-center">
          <Camera className="mx-auto mb-4 text-slate-400" size={48} />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">No Cameras</h3>
          <p className="text-slate-600 mb-4">Add your first camera to get started</p>
          <button
            onClick={() => { setSelectedCamera(null); setShowModal(true); }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus size={20} />
            Add Camera
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cameras.map((camera) => (
            <div key={camera.id} className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  {camera.is_online ? (
                    <Camera className="text-green-600" size={24} />
                  ) : (
                    <CameraOff className="text-red-600" size={24} />
                  )}
                  <div>
                    <h3 className="font-bold text-slate-900">{camera.camera_name}</h3>
                    <p className="text-xs text-slate-500">{camera.camera_type}</p>
                  </div>
                </div>
                <span className={`px-2 py-1 rounded text-xs font-semibold ${camera.is_online ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {camera.is_online ? 'Online' : 'Offline'}
                </span>
              </div>

              <div className="space-y-2 text-sm mb-4">
                <div className="flex justify-between">
                  <span className="text-slate-600">Resolution:</span>
                  <span className="font-mono text-slate-900">{camera.resolution}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">FPS:</span>
                  <span className="font-mono text-slate-900">{camera.fps}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Trigger Mode:</span>
                  <span className="text-slate-900 capitalize">{camera.trigger_mode}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Classroom:</span>
                  <span className="text-slate-900">{camera.classrooms?.name || 'Not assigned'}</span>
                </div>
                <div className="text-xs text-slate-500 truncate">
                  <span className="font-mono break-all">{camera.stream_url}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleTestStream(camera.id, camera.stream_url)}
                  disabled={testingCamera === camera.id}
                  className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-slate-100 text-slate-700 rounded hover:bg-slate-200 disabled:opacity-50 text-sm"
                >
                  <Play size={14} />
                  Test
                </button>
                <button
                  onClick={() => { setSelectedCamera(camera); setShowModal(true); }}
                  className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-sm"
                >
                  <Edit size={14} />
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(camera.id)}
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
        <CameraModal
          camera={selectedCamera}
          classrooms={classrooms}
          onClose={() => setShowModal(false)}
          onSave={fetchData}
        />
      )}

      {showSystemCamTest && (
        <SystemCameraTest onClose={() => setShowSystemCamTest(false)} />
      )}
    </div>
  );
}

function CameraModal({ camera, classrooms, onClose, onSave }: any) {
  const [formData, setFormData] = useState({
    camera_name: camera?.camera_name || '',
    camera_type: camera?.camera_type || 'IP Camera',
    stream_url: camera?.stream_url || '',
    resolution: camera?.resolution || '1920x1080',
    fps: camera?.fps || 30,
    trigger_mode: camera?.trigger_mode || 'rfid_triggered',
    classroom_id: camera?.classroom_id || '',
    is_online: camera?.is_online !== false
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (camera) {
        const { error } = await supabase.from('cameras').update(formData).eq('id', camera.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('cameras').insert([formData]);
        if (error) throw error;
      }
      await onSave();
      onClose();
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
          <h3 className="text-xl font-bold text-slate-900">{camera ? 'Edit' : 'Add'} Camera</h3>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Camera Name</label>
              <input
                type="text"
                value={formData.camera_name}
                onChange={(e) => setFormData({ ...formData, camera_name: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="e.g., Classroom A Front"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Camera Type</label>
              <select
                value={formData.camera_type}
                onChange={(e) => setFormData({ ...formData, camera_type: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="IP Camera">IP Camera</option>
                <option value="RTSP Stream">RTSP Stream</option>
                <option value="ESP32-CAM">ESP32-CAM</option>
                <option value="Raspberry Pi Camera">Raspberry Pi Camera</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-2">Stream URL</label>
              <input
                type="text"
                value={formData.stream_url}
                onChange={(e) => setFormData({ ...formData, stream_url: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm"
                placeholder="http://192.168.1.100:8080/video or rtsp://..."
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Resolution</label>
              <select
                value={formData.resolution}
                onChange={(e) => setFormData({ ...formData, resolution: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="640x480">640x480</option>
                <option value="1280x720">1280x720 (HD)</option>
                <option value="1920x1080">1920x1080 (Full HD)</option>
                <option value="2560x1440">2560x1440 (2K)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">FPS</label>
              <input
                type="number"
                value={formData.fps}
                onChange={(e) => setFormData({ ...formData, fps: parseInt(e.target.value) })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                min="5"
                max="60"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Trigger Mode</label>
              <select
                value={formData.trigger_mode}
                onChange={(e) => setFormData({ ...formData, trigger_mode: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="continuous">Continuous</option>
                <option value="rfid_triggered">RFID-Triggered</option>
                <option value="scheduled">Scheduled</option>
              </select>
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
              <strong>URL Formats:</strong> HTTP/MJPEG: http://ip:port/stream | RTSP: rtsp://ip:port/stream
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
              {saving ? 'Saving...' : 'Save Camera'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SystemCameraTest({ onClose }: any) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [recognizedFaces, setRecognizedFaces] = useState<RecognizedFace[]>([]);
  const [detecting, setDetecting] = useState(false);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const stopDetectionRef = React.useRef<(() => void) | null>(null);

  const startCamera = async () => {
    try {
      setError('');
      setLoading(true);
      console.log('Requesting camera access...');
      console.log('Loading face detection model...');
      
      // Load face detection model in parallel
      const modelPromise = loadFaceDetectionModel();
      
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: 1280 }, 
          height: { ideal: 720 },
          facingMode: 'user'
        },
        audio: false
      });
      
      console.log('Camera access granted, stream:', mediaStream);
      setStream(mediaStream);
      setCapturing(true);
      
      requestAnimationFrame(async () => {
        if (videoRef.current) {
          console.log('Setting video srcObject...');
          videoRef.current.srcObject = mediaStream;
          
          videoRef.current.play().then(async () => {
            console.log('Video playing successfully');
            setLoading(false);
            
            // Wait for model to load
            await modelPromise;
            console.log('Face detection model ready, starting face recognition...');
            setDetecting(true);
            
            // Start real-time face recognition
            if (videoRef.current && canvasRef.current) {
              stopDetectionRef.current = startFaceRecognition(
                videoRef.current,
                detectFaces,
                (faces) => {
                  console.log(`Recognized ${faces.length} person(s):`, faces.map(f => f.student_name));
                  setRecognizedFaces(faces);
                  
                  // Draw recognized faces with names on canvas
                  if (canvasRef.current && videoRef.current) {
                    canvasRef.current.width = videoRef.current.videoWidth;
                    canvasRef.current.height = videoRef.current.videoHeight;
                    drawRecognizedFaces(canvasRef.current, faces);
                  }
                },
                500 // Check every 500ms for recognition (slower than detection)
              );
            }
          }).catch(err => {
            console.error('Error playing video:', err);
            
            // Fallback: wait for metadata
            videoRef.current!.onloadedmetadata = async () => {
              console.log('Video metadata loaded (fallback)');
              try {
                await videoRef.current?.play();
                console.log('Video playing successfully via metadata event');
                setLoading(false);
                
                await modelPromise;
                setDetecting(true);
                if (videoRef.current) {
                  stopDetectionRef.current = startFaceRecognition(
                    videoRef.current,
                    detectFaces,
                    (faces) => {
                      setRecognizedFaces(faces);
                      if (canvasRef.current && videoRef.current) {
                        canvasRef.current.width = videoRef.current.videoWidth;
                        canvasRef.current.height = videoRef.current.videoHeight;
                        drawRecognizedFaces(canvasRef.current, faces);
                      }
                    }
                  );
                }
              } catch (err2: any) {
                console.error('Error playing video in metadata handler:', err2);
                setError('Failed to play video stream: ' + err2.message);
                setLoading(false);
              }
            };
          });
        }
      });
    } catch (err: any) {
      console.error('Camera access error:', err);
      setError('Failed to access camera: ' + err.message + '. Please ensure camera permissions are granted.');
      setCapturing(false);
      setLoading(false);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
      setCapturing(false);
      setLoading(false);
    }
    if (stopDetectionRef.current) {
      stopDetectionRef.current();
      stopDetectionRef.current = null;
    }
    setDetecting(false);
    setRecognizedFaces([]);
  };

  const captureSnapshot = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0);
      const link = document.createElement('a');
      link.download = `snapshot_${Date.now()}.png`;
      link.href = canvas.toDataURL();
      link.click();
    }
  };

  React.useEffect(() => {
    return () => {
      stopCamera();
      if (stopDetectionRef.current) {
        stopDetectionRef.current();
      }
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-4xl w-full">
        <div className="p-6 border-b border-slate-200 bg-gradient-to-r from-purple-50 to-blue-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center">
                <Camera className="text-white" size={24} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">System Camera Test</h3>
                <p className="text-sm text-slate-600">Test your webcam or system camera</p>
              </div>
            </div>
            <button
              onClick={() => {
                stopCamera();
                onClose();
              }}
              className="text-slate-400 hover:text-slate-600 text-2xl px-3"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
              <div>
                <p className="text-sm font-semibold text-red-900 mb-1">Camera Access Error</p>
                <p className="text-xs text-red-800">{error}</p>
              </div>
            </div>
          )}

          <div className="bg-slate-900 rounded-lg overflow-hidden aspect-video flex items-center justify-center relative">
            {!capturing ? (
              <div className="text-center">
                <CameraOff className="mx-auto mb-4 text-slate-600" size={64} />
                <p className="text-slate-400 mb-4">Camera not started</p>
                <p className="text-xs text-slate-500">Click "Start Camera" below to begin</p>
              </div>
            ) : (
              <div className="relative w-full h-full">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-contain"
                />
                {/* Canvas overlay for face detection boxes */}
                <canvas
                  ref={canvasRef}
                  className="absolute top-0 left-0 w-full h-full pointer-events-none"
                  style={{ objectFit: 'contain' }}
                />
                
                {/* Face recognition status badges */}
                {detecting && !loading && (
                  <div className="absolute top-4 right-4 flex flex-col gap-2">
                    {recognizedFaces.length > 0 ? (
                      <>
                        <div className="bg-green-500 text-white px-4 py-2 rounded-full text-sm font-semibold flex items-center gap-2 shadow-lg">
                          <Users size={18} />
                          {recognizedFaces.length} {recognizedFaces.length === 1 ? 'Person' : 'People'} Recognized
                        </div>
                        {/* Show list of recognized people */}
                        <div className="bg-white/95 backdrop-blur rounded-lg shadow-lg p-3 max-w-xs">
                          <div className="text-xs font-semibold text-slate-700 mb-2">Identified:</div>
                          {recognizedFaces.map((face, idx) => (
                            <div key={idx} className="flex items-center gap-2 mb-2 last:mb-0">
                              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-semibold text-slate-900 truncate">
                                  {face.student_name}
                                </div>
                                <div className="text-xs text-slate-500">
                                  {face.roll_number} • {(face.confidence * 100).toFixed(0)}% match
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <div className="bg-yellow-500 text-white px-4 py-2 rounded-full text-sm font-semibold flex items-center gap-2 shadow-lg">
                        <Camera size={18} />
                        Searching for faces...
                      </div>
                    )}
                    <div className="bg-blue-600 text-white px-3 py-1 rounded-full text-xs flex items-center gap-1 shadow-lg">
                      <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                      AI Recognition Active
                    </div>
                  </div>
                )}
                
                {loading && (
                  <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-500 mx-auto mb-4"></div>
                      <p className="text-white font-medium mb-2">Starting video...</p>
                      <p className="text-xs text-slate-400">Loading AI model...</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex gap-3">
            {!capturing ? (
              <button
                onClick={startCamera}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold disabled:bg-slate-400 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Starting...
                  </>
                ) : (
                  <>
                    <Play size={20} />
                    Start Camera
                  </>
                )}
              </button>
            ) : (
              <>
                <button
                  onClick={captureSnapshot}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
                >
                  <Camera size={20} />
                  Capture Snapshot
                </button>
                <button
                  onClick={stopCamera}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold"
                >
                  <CameraOff size={20} />
                  Stop Camera
                </button>
              </>
            )}
          </div>

          <div className="bg-gradient-to-r from-blue-50 to-green-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-slate-900 mb-2">
              <strong className="text-blue-700">🎯 AI Face Recognition:</strong> This feature identifies students in real-time by comparing detected faces against the student database.
            </p>
            <p className="text-xs text-slate-600">
              • Students with photos will be automatically recognized • Names and roll numbers appear above detected faces • Confidence score shows match accuracy
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
