import React, { useEffect, useState } from 'react';
import Card from '../ui/Card';
import Input from '../ui/Input';
import Button from '../ui/Button';
import { adminProgramsService, AdminProgramPost } from '../../lib/adminProgramsService';
import { toDirectImageUrl } from '../../lib/imageUrl';
import { Calendar, ExternalLink, Trash2 } from 'lucide-react';

const AdminProgramsTab: React.FC = () => {
  const [form, setForm] = useState({
    programName: '',
    incubationCenter: '',
    deadline: '',
    applicationLink: '',
    posterUrl: ''
  });
  const [loading, setLoading] = useState(false);
  const [posts, setPosts] = useState<AdminProgramPost[]>([]);

  const loadPosts = async () => {
    try {
      const data = await adminProgramsService.listActive();
      setPosts(data);
    } catch (e) {
      console.error('Failed to load admin program posts', e);
    }
  };

  useEffect(() => {
    loadPosts();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.programName || !form.incubationCenter || !form.deadline || !form.applicationLink) return;
    setLoading(true);
    try {
      const normalizedPoster = toDirectImageUrl(form.posterUrl);
      await adminProgramsService.create({
        programName: form.programName.trim(),
        incubationCenter: form.incubationCenter.trim(),
        deadline: form.deadline,
        applicationLink: form.applicationLink.trim(),
        posterUrl: normalizedPoster || undefined
      });
      setForm({ programName: '', incubationCenter: '', deadline: '', applicationLink: '', posterUrl: '' });
      await loadPosts();
    } catch (e: any) {
      console.error('Failed to create admin program post', e);
      const msg = e?.message || (e?.error?.message) || 'Unknown error';
      alert(`Failed to post program. Server error: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this program post?')) return;
    try {
      await adminProgramsService.delete(id);
      await loadPosts();
    } catch (e: any) {
      console.error('Failed to delete admin program post', e);
      const msg = e?.message || (e?.error?.message) || 'Unknown error';
      alert(`Failed to delete program. Server error: ${msg}`);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <h3 className="text-lg font-semibold text-slate-700 mb-4">Post a Program</h3>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Program Name"
            placeholder="e.g., National Startup Awards"
            value={form.programName}
            onChange={e => setForm(prev => ({ ...prev, programName: e.target.value }))}
            required
          />
          <Input
            label="Incubation Center"
            placeholder="e.g., AIC XYZ Incubator"
            value={form.incubationCenter}
            onChange={e => setForm(prev => ({ ...prev, incubationCenter: e.target.value }))}
            required
          />
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Deadline</label>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-slate-500" />
              <input
                type="date"
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.deadline}
                onChange={e => setForm(prev => ({ ...prev, deadline: e.target.value }))}
                required
              />
            </div>
          </div>
          <Input
            label="Application Link"
            placeholder="https://..."
            value={form.applicationLink}
            onChange={e => setForm(prev => ({ ...prev, applicationLink: e.target.value }))}
            required
          />
        <Input
          label="Poster URL (optional)"
          placeholder="https://.../poster.jpg"
          value={form.posterUrl}
          onChange={e => setForm(prev => ({ ...prev, posterUrl: e.target.value }))}
        />
          <div className="md:col-span-2 flex justify-end">
            <Button type="submit" disabled={loading}>{loading ? 'Posting...' : 'Post Program'}</Button>
          </div>
        </form>
      </Card>

      <Card>
        <h3 className="text-lg font-semibold text-slate-700 mb-4">Recent Posts</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Program</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Poster</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Incubation Center</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Deadline</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {posts.map(p => (
                <tr key={p.id}>
                  <td className="px-6 py-4 text-sm font-medium text-slate-900">{p.programName}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {p.posterUrl ? (
                      <img src={toDirectImageUrl(p.posterUrl)} alt={`${p.programName} poster`} className="h-10 w-16 object-cover rounded border" />
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">{p.incubationCenter}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{p.deadline}</td>
                  <td className="px-6 py-4 text-sm text-right">
                    <div className="flex gap-2 justify-end">
                      <a href={p.applicationLink} target="_blank" rel="noopener noreferrer">
                        <Button size="sm" variant="outline" className="border-blue-300 text-blue-600 hover:bg-blue-50">
                          <ExternalLink className="h-4 w-4 mr-1" /> Open Link
                        </Button>
                      </a>
                      <Button size="sm" variant="outline" onClick={() => handleDelete(p.id)} className="border-red-300 text-red-600 hover:bg-red-50">
                        <Trash2 className="h-4 w-4 mr-1" /> Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {posts.length === 0 && (
                <tr>
                  <td className="px-6 py-8 text-center text-slate-500" colSpan={4}>No posts yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default AdminProgramsTab;


