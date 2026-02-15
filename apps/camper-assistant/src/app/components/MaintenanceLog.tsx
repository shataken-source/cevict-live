'use client';

import { useState, useMemo } from 'react';
import {
  Wrench,
  Car,
  Gauge,
  Zap,
  Droplets,
  Calendar,
  Plus,
  AlertTriangle,
  CheckCircle,
  Clock,
  History,
  Trash2,
  Edit2,
  Filter,
  Bell,
  Milestone,
  Settings
} from 'lucide-react';

type MaintenanceType = 'oil' | 'tire' | 'generator' | 'repair' | 'inspection' | 'water' | 'other';
type Priority = 'low' | 'medium' | 'high' | 'urgent';

interface MaintenanceItem {
  id: string;
  type: MaintenanceType;
  title: string;
  description: string;
  date: string;
  mileage?: number;
  cost?: number;
  priority: Priority;
  status: 'completed' | 'due' | 'overdue' | 'scheduled';
  nextDue?: string;
  nextDueMileage?: number;
  parts?: string[];
  notes: string;
  completedDate?: string;
}

const MAINTENANCE_TYPES: { type: MaintenanceType; icon: any; label: string; color: string }[] = [
  { type: 'oil', icon: Droplets, label: 'Oil Change', color: 'text-amber-400 bg-amber-900/30 border-amber-700/50' },
  { type: 'tire', icon: Car, label: 'Tires', color: 'text-slate-400 bg-slate-900/30 border-slate-700/50' },
  { type: 'generator', icon: Zap, label: 'Generator', color: 'text-yellow-400 bg-yellow-900/30 border-yellow-700/50' },
  { type: 'repair', icon: Wrench, label: 'Repair', color: 'text-red-400 bg-red-900/30 border-red-700/50' },
  { type: 'inspection', icon: CheckCircle, label: 'Inspection', color: 'text-emerald-400 bg-emerald-900/30 border-emerald-700/50' },
  { type: 'water', icon: Droplets, label: 'Water System', color: 'text-blue-400 bg-blue-900/30 border-blue-700/50' },
  { type: 'other', icon: Settings, label: 'Other', color: 'text-purple-400 bg-purple-900/30 border-purple-700/50' },
];

const PRIORITY_COLORS: Record<Priority, string> = {
  low: 'text-slate-400 bg-slate-700',
  medium: 'text-blue-400 bg-blue-900/30',
  high: 'text-amber-400 bg-amber-900/30',
  urgent: 'text-red-400 bg-red-900/30 animate-pulse',
};

const STATUS_COLORS: Record<string, string> = {
  completed: 'text-emerald-400 bg-emerald-900/20 border-emerald-700/30',
  due: 'text-amber-400 bg-amber-900/20 border-amber-700/30',
  overdue: 'text-red-400 bg-red-900/20 border-red-700/30',
  scheduled: 'text-blue-400 bg-blue-900/20 border-blue-700/30',
};

