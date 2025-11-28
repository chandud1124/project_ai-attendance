import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, Edit, Trash2, School, AlertCircle } from 'lucide-react';

interface Classroom {
  id: string;
  name: string;
  location: string;
  capacity: number;
  department_id: string;
  floor: string;
  block: string;
  departments?: { name: string };
  is_active: boolean;
}

export function ClassroomsView() {
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedClassroom, setSelectedClassroom] = useState<Classroom | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [classroomsRes, deptRes] = await Promise.all([
        supabase.from('classrooms').select('*, departments(name)').order('name', { ascending: true }),
        supabase.from('departments').select('*').eq('is_active', true)
      ]);

      if (classroomsRes.data) setClassrooms(classroomsRes.data);
      if (deptRes.data) setDepartments(deptRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this classroom?')) return;
    try {
      const { error } = await supabase.from('classrooms').delete().eq('id', id);
      if (error) throw error;
      await fetchData();
    } catch (error: any) {
      alert('Error: ' + error.message);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-96"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h2 className="text-2xl font-bold text-slate-900">Classrooms</h2><p className="text-slate-600">Configure classrooms and departments</p></div>
        <button onClick={() => { setSelectedClassroom(null); setShowModal(true); }} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"><Plus size={20} />Add Classroom</button>
      </div>

      {classrooms.length === 0 ? (
        <div className="bg-white rounded-xl p-12 shadow-sm border border-slate-200 text-center"><School className="mx-auto mb-4 text-slate-400" size={48} /><h3 className="text-lg font-semibold text-slate-900 mb-2">No Classrooms</h3><p className="text-slate-600 mb-4">Add your first classroom to get started</p></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{classrooms.map((room) => (
          <div key={room.id} className="bg-white rounded-xl p-6 shadow-sm border border-slate-200"><div className="flex items-start justify-between mb-4"><div className="flex items-center gap-3"><School className="text-blue-600" size={24} /><div><h3 className="font-bold text-slate-900">{room.name}</h3><p className="text-xs text-slate-500">{room.departments?.name}</p></div></div></div><div className="space-y-2 text-sm mb-4"><p className="flex justify-between"><span className="text-slate-600">Capacity:</span><span className="font-mono">{room.capacity}</span></p><p className="flex justify-between"><span className="text-slate-600">Location:</span><span>{room.location}</span></p><p className="flex justify-between"><span className="text-slate-600">Floor:</span><span>{room.floor}</span></p></div><div className="flex gap-2"><button onClick={() => { setSelectedClassroom(room); setShowModal(true); }} className="flex-1 px-3 py-2 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-sm"><Edit size={14} />Edit</button><button onClick={() => handleDelete(room.id)} className="flex-1 px-3 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200 text-sm"><Trash2 size={14} /></button></div></div>
        ))}</div>
      )}

      {showModal && <ClassroomModal classroom={selectedClassroom} departments={departments} onClose={() => setShowModal(false)} onSave={fetchData} />}
    </div>
  );
}

function ClassroomModal({ classroom, departments, onClose, onSave }: any) {
  const [formData, setFormData] = useState({
    name: classroom?.name || '',
    location: classroom?.location || '',
    capacity: classroom?.capacity || 30,
    department_id: classroom?.department_id || '',
    floor: classroom?.floor || '',
    block: classroom?.block || '',
    is_active: classroom?.is_active !== false
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (classroom) {
        const { error } = await supabase.from('classrooms').update(formData).eq('id', classroom.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('classrooms').insert([formData]);
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
        <div className="p-6 border-b"><h3 className="text-xl font-bold">{classroom ? 'Edit' : 'Add'} Classroom</h3></div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <input type="text" placeholder="Classroom Name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="px-4 py-2 border rounded-lg" required />
            <input type="number" placeholder="Capacity" value={formData.capacity} onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) })} className="px-4 py-2 border rounded-lg" required />
            <input type="text" placeholder="Location" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} className="px-4 py-2 border rounded-lg" />
            <input type="text" placeholder="Floor" value={formData.floor} onChange={(e) => setFormData({ ...formData, floor: e.target.value })} className="px-4 py-2 border rounded-lg" />
            <input type="text" placeholder="Block" value={formData.block} onChange={(e) => setFormData({ ...formData, block: e.target.value })} className="px-4 py-2 border rounded-lg" />
            <select value={formData.department_id} onChange={(e) => setFormData({ ...formData, department_id: e.target.value })} className="px-4 py-2 border rounded-lg"><option value="">Select Department</option>{departments.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}</select>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" onClick={onClose} className="px-4 py-2 border rounded-lg">Cancel</button>
            <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50">{saving ? 'Saving...' : 'Save'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
