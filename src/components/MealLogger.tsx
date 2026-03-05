import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, X, Utensils, Target, CheckCircle2, Zap } from 'lucide-react';
import { MealLog, Milestone, MealType } from '../types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface MealLoggerProps {
  onLogMeal: (meal: Omit<MealLog, 'id' | 'createdAt' | 'userId'>) => void;
  todayMeals: MealLog[];
  isLoading?: boolean;
}

interface MilestoneTrackerProps {
  milestones: Milestone[];
  onAddMilestone: (milestone: Omit<Milestone, 'id' | 'createdAt'>) => void;
  onUpdateMilestone: (milestoneId: string, updates: Partial<Milestone>) => void;
  isLoading?: boolean;
}

export const MealLogger: React.FC<MealLoggerProps> = ({
  onLogMeal,
  todayMeals,
  isLoading = false,
}) => {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    mealType: 'breakfast' as MealType,
    foodItems: [{ name: '', quantity: '', calories: '', protein: '', carbs: '', fats: '' }],
    notes: '',
  });

  const mealLabels: Record<MealType, string> = {
    breakfast: '🌅 Breakfast',
    lunch: '🌤️ Lunch',
    dinner: '🌙 Dinner',
    snack: '🍎 Snack',
  };

  const handleAddFoodItem = () => {
    setFormData(prev => ({
      ...prev,
      foodItems: [...prev.foodItems, { name: '', quantity: '', calories: '', protein: '', carbs: '', fats: '' }],
    }));
  };

  const handleRemoveFoodItem = (idx: number) => {
    setFormData(prev => ({
      ...prev,
      foodItems: prev.foodItems.filter((_, i) => i !== idx),
    }));
  };

  const handleFoodItemChange = (idx: number, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      foodItems: prev.foodItems.map((item, i) => i === idx ? { ...item, [field]: value } : item),
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const meal: Omit<MealLog, 'id' | 'createdAt' | 'userId'> = {
      date: new Date().toISOString().split('T')[0],
      mealType: formData.mealType,
      foodItems: formData.foodItems
        .filter(item => item.name)
        .map(item => ({
          name: item.name,
          quantity: item.quantity,
          calories: item.calories ? parseInt(item.calories) : undefined,
          protein: item.protein ? parseFloat(item.protein) : undefined,
          carbs: item.carbs ? parseFloat(item.carbs) : undefined,
          fats: item.fats ? parseFloat(item.fats) : undefined,
        })),
      notes: formData.notes || undefined,
    };

    if (meal.foodItems.length > 0) {
      onLogMeal(meal);
      setFormData({
        mealType: 'breakfast' as MealType,
        foodItems: [{ name: '', quantity: '', calories: '', protein: '', carbs: '', fats: '' }],
        notes: '',
      });
      setShowForm(false);
    }
  };

  const calculateTotalCalories = () => {
    return todayMeals.reduce((total, meal) => {
      const mealCals = meal.foodItems.reduce((sum, item) => sum + (item.calories || 0), 0);
      return total + mealCals;
    }, 0);
  };

  const calculateTotalProtein = () => {
    return todayMeals.reduce((total, meal) => {
      const mealProtein = meal.foodItems.reduce((sum, item) => sum + (item.protein || 0), 0);
      return total + mealProtein;
    }, 0);
  };

  return (
    <div className="space-y-6">
      {/* Add Meal Button */}
      <motion.button
        onClick={() => setShowForm(!showForm)}
        className={cn(
          "w-full py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2",
          showForm
            ? "bg-slate-200 text-slate-900 hover:bg-slate-300"
            : "bg-amber-500 text-white hover:bg-amber-600 shadow-lg"
        )}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <Plus className="w-5 h-5" />
        {showForm ? 'Cancel' : 'Log Meal'}
      </motion.button>

      {/* Form */}
      <AnimatePresence>
        {showForm && (
          <motion.form
            onSubmit={handleSubmit}
            className="bg-white rounded-2xl p-6 border border-slate-200 shadow-lg space-y-4"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <h3 className="text-lg font-bold text-slate-900 mb-4">Log Your Meal</h3>

            {/* Meal Type */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Meal Type</label>
              <select
                value={formData.mealType}
                onChange={e => setFormData(prev => ({ ...prev, mealType: e.target.value as MealType }))}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none"
              >
                {(Object.entries(mealLabels) as [MealType, string][]).map(([type, label]) => (
                  <option key={type} value={type}>{label}</option>
                ))}
              </select>
            </div>

            {/* Food Items */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Food Items</label>
              <div className="space-y-3">
                {formData.foodItems.map((item, idx) => (
                  <div key={idx} className="bg-slate-50 p-3 rounded-lg space-y-2">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-slate-600">Item {idx + 1}</span>
                      {formData.foodItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveFoodItem(idx)}
                          className="text-red-500 hover:text-red-700 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <input
                      type="text"
                      placeholder="Food name"
                      value={item.name}
                      onChange={e => handleFoodItemChange(idx, 'name', e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Quantity"
                        value={item.quantity}
                        onChange={e => handleFoodItemChange(idx, 'quantity', e.target.value)}
                        className="px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none"
                      />
                      <input
                        type="number"
                        placeholder="Calories"
                        value={item.calories}
                        onChange={e => handleFoodItemChange(idx, 'calories', e.target.value)}
                        className="px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none"
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <input
                        type="number"
                        placeholder="Protein (g)"
                        value={item.protein}
                        onChange={e => handleFoodItemChange(idx, 'protein', e.target.value)}
                        className="px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none"
                      />
                      <input
                        type="number"
                        placeholder="Carbs (g)"
                        value={item.carbs}
                        onChange={e => handleFoodItemChange(idx, 'carbs', e.target.value)}
                        className="px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none"
                      />
                      <input
                        type="number"
                        placeholder="Fats (g)"
                        value={item.fats}
                        onChange={e => handleFoodItemChange(idx, 'fats', e.target.value)}
                        className="px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none"
                      />
                    </div>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={handleAddFoodItem}
                className="mt-3 w-full px-4 py-2 border-2 border-dashed border-amber-300 text-amber-600 rounded-lg hover:bg-amber-50 transition-colors font-semibold text-sm"
              >
                + Add Another Item
              </button>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Notes</label>
              <textarea
                placeholder="Any notes about this meal?"
                value={formData.notes}
                onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                rows={2}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || formData.foodItems.every(item => !item.name)}
              className="w-full bg-amber-500 text-white py-2 rounded-lg font-semibold hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? 'Saving...' : 'Log Meal'}
            </button>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Today's Summary */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-lg">
        <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Utensils className="w-5 h-5 text-amber-500" />
          Today's Summary
        </h3>

        {todayMeals.length === 0 ? (
          <p className="text-slate-600 text-center py-4">No meals logged yet.</p>
        ) : (
          <div className="space-y-3">
            {/* Macro Summary */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-orange-50 rounded-lg p-3 border border-orange-200">
                <p className="text-xs font-semibold text-orange-700 mb-1">Calories</p>
                <p className="text-2xl font-bold text-orange-900">{calculateTotalCalories()}</p>
              </div>
              <div className="bg-red-50 rounded-lg p-3 border border-red-200">
                <p className="text-xs font-semibold text-red-700 mb-1">Protein</p>
                <p className="text-2xl font-bold text-red-900">{calculateTotalProtein().toFixed(1)}g</p>
              </div>
            </div>

            {/* Meals List */}
            <div className="space-y-2">
              {todayMeals.map((meal, idx) => (
                <div key={meal.id} className="bg-slate-50 rounded-lg p-3">
                  <p className="text-sm font-semibold text-slate-900 mb-1">
                    {mealLabels[meal.mealType]}
                  </p>
                  <p className="text-xs text-slate-600">
                    {meal.foodItems.map(item => item.name).join(', ')}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export const MilestoneTracker: React.FC<MilestoneTrackerProps> = ({
  milestones,
  onAddMilestone,
  onUpdateMilestone,
  isLoading = false,
}) => {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    goal: 'general-health' as const,
    metric: 'weight' as const,
    targetValue: '',
    dueDate: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const milestone: Omit<Milestone, 'id' | 'createdAt'> = {
      userId: '',
      title: formData.title,
      description: formData.description,
      goal: formData.goal as any,
      metric: formData.metric as any,
      targetValue: parseFloat(formData.targetValue),
      currentValue: 0,
      completed: false,
      dueDate: formData.dueDate || undefined,
    };

    onAddMilestone(milestone);
    setFormData({
      title: '',
      description: '',
      goal: 'general-health' as const,
      metric: 'weight' as const,
      targetValue: '',
      dueDate: '',
    });
    setShowForm(false);
  };

  const completedCount = milestones.filter(m => m.completed).length;
  const progress = milestones.length > 0 ? (completedCount / milestones.length) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Add Milestone Button */}
      <motion.button
        onClick={() => setShowForm(!showForm)}
        className={cn(
          "w-full py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2",
          showForm
            ? "bg-slate-200 text-slate-900 hover:bg-slate-300"
            : "bg-purple-500 text-white hover:bg-purple-600 shadow-lg"
        )}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <Plus className="w-5 h-5" />
        {showForm ? 'Cancel' : 'Add Milestone'}
      </motion.button>

      {/* Form */}
      <AnimatePresence>
        {showForm && (
          <motion.form
            onSubmit={handleSubmit}
            className="bg-white rounded-2xl p-6 border border-slate-200 shadow-lg space-y-4"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <h3 className="text-lg font-bold text-slate-900 mb-4">Create New Milestone</h3>

            <input
              type="text"
              placeholder="Milestone title"
              value={formData.title}
              onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
            />

            <textarea
              placeholder="Description"
              value={formData.description}
              onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={2}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none resize-none"
            />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Goal</label>
                <select
                  value={formData.goal}
                  onChange={e => setFormData(prev => ({ ...prev, goal: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-sm"
                >
                  <option value="general-health">General Health</option>
                  <option value="weight-loss">Weight Loss</option>
                  <option value="muscle-gain">Muscle Gain</option>
                  <option value="endurance">Endurance</option>
                  <option value="flexibility">Flexibility</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Metric</label>
                <select
                  value={formData.metric}
                  onChange={e => setFormData(prev => ({ ...prev, metric: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-sm"
                >
                  <option value="weight">Weight</option>
                  <option value="strength">Strength</option>
                  <option value="endurance">Endurance</option>
                  <option value="measurements">Measurements</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Target Value</label>
                <input
                  type="number"
                  placeholder="e.g., 70"
                  value={formData.targetValue}
                  onChange={e => setFormData(prev => ({ ...prev, targetValue: e.target.value }))}
                  step="0.1"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Due Date</label>
                <input
                  type="date"
                  value={formData.dueDate}
                  onChange={e => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-sm"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || !formData.title || !formData.targetValue}
              className="w-full bg-purple-500 text-white py-2 rounded-lg font-semibold hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? 'Creating...' : 'Create Milestone'}
            </button>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Milestones List */}
      <div className="space-y-4">
        {/* Progress Bar */}
        {milestones.length > 0 && (
          <div className="bg-white rounded-xl p-4 border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-slate-700">Overall Progress</span>
              <span className="text-sm font-bold text-purple-600">{completedCount} of {milestones.length}</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-purple-500 to-indigo-500"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.8 }}
              />
            </div>
          </div>
        )}

        {milestones.length === 0 ? (
          <div className="bg-slate-50 rounded-xl p-8 text-center">
            <Target className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-600">No milestones yet. Start setting goals!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {milestones.map((milestone, idx) => (
              <motion.div
                key={milestone.id}
                className={cn(
                  "rounded-xl p-4 border-2 transition-all cursor-pointer",
                  milestone.completed
                    ? "bg-slate-50 border-slate-200 opacity-70"
                    : "bg-white border-purple-200 hover:border-purple-400"
                )}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() =>
                          onUpdateMilestone(milestone.id, { completed: !milestone.completed })
                        }
                        className="flex-shrink-0"
                      >
                        <CheckCircle2
                          className={cn(
                            "w-6 h-6 transition-colors",
                            milestone.completed
                              ? "text-emerald-500"
                              : "text-slate-300 hover:text-purple-500"
                          )}
                        />
                      </button>
                      <div>
                        <p className={cn(
                          "font-semibold",
                          milestone.completed ? "text-slate-500 line-through" : "text-slate-900"
                        )}>
                          {milestone.title}
                        </p>
                        <p className="text-xs text-slate-600 mt-1">{milestone.description}</p>
                      </div>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-purple-600">{milestone.targetValue}</p>
                    <p className="text-xs text-slate-500">{milestone.metric}</p>
                  </div>
                </div>

                {milestone.dueDate && (
                  <p className="text-xs text-slate-500 flex items-center gap-1 mt-2">
                    <Zap className="w-3 h-3" />
                    Due: {new Date(milestone.dueDate).toLocaleDateString()}
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

export default MealLogger;
