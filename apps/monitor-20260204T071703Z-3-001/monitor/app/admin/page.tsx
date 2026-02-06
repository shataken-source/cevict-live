'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit, Save, X, Globe, Phone, Mail, Settings } from 'lucide-react';

interface Website {
  id: string;
  name: string;
  url: string;
  check_interval: number;
  enabled: boolean;
}

interface AlertConfig {
  sms_phone: string;
  email: string;
  critical_only: boolean;
}

export default function AdminPanel() {
  const [websites, setWebsites] = useState<Website[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    check_interval: '60',
    enabled: true,
  });
  const [alertConfig, setAlertConfig] = useState<AlertConfig>({
    sms_phone: '2562645669',
    email: '',
    critical_only: true,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchWebsites();
    fetchAlertConfig();
  }, []);

  const fetchWebsites = async () => {
    try {
      const res = await fetch('/api/websites');
      if (res.ok) {
        const data = await res.json();
        setWebsites(data.websites || []);
      }
    } catch (error) {
      console.error('Error fetching websites:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAlertConfig = async () => {
    try {
      const res = await fetch('/api/admin/config');
      if (res.ok) {
        const data = await res.json();
        if (data.config) {
          setAlertConfig(data.config);
        }
      }
    } catch (error) {
      console.error('Error fetching alert config:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (editingId) {
        // Update
        const res = await fetch('/api/websites', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingId,
            name: formData.name,
            url: formData.url,
            check_interval: parseInt(formData.check_interval),
            enabled: formData.enabled,
          }),
        });

        if (!res.ok) throw new Error('Failed to update website');
        const data = await res.json();
        setWebsites(websites.map(w => w.id === editingId ? data.website : w));
      } else {
        // Create
        const res = await fetch('/api/websites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formData.name,
            url: formData.url,
            check_interval: parseInt(formData.check_interval),
            enabled: formData.enabled,
          }),
        });

        if (!res.ok) throw new Error('Failed to create website');
        const data = await res.json();
        setWebsites([data.website, ...websites]);
      }

      setShowAddForm(false);
      setEditingId(null);
      setFormData({ name: '', url: '', check_interval: '60', enabled: true });
    } catch (error: any) {
      alert(error.message || 'Failed to save website');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this website from monitoring?')) return;

    try {
      const res = await fetch(`/api/websites?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete website');
      setWebsites(websites.filter(w => w.id !== id));
    } catch (error: any) {
      alert(error.message || 'Failed to delete website');
    }
  };

  const handleEdit = (website: Website) => {
    setFormData({
      name: website.name,
      url: website.url,
      check_interval: website.check_interval.toString(),
      enabled: website.enabled,
    });
    setEditingId(website.id);
    setShowAddForm(true);
  };

  const handleSaveAlertConfig = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(alertConfig),
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save alert config');
      }
      
      alert('Alert configuration saved!');
    } catch (error: any) {
      console.error('Save error:', error);
      alert(error.message || 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white flex items-center justify-center">
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white p-4 md:p-8" style={{ fontSize: 'clamp(14px, 1.5vw, 18px)' }}>
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6 md:mb-8">
          <h1 className="text-3xl md:text-5xl font-bold" style={{ fontSize: 'clamp(2rem, 4vw, 3rem)' }}>
            ⚙️ Admin Panel
          </h1>
          <a
            href="/"
            className="bg-blue-600 hover:bg-blue-500 px-4 md:px-6 py-2 md:py-3 rounded-lg font-semibold"
          >
            ← Dashboard
          </a>
        </div>

        {/* Alert Configuration */}
        <div className="bg-slate-800/50 border border-purple-500/30 rounded-xl p-4 md:p-6 mb-6 md:mb-8">
          <h2 className="text-xl md:text-2xl font-bold mb-4 flex items-center gap-2">
            <Settings className="w-5 h-5 md:w-6 md:h-6" />
            Alert Configuration
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-2 flex items-center gap-2">
                <Phone className="w-4 h-4" />
                SMS Phone Number
              </label>
              <input
                type="tel"
                value={alertConfig.sms_phone}
                onChange={(e) => setAlertConfig({ ...alertConfig, sms_phone: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded px-4 py-2 text-white"
                placeholder="2562645669"
              />
            </div>
            <div>
              <label className="block text-sm mb-2 flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Email (optional)
              </label>
              <input
                type="email"
                value={alertConfig.email}
                onChange={(e) => setAlertConfig({ ...alertConfig, email: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded px-4 py-2 text-white"
                placeholder="alerts@example.com"
              />
            </div>
          </div>
          <div className="mt-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={alertConfig.critical_only}
                onChange={(e) => setAlertConfig({ ...alertConfig, critical_only: e.target.checked })}
                className="w-4 h-4"
              />
              <span>Only send alerts for critical issues</span>
            </label>
          </div>
          <button
            onClick={handleSaveAlertConfig}
            disabled={saving}
            className="mt-4 bg-green-600 hover:bg-green-500 disabled:bg-gray-600 px-6 py-2 rounded-lg font-semibold"
          >
            {saving ? 'Saving...' : 'Save Alert Config'}
          </button>
        </div>

        {/* Websites List */}
        <div className="bg-slate-800/50 border border-blue-500/30 rounded-xl p-4 md:p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl md:text-2xl font-bold flex items-center gap-2">
              <Globe className="w-5 h-5 md:w-6 md:h-6" />
              Monitored Websites
            </h2>
            <button
              onClick={() => {
                setShowAddForm(true);
                setEditingId(null);
                setFormData({ name: '', url: '', check_interval: '60', enabled: true });
              }}
              className="bg-blue-600 hover:bg-blue-500 px-4 md:px-6 py-2 md:py-3 rounded-lg font-semibold flex items-center gap-2"
            >
              <Plus className="w-4 h-4 md:w-5 md:h-5" />
              Add Website
            </button>
          </div>

          {/* Add/Edit Form */}
          {showAddForm && (
            <div className="bg-slate-900/50 border border-blue-500/50 rounded-lg p-4 md:p-6 mb-6">
              <h3 className="text-lg md:text-xl font-bold mb-4">
                {editingId ? 'Edit Website' : 'Add New Website'}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm mb-2">Website Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded px-4 py-2 text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm mb-2">URL</label>
                  <input
                    type="url"
                    value={formData.url}
                    onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded px-4 py-2 text-white"
                    placeholder="https://example.com"
                    required
                  />
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm mb-2">Check Interval (seconds)</label>
                    <input
                      type="number"
                      value={formData.check_interval}
                      onChange={(e) => setFormData({ ...formData, check_interval: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded px-4 py-2 text-white"
                      min="30"
                      required
                    />
                  </div>
                  <div className="flex items-center pt-8">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.enabled}
                        onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                        className="w-4 h-4"
                      />
                      <span>Enabled</span>
                    </label>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={saving}
                    className="bg-green-600 hover:bg-green-500 disabled:bg-gray-600 px-6 py-2 rounded-lg font-semibold"
                  >
                    {saving ? 'Saving...' : editingId ? 'Update' : 'Add'} Website
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddForm(false);
                      setEditingId(null);
                    }}
                    className="bg-slate-700 hover:bg-slate-600 px-6 py-2 rounded-lg font-semibold"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Websites Table */}
          {websites.length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              No websites configured. Click "Add Website" to get started.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-900/50">
                  <tr>
                    <th className="px-4 md:px-6 py-3 text-left">Name</th>
                    <th className="px-4 md:px-6 py-3 text-left">URL</th>
                    <th className="px-4 md:px-6 py-3 text-left">Interval</th>
                    <th className="px-4 md:px-6 py-3 text-left">Status</th>
                    <th className="px-4 md:px-6 py-3 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {websites.map(website => (
                    <tr key={website.id} className="border-t border-slate-700">
                      <td className="px-4 md:px-6 py-4 font-semibold">{website.name}</td>
                      <td className="px-4 md:px-6 py-4 text-gray-300">{website.url}</td>
                      <td className="px-4 md:px-6 py-4">{website.check_interval}s</td>
                      <td className="px-4 md:px-6 py-4">
                        <span className={`px-2 py-1 rounded text-xs ${website.enabled ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>
                          {website.enabled ? 'Enabled' : 'Disabled'}
                        </span>
                      </td>
                      <td className="px-4 md:px-6 py-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEdit(website)}
                            className="p-2 hover:bg-slate-700 rounded"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4 text-blue-400" />
                          </button>
                          <button
                            onClick={() => handleDelete(website.id)}
                            className="p-2 hover:bg-slate-700 rounded"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4 text-red-400" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