export default function MaintenanceLog() {
  const [items, setItems] = useState<MaintenanceItem[]>([
    {
      id: '1',
      type: 'oil',
      title: 'Engine Oil Change',
      description: 'Full synthetic 5W-30',
      date: '2026-01-15',
      mileage: 45200,
      cost: 85,
      priority: 'medium',
      status: 'completed',
      nextDue: '2026-04-15',
      nextDueMileage: 48200,
      notes: 'Used Mobil 1 synthetic',
      completedDate: '2026-01-15',
    },
    {
      id: '2',
      type: 'generator',
      title: 'Generator Service',
      description: 'Oil, filter, spark plug',
      date: '2026-02-01',
      cost: 45,
      priority: 'high',
      status: 'due',
      nextDue: '2026-03-01',
      notes: 'Onan 4000 - 150 hours',
    },
    {
      id: '3',
      type: 'tire',
      title: 'Tire Rotation & Inspection',
      description: 'Check tread depth, rotate',
      date: '2026-02-10',
      priority: 'medium',
      status: 'scheduled',
      nextDue: '2026-05-10',
      notes: 'All tires at 6/32',
    },
    {
      id: '4',
      type: 'repair',
      title: 'Roof Seal Inspection',
      description: 'Check Dicor seals, touch up',
      date: '2025-11-20',
      cost: 25,
      priority: 'low',
      status: 'overdue',
      notes: 'Found small crack near vent',
      completedDate: '2025-11-20',
    },
  ]);

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingItem, setEditingItem] = useState<MaintenanceItem | null>(null);
  const [filterType, setFilterType] = useState<MaintenanceType | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [currentMileage, setCurrentMileage] = useState(46750);
  const [activeView, setActiveView] = useState<'all' | 'due' | 'history'>('all');

  // Form state
  const [formData, setFormData] = useState<Partial<MaintenanceItem>>({
    type: 'oil',
    title: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    priority: 'medium',
    status: 'scheduled',
    notes: '',
  });

  const stats = useMemo(() => {
    const total = items.length;
    const completed = items.filter(i => i.status === 'completed').length;
    const due = items.filter(i => i.status === 'due').length;
    const overdue = items.filter(i => i.status === 'overdue').length;
    const totalCost = items.reduce((sum, i) => sum + (i.cost || 0), 0);
    const upcoming = items.filter(i => i.status === 'scheduled' || i.status === 'due');

    return { total, completed, due, overdue, totalCost, upcoming };
  }, [items]);

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesType = filterType === 'all' || item.type === filterType;
      const matchesStatus = filterStatus === 'all' || item.status === filterStatus;

      if (activeView === 'due') {
        return matchesType && (item.status === 'due' || item.status === 'overdue');
      }
      if (activeView === 'history') {
        return matchesType && item.status === 'completed';
      }
      return matchesType && matchesStatus;
    }).sort((a, b) => {
      // Sort by date, overdue first
      if (a.status === 'overdue' && b.status !== 'overdue') return -1;
      if (b.status === 'overdue' && a.status !== 'overdue') return 1;
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
  }, [items, filterType, filterStatus, activeView]);

  const handleSave = () => {
    if (!formData.title || !formData.date) return;

    const newItem: MaintenanceItem = {
      id: editingItem?.id || Date.now().toString(),
      type: formData.type as MaintenanceType,
      title: formData.title || '',
      description: formData.description || '',
      date: formData.date || '',
      mileage: formData.mileage,
      cost: formData.cost,
      priority: formData.priority as Priority,
      status: formData.status as any,
      nextDue: formData.nextDue,
      nextDueMileage: formData.nextDueMileage,
      notes: formData.notes || '',
      completedDate: formData.status === 'completed' ? formData.date : undefined,
    };

    if (editingItem) {
      setItems(prev => prev.map(i => i.id === editingItem.id ? newItem : i));
    } else {
      setItems(prev => [newItem, ...prev]);
    }

    setShowAddForm(false);
    setEditingItem(null);
    setFormData({
      type: 'oil',
      title: '',
      description: '',
      date: new Date().toISOString().split('T')[0],
      priority: 'medium',
      status: 'scheduled',
      notes: '',
    });
  };

  const handleDelete = (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const handleEdit = (item: MaintenanceItem) => {
    setEditingItem(item);
    setFormData({ ...item });
    setShowAddForm(true);
  };

  const markComplete = (id: string) => {
    setItems(prev => prev.map(i =>
      i.id === id
        ? { ...i, status: 'completed', completedDate: new Date().toISOString().split('T')[0] }
        : i
    ));
  };

  const getTypeConfig = (type: MaintenanceType) =>
    MAINTENANCE_TYPES.find(t => t.type === type) || MAINTENANCE_TYPES[6];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <div className="flex items-center gap-3 mb-2">
          <Wrench className="w-6 h-6 text-amber-400" />
          <h2 className="text-xl font-semibold">Maintenance Log</h2>
        </div>
        <p className="text-slate-400">Track RV/vehicle maintenance, oil changes, tires, and repairs.</p>
      </div>

      {/* Stats & Mileage */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <div className="text-2xl font-bold text-white">{stats.total}</div>
          <div className="text-xs text-slate-400">Total Records</div>
        </div>
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <div className="text-2xl font-bold text-emerald-400">{stats.completed}</div>
          <div className="text-xs text-slate-400">Completed</div>
        </div>
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <div className="text-2xl font-bold text-amber-400">{stats.due}</div>
          <div className="text-xs text-slate-400">Due Now</div>
        </div>
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <div className="text-2xl font-bold text-red-400">{stats.overdue}</div>
          <div className="text-xs text-slate-400">Overdue</div>
        </div>
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700 col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-purple-400">${stats.totalCost}</div>
              <div className="text-xs text-slate-400">Total Spent</div>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-2">
                <Milestone className="w-4 h-4 text-blue-400" />
                <input
                  type="number"
                  value={currentMileage}
                  onChange={(e) => setCurrentMileage(parseInt(e.target.value) || 0)}
                  className="w-24 bg-slate-700 border border-slate-600 rounded px-2 py-1 text-right text-sm"
                />
              </div>
              <div className="text-xs text-slate-400">Current Miles</div>
            </div>
          </div>
        </div>
      </div>

      {/* View Toggle & Filters */}
      <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
        <div className="flex flex-wrap gap-3 items-center justify-between">
          <div className="flex gap-2">
            {[
              { id: 'all', label: 'All Items', icon: Filter },
              { id: 'due', label: 'Due/Overdue', icon: AlertTriangle },
              { id: 'history', label: 'History', icon: History },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveView(id as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeView === id
                    ? 'bg-emerald-500 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm"
            >
              <option value="all">All Types</option>
              {MAINTENANCE_TYPES.map(t => (
                <option key={t.type} value={t.type}>{t.label}</option>
              ))}
            </select>

            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Entry
            </button>
          </div>
        </div>
      </div>

      {/* Add/Edit Form */}
      {showAddForm && (
        <div className="bg-slate-800 rounded-xl p-4 border border-emerald-700/50">
          <h3 className="font-semibold text-emerald-400 mb-4 flex items-center gap-2">
            <Edit2 className="w-4 h-4" />
            {editingItem ? 'Edit Entry' : 'New Maintenance Entry'}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="text-sm text-slate-400 block mb-1">Type</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as MaintenanceType })}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2"
              >
                {MAINTENANCE_TYPES.map(t => (
                  <option key={t.type} value={t.type}>{t.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm text-slate-400 block mb-1">Title *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Oil Change"
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2"
              />
            </div>

            <div>
              <label className="text-sm text-slate-400 block mb-1">Description</label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief details"
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2"
              />
            </div>

            <div>
              <label className="text-sm text-slate-400 block mb-1">Date *</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2"
              />
            </div>

            <div>
              <label className="text-sm text-slate-400 block mb-1">Mileage</label>
              <input
                type="number"
                value={formData.mileage || ''}
                onChange={(e) => setFormData({ ...formData, mileage: parseInt(e.target.value) || undefined })}
                placeholder={currentMileage.toString()}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2"
              />
            </div>

            <div>
              <label className="text-sm text-slate-400 block mb-1">Cost ($)</label>
              <input
                type="number"
                value={formData.cost || ''}
                onChange={(e) => setFormData({ ...formData, cost: parseInt(e.target.value) || undefined })}
                placeholder="0"
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2"
              />
            </div>

            <div>
              <label className="text-sm text-slate-400 block mb-1">Priority</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as Priority })}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            <div>
              <label className="text-sm text-slate-400 block mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2"
              >
                <option value="scheduled">Scheduled</option>
                <option value="due">Due</option>
                <option value="overdue">Overdue</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            <div>
              <label className="text-sm text-slate-400 block mb-1">Next Due Date</label>
              <input
                type="date"
                value={formData.nextDue || ''}
                onChange={(e) => setFormData({ ...formData, nextDue: e.target.value || undefined })}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2"
              />
            </div>

            <div>
              <label className="text-sm text-slate-400 block mb-1">Next Due Mileage</label>
              <input
                type="number"
                value={formData.nextDueMileage || ''}
                onChange={(e) => setFormData({ ...formData, nextDueMileage: parseInt(e.target.value) || undefined })}
                placeholder="e.g., 3000 miles from now"
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2"
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="text-sm text-slate-400 block mb-1">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Parts used, shop info, warranty details..."
              rows={3}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2"
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleSave}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-lg font-medium transition-colors"
            >
              {editingItem ? 'Update Entry' : 'Save Entry'}
            </button>
            <button
              onClick={() => {
                setShowAddForm(false);
                setEditingItem(null);
              }}
              className="px-6 bg-slate-700 hover:bg-slate-600 text-slate-300 py-2 rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Items List */}
      <div className="space-y-3">
        {filteredItems.map((item) => {
          const typeConfig = getTypeConfig(item.type);
          const Icon = typeConfig.icon;
          const daysUntilDue = item.nextDue
            ? Math.ceil((new Date(item.nextDue).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
            : null;
          const milesUntilDue = item.nextDueMileage ? item.nextDueMileage - currentMileage : null;

          return (
            <div
              key={item.id}
              className="bg-slate-800 rounded-xl p-4 border border-slate-700 hover:border-slate-600 transition-colors"
            >
              <div className="flex items-start gap-4">
                {/* Type Icon */}
                <div className={`p-3 rounded-lg ${typeConfig.color}`}>
                  <Icon className="w-5 h-5" />
                </div>

                {/* Main Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-semibold text-white">{item.title}</h4>
                        <span className={`text-xs px-2 py-0.5 rounded ${PRIORITY_COLORS[item.priority]}`}>
                          {item.priority}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded border ${STATUS_COLORS[item.status]}`}>
                          {item.status}
                        </span>
                      </div>
                      <p className="text-sm text-slate-400 mt-0.5">{item.description}</p>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-1">
                      {item.status !== 'completed' && (
                        <button
                          onClick={() => markComplete(item.id)}
                          className="p-2 bg-emerald-900/30 text-emerald-400 rounded-lg hover:bg-emerald-900/50 transition-colors"
                          title="Mark Complete"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleEdit(item)}
                        className="p-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition-colors"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-2 bg-slate-700 text-red-400 rounded-lg hover:bg-red-900/30 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Details Row */}
                  <div className="flex flex-wrap items-center gap-4 mt-3 text-sm">
                    <span className="text-slate-400 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {item.date}
                      {item.completedDate && item.completedDate !== item.date && (
                        <span className="text-emerald-400"> (Completed: {item.completedDate})</span>
                      )}
                    </span>

                    {item.mileage && (
                      <span className="text-slate-400 flex items-center gap-1">
                        <Milestone className="w-3 h-3" />
                        {item.mileage.toLocaleString()} mi
                      </span>
                    )}

                    {item.cost && (
                      <span className="text-emerald-400 font-medium">
                        ${item.cost}
                      </span>
                    )}
                  </div>

                  {/* Due/Next Info */}
                  {(daysUntilDue !== null || milesUntilDue !== null) && item.status !== 'completed' && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {daysUntilDue !== null && (
                        <span className={`text-xs flex items-center gap-1 ${daysUntilDue < 0 ? 'text-red-400' :
                            daysUntilDue < 7 ? 'text-amber-400' : 'text-emerald-400'
                          }`}>
                          <Bell className="w-3 h-3" />
                          {daysUntilDue < 0
                            ? `${Math.abs(daysUntilDue)} days overdue`
                            : daysUntilDue === 0
                              ? 'Due today!'
                              : `${daysUntilDue} days until due`
                          }
                        </span>
                      )}
                      {milesUntilDue !== null && (
                        <span className={`text-xs flex items-center gap-1 ${milesUntilDue < 0 ? 'text-red-400' :
                            milesUntilDue < 500 ? 'text-amber-400' : 'text-emerald-400'
                          }`}>
                          <Gauge className="w-3 h-3" />
                          {milesUntilDue < 0
                            ? `${Math.abs(milesUntilDue)} miles overdue`
                            : `${milesUntilDue.toLocaleString()} miles until service`
                          }
                        </span>
                      )}
                    </div>
                  )}

                  {/* Notes */}
                  {item.notes && (
                    <p className="mt-2 text-sm text-slate-500 bg-slate-900/50 rounded-lg p-2">
                      {item.notes}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {filteredItems.length === 0 && (
          <div className="text-center py-12 bg-slate-800/50 rounded-xl border border-slate-700 border-dashed">
            <Wrench className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400">No maintenance items found.</p>
            <p className="text-sm text-slate-500 mt-1">Add your first entry to start tracking.</p>
          </div>
        )}
      </div>

      {/* Tips */}
      <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 mt-0.5" />
          <div className="text-sm text-slate-400">
            <p className="mb-1"><strong className="text-slate-300">RV Maintenance Tips:</strong></p>
            <ul className="space-y-1 list-disc list-inside">
              <li>Change generator oil every 150 hours or annually</li>
              <li>Check roof seals every 6 months (Dicor inspection)</li>
              <li>Rotate tires every 5,000-8,000 miles</li>
              <li>Service water heater annually (anode rod check)</li>
              <li>Test smoke/CO detectors monthly</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
