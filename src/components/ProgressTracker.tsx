import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Plus, X, TrendingUp, Weight } from 'lucide-react';
import { ProgressEntry } from '../types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ProgressTrackerProps {
  onAddProgress: (entry: Omit<ProgressEntry, 'id' | 'createdAt' | 'userId'>) => void;
  progressHistory: ProgressEntry[];
  isLoading?: boolean;
}

export const ProgressTracker: React.FC<ProgressTrackerProps> = ({
  onAddProgress,
  progressHistory,
  isLoading = false,
}) => {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    weight: '',
    chest: '',
    waist: '',
    hips: '',
    thighs: '',
    arms: '',
    notes: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const entry: Omit<ProgressEntry, 'id' | 'createdAt' | 'userId'> = {
      date: formData.date,
      weight: formData.weight ? parseFloat(formData.weight) : undefined,
      measurements: {
        chest: formData.chest ? parseFloat(formData.chest) : undefined,
        waist: formData.waist ? parseFloat(formData.waist) : undefined,
        hips: formData.hips ? parseFloat(formData.hips) : undefined,
        thighs: formData.thighs ? parseFloat(formData.thighs) : undefined,
        arms: formData.arms ? parseFloat(formData.arms) : undefined,
      },
      notes: formData.notes || undefined,
    };

    onAddProgress(entry);
    setFormData({
      date: new Date().toISOString().split('T')[0],
      weight: '',
      chest: '',
      waist: '',
      hips: '',
      thighs: '',
      arms: '',
      notes: '',
    });
    setShowForm(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="space-y-6">
      {/* Add Progress Button */}
      <motion.button
        onClick={() => setShowForm(!showForm)}
        className={cn(
          "w-full py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2",
          showForm
            ? "bg-slate-200 text-slate-900 hover:bg-slate-300"
            : "bg-emerald-500 text-white hover:bg-emerald-600 shadow-lg"
        )}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <Plus className="w-5 h-5" />
        {showForm ? 'Cancel' : 'Add Progress Entry'}
      </motion.button>

      {/* Form */}
      {showForm && (
        <motion.form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl p-6 border border-slate-200 shadow-lg space-y-4"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
        >
          <h3 className="text-lg font-bold text-slate-900 mb-4">Log Your Progress</h3>

          {/* Date */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Date</label>
            <input
              type="date"
              name="date"
              value={formData.date}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
            />
          </div>

          {/* Weight */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              <Weight className="w-4 h-4 inline mr-2" />
              Weight (kg)
            </label>
            <input
              type="number"
              name="weight"
              placeholder="e.g., 75"
              value={formData.weight}
              onChange={handleInputChange}
              step="0.1"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
            />
          </div>

          {/* Measurements */}
          <div className="bg-slate-50 p-4 rounded-lg">
            <h4 className="font-semibold text-slate-700 mb-3 text-sm">Body Measurements (cm)</h4>
            <div className="grid grid-cols-2 gap-3">
              {[
                { name: 'chest', label: 'Chest' },
                { name: 'waist', label: 'Waist' },
                { name: 'hips', label: 'Hips' },
                { name: 'thighs', label: 'Thighs' },
                { name: 'arms', label: 'Arms' },
              ].map(({ name, label }) => (
                <div key={name}>
                  <label className="text-xs font-semibold text-slate-600 mb-1 block">{label}</label>
                  <input
                    type="number"
                    name={name}
                    placeholder={label}
                    value={formData[name as keyof typeof formData]}
                    onChange={handleInputChange}
                    step="0.5"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Notes</label>
            <textarea
              name="notes"
              placeholder="How did you feel? Any observations?"
              value={formData.notes}
              onChange={handleInputChange}
              rows={3}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none resize-none"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading || (!formData.weight && !Object.values({ ...formData }).some(v => v))}
            className="w-full bg-emerald-500 text-white py-2 rounded-lg font-semibold hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? 'Saving...' : 'Save Progress'}
          </button>
        </motion.form>
      )}

      {/* Progress History */}
      <div className="space-y-3">
        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-emerald-500" />
          Recent Progress
        </h3>

        {progressHistory.length === 0 ? (
          <div className="bg-slate-50 rounded-xl p-8 text-center">
            <p className="text-slate-600">No progress entries yet. Start logging to track your journey!</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {progressHistory.slice(0, 10).map((entry, idx) => (
              <motion.div
                key={entry.id}
                className="bg-white rounded-lg p-4 border border-slate-200 hover:border-emerald-300 hover:shadow-md transition-all"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-semibold text-slate-900">
                      {new Date(entry.date).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm text-slate-600">
                  {entry.weight && (
                    <div className="flex items-center gap-2">
                      <Weight className="w-4 h-4 text-emerald-500" />
                      <span>{entry.weight} kg</span>
                    </div>
                  )}
                  {entry.measurements && (
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-blue-500" />
                      <span>
                        {[
                          entry.measurements.chest,
                          entry.measurements.waist,
                          entry.measurements.hips,
                        ]
                          .filter(Boolean)
                          .length > 0
                          ? 'Measurements logged'
                          : ''}
                      </span>
                    </div>
                  )}
                </div>

                {entry.notes && (
                  <p className="text-xs text-slate-500 italic mt-2 border-t border-slate-100 pt-2">
                    "{entry.notes}"
                  </p>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProgressTracker;
