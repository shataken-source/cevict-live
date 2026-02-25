'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import {
  Plus, Trash2, Pencil, X, Globe, Phone, Mail, Bell,
  ArrowLeft, Activity, ExternalLink, Check, Loader2,
} from 'lucide-react';
import Link from 'next/link';

/* ── Types ────────────────────────────────────────── */
interface Website { id: string; name: string; url: string; check_interval: number; enabled: boolean }
interface AlertConfig { sms_phone: string; email: string; critical_only: boolean }

/* ── Shared input class ───────────────────────────── */
const inputCls = 'w-full bg-white/[0.03] border border-white/[0.06] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-sky-500/40 transition';
const btnPrimary = 'bg-sky-500/15 hover:bg-sky-500/25 text-sky-400 px-4 py-2 rounded-xl text-xs font-medium transition disabled:opacity-40';
const btnDanger = 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 p-2 rounded-lg transition';
const btnGhost = 'bg-white/[0.03] hover:bg-white/[0.06] text-slate-300 px-4 py-2 rounded-xl text-xs font-medium transition';

export default function AdminPanel() {
  const [websites, setWebsites] = useState<Website[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', url: '', check_interval: '60', enabled: true });
  const [alertConfig, setAlertConfig] = useState<AlertConfig>({ sms_phone: '', email: '', critical_only: true });
  const [statusPageSlug, setStatusPageSlug] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);

  const flash = (msg: string, type: 'ok' | 'err' = 'ok') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };

  useEffect(() => { fetchWebsites(); fetchAlertConfig(); fetchAccount(); }, []);

  const fetchAccount = async () => { try { const r = await fetch('/api/admin/account'); if (r.ok) { const d = await r.json(); setStatusPageSlug(d.status_page_slug ?? ''); } } catch { } };
  const fetchWebsites = async () => { try { const r = await fetch('/api/websites'); if (r.ok) { const d = await r.json(); setWebsites(d.websites || []); } } catch { } finally { setLoading(false); } };
  const fetchAlertConfig = async () => { try { const r = await fetch('/api/admin/config'); if (r.ok) { const d = await r.json(); if (d.config) setAlertConfig(d.config); } } catch { } };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingId) {
        const r = await fetch('/api/websites', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editingId, name: formData.name, url: formData.url, check_interval: parseInt(formData.check_interval), enabled: formData.enabled }) });
        if (!r.ok) throw new Error('Failed to update');
        const d = await r.json();
        setWebsites(websites.map(w => w.id === editingId ? d.website : w));
        flash('Website updated');
      } else {
        const r = await fetch('/api/websites', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: formData.name, url: formData.url, check_interval: parseInt(formData.check_interval), enabled: formData.enabled }) });
        const d = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(d.error || d.details || 'Failed to create');
        setWebsites([d.website, ...websites]);
        flash('Website added');
      }
      setShowAddForm(false); setEditingId(null);
      setFormData({ name: '', url: '', check_interval: '60', enabled: true });
    } catch (err: any) { flash(err.message || 'Save failed', 'err'); } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this website from monitoring?')) return;
    try { const r = await fetch(`/api/websites?id=${id}`, { method: 'DELETE' }); if (!r.ok) throw new Error(); setWebsites(websites.filter(w => w.id !== id)); flash('Website removed'); } catch { flash('Delete failed', 'err'); }
  };

  const handleEdit = (w: Website) => { setFormData({ name: w.name, url: w.url, check_interval: w.check_interval.toString(), enabled: w.enabled }); setEditingId(w.id); setShowAddForm(true); };

  const handleSaveAlerts = async () => {
    setSaving(true);
    try { const r = await fetch('/api/admin/config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(alertConfig) }); const d = await r.json(); if (!r.ok) throw new Error(d.error || 'Failed'); flash('Alert config saved'); } catch (err: any) { flash(err.message || 'Save failed', 'err'); } finally { setSaving(false); }
  };

  const handleSaveSlug = async () => {
    setSaving(true);
    try { const r = await fetch('/api/admin/account', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status_page_slug: statusPageSlug }) }); const d = await r.json(); if (!r.ok) throw new Error(d.error || 'Failed'); setStatusPageSlug(d.status_page_slug ?? ''); flash('Status page slug saved'); } catch (err: any) { flash(err.message || 'Save failed', 'err'); } finally { setSaving(false); }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-sky-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Toast */}
        {toast && (
          <div className={`fixed top-4 right-4 z-50 px-4 py-2.5 rounded-xl text-sm font-medium animate-fade-in ${toast.type === 'ok' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/15 text-rose-400 border border-rose-500/20'}`}>
            {toast.msg}
          </div>
        )}

        {/* Header */}
        <header className="flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-3">
            <Link href="/" className="p-2 rounded-lg hover:bg-white/5 transition text-slate-400" title="Back to dashboard">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-lg font-bold tracking-tight">Admin</h1>
              <p className="text-xs text-slate-500">Manage sites, alerts & settings</p>
            </div>
          </div>
        </header>

        {/* ── Alert Configuration ─────────────────── */}
        <section className="glass p-5 animate-fade-in">
          <h2 className="text-sm font-semibold mb-4 flex items-center gap-2"><Bell className="w-4 h-4 text-violet-400" /> Alert Configuration</h2>
          <div className="grid sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="kpi-label flex items-center gap-1.5 mb-1.5"><Phone className="w-3 h-3" /> SMS Phone</label>
              <input type="tel" value={alertConfig.sms_phone} onChange={e => setAlertConfig({ ...alertConfig, sms_phone: e.target.value })} className={inputCls} placeholder="2562645669" />
            </div>
            <div>
              <label className="kpi-label flex items-center gap-1.5 mb-1.5"><Mail className="w-3 h-3" /> Email</label>
              <input type="email" value={alertConfig.email} onChange={e => setAlertConfig({ ...alertConfig, email: e.target.value })} className={inputCls} placeholder="alerts@example.com" />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-400 mb-4 cursor-pointer">
            <input type="checkbox" checked={alertConfig.critical_only} onChange={e => setAlertConfig({ ...alertConfig, critical_only: e.target.checked })} className="w-3.5 h-3.5 rounded accent-violet-500" />
            Critical alerts only
          </label>
          <button onClick={handleSaveAlerts} disabled={saving} className={btnPrimary}>{saving ? 'Saving...' : 'Save alerts'}</button>
        </section>

        {/* ── Status Page Slug ────────────────────── */}
        <section className="glass p-5 animate-fade-in">
          <h2 className="text-sm font-semibold mb-2">Public Status Page</h2>
          <p className="text-xs text-slate-500 mb-3">Set a slug for a public URL like <strong className="text-slate-400">/status/your-slug</strong></p>
          <div className="flex items-center gap-2">
            <input type="text" value={statusPageSlug} onChange={e => setStatusPageSlug(e.target.value.replace(/[^a-z0-9-_]/gi, '').toLowerCase())} className={`${inputCls} max-w-[200px]`} placeholder="my-status" />
            <button onClick={handleSaveSlug} disabled={saving} className={btnPrimary}>{saving ? 'Saving...' : 'Save'}</button>
          </div>
        </section>

        {/* ── Websites ────────────────────────────── */}
        <section className="glass p-5 animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold flex items-center gap-2"><Globe className="w-4 h-4 text-sky-400" /> Monitored Websites</h2>
            <button onClick={() => { setShowAddForm(true); setEditingId(null); setFormData({ name: '', url: '', check_interval: '60', enabled: true }); }} className={btnPrimary + ' flex items-center gap-1.5'}>
              <Plus className="w-3.5 h-3.5" /> Add site
            </button>
          </div>

          {/* Add/Edit Form */}
          {showAddForm && (
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4 mb-4 animate-fade-in">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold">{editingId ? 'Edit Website' : 'Add Website'}</h3>
                <button onClick={() => { setShowAddForm(false); setEditingId(null); }} className="p-1 rounded hover:bg-white/5 text-slate-500" title="Cancel"><X className="w-4 h-4" /></button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="kpi-label mb-1 block">Name</label>
                    <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className={inputCls} required />
                  </div>
                  <div>
                    <label className="kpi-label mb-1 block">URL</label>
                    <input type="url" value={formData.url} onChange={e => setFormData({ ...formData, url: e.target.value })} className={inputCls} placeholder="https://example.com" required />
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="kpi-label mb-1 block">Check interval (seconds)</label>
                    <input type="number" value={formData.check_interval} onChange={e => setFormData({ ...formData, check_interval: e.target.value })} className={inputCls} min="30" required />
                  </div>
                  <div className="flex items-end pb-1">
                    <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer">
                      <input type="checkbox" checked={formData.enabled} onChange={e => setFormData({ ...formData, enabled: e.target.checked })} className="w-3.5 h-3.5 rounded accent-sky-500" />
                      Enabled
                    </label>
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  <button type="submit" disabled={saving} className={btnPrimary}>{saving ? 'Saving...' : editingId ? 'Update' : 'Add'}</button>
                  <button type="button" onClick={() => { setShowAddForm(false); setEditingId(null); }} className={btnGhost}>Cancel</button>
                </div>
              </form>
            </div>
          )}

          {/* Website list */}
          {websites.length === 0 ? (
            <p className="text-center text-slate-600 text-sm py-8">No websites configured yet.</p>
          ) : (
            <div className="space-y-2">
              {websites.map(w => (
                <div key={w.id} className="flex items-center justify-between bg-white/[0.02] rounded-xl px-4 py-3 group hover:bg-white/[0.04] transition">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${w.enabled ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{w.name}</div>
                      <div className="text-xs text-slate-500 truncate flex items-center gap-1">
                        {w.url.replace(/^https?:\/\//, '')}
                        <span className="text-slate-600">· {w.check_interval}s</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition shrink-0">
                    <a href={w.url} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg hover:bg-white/5 text-slate-500" title="Open site"><ExternalLink className="w-3.5 h-3.5" /></a>
                    <button onClick={() => handleEdit(w)} className="p-2 rounded-lg hover:bg-white/5 text-sky-400" title="Edit"><Pencil className="w-3.5 h-3.5" /></button>
                    <button onClick={() => handleDelete(w.id)} className="p-2 rounded-lg hover:bg-white/5 text-rose-400" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
