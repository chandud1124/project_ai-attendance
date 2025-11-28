import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, Edit, Trash2, Calendar } from 'lucide-react';

export function TimetableView() {
  const [timetable, setTimetable] = useState<any[]>([]);
  const [classrooms, setClassrooms] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<any>(null);

  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [timetableRes, classroomsRes, teachersRes] = await Promise.all([
        supabase.from('timetable').select(`
          *,
          classrooms(name),
          users(full_name)
        `).eq('is_active', true).order('day_of_week', { ascending: true }),
        supabase.from('classrooms').select('*').eq('is_active', true),
        supabase.from('users').select('*').eq('role', 'teacher')
      ]);

      if (timetableRes.data) setTimetable(timetableRes.data);
      if (classroomsRes.data) setClassrooms(classroomsRes.data);
      if (teachersRes.data) setTeachers(teachersRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this timetable entry?')) return;
    try {
      const { error } = await supabase.from('timetable').delete().eq('id', id);
      if (error) throw error;
      await fetchData();
    } catch (error) {
      console.error('Error deleting entry:', error);
    }
  };

  const groupedTimetable = timetable.reduce((acc, entry) => {
    if (!acc[entry.day_of_week]) acc[entry.day_of_week] = [];
    acc[entry.day_of_week].push(entry);
    return acc;
  }, {} as Record<number, any[]>);

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
          <h2 className="text-2xl font-bold text-slate-900">Timetable Management</h2>
          <p className="text-slate-600">Configure class schedules and periods</p>
        </div>
        <button
          onClick={() => { setSelectedEntry(null); setShowModal(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus size={20} />
          Add Period
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {days.map((day, index) => (
          <div key={index} className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Calendar size={20} className="text-blue-600" />
              {day}
            </h3>
            {groupedTimetable[index]?.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {groupedTimetable[index].map((entry: any) => (
                  <div key={entry.id} className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h4 className="font-bold text-slate-900">{entry.subject_name}</h4>
                        <p className="text-sm text-slate-600">{entry.classrooms?.name}</p>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => { setSelectedEntry(entry); setShowModal(true); }}
                          className="p-1 text-slate-600 hover:bg-slate-200 rounded"
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(entry.id)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    <div className="space-y-1 text-sm text-slate-600">
                      <p>Time: {entry.start_time} - {entry.end_time}</p>
                      <p>Teacher: {entry.users?.full_name || 'Not Assigned'}</p>
                      {entry.section && <p>Section: {entry.section}</p>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center py-4 text-slate-500">No classes scheduled</p>
            )}
          </div>
        ))}
      </div>

      {showModal && (
        <TimetableModal
          entry={selectedEntry}
          classrooms={classrooms}
          teachers={teachers}
          onClose={() => setShowModal(false)}
          onSave={fetchData}
        />
      )}
    </div>
  );
}

function TimetableModal({ entry, classrooms, teachers, onClose, onSave }: any) {
  const [formData, setFormData] = useState({
    classroom_id: entry?.classroom_id || '',
    teacher_id: entry?.teacher_id || '',
    subject_name: entry?.subject_name || '',
    day_of_week: entry?.day_of_week || 1,
    start_time: entry?.start_time || '09:00',
    end_time: entry?.end_time || '10:00',
    section: entry?.section || '',
    is_active: entry?.is_active !== false
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (entry) {
        const { error } = await supabase.from('timetable').update(formData).eq('id', entry.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('timetable').insert([formData]);
        if (error) throw error;
      }
      await onSave();
      onClose();
    } catch (error: any) {
      alert(error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full">
        <div className="p-6 border-b">
          <h3 className="text-xl font-bold">{entry ? 'Edit' : 'Add'} Timetable Entry</h3>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Subject Name</label>
              <input
                type="text"
                value={formData.subject_name}
                onChange={(e) => setFormData({ ...formData, subject_name: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Day of Week</label>
              <select
                value={formData.day_of_week}
                onChange={(e) => setFormData({ ...formData, day_of_week: parseInt(e.target.value) })}
                className="w-full px-4 py-2 border rounded-lg"
              >
                <option value="0">Sunday</option>
                <option value="1">Monday</option>
                <option value="2">Tuesday</option>
                <option value="3">Wednesday</option>
                <option value="4">Thursday</option>
                <option value="5">Friday</option>
                <option value="6">Saturday</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Start Time</label>
              <input
                type="time"
                value={formData.start_time}
                onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">End Time</label>
              <input
                type="time"
                value={formData.end_time}
                onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Classroom</label>
              <select
                value={formData.classroom_id}
                onChange={(e) => setFormData({ ...formData, classroom_id: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg"
                required
              >
                <option value="">Select Classroom</option>
                {classrooms.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Teacher</label>
              <select
                value={formData.teacher_id}
                onChange={(e) => setFormData({ ...formData, teacher_id: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg"
              >
                <option value="">Select Teacher</option>
                {teachers.map((t: any) => (
                  <option key={t.id} value={t.id}>{t.full_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Section</label>
              <input
                type="text"
                value={formData.section}
                onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg"
                placeholder="e.g., A, B, C"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="w-4 h-4"
            />
            <label htmlFor="is_active" className="text-sm font-medium">Active</label>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" onClick={onClose} className="px-4 py-2 border rounded-lg">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Entry'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
