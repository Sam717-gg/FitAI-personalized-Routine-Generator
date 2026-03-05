import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { motion } from 'motion/react';
import { TrendingUp, Flame, Calendar } from 'lucide-react';
import { ProgressEntry, WorkoutLog } from '../types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface TrendChartsProps {
  progressHistory: ProgressEntry[];
  workoutLogs: WorkoutLog[];
}

interface StreakDisplayProps {
  currentStreak: number;
  longestStreak: number;
  workoutDaysThisWeek: number;
  targetDaysPerWeek: number;
  lastWorkoutDate?: string;
}

export const TrendCharts: React.FC<TrendChartsProps> = ({ progressHistory, workoutLogs }) => {
  // Prepare weight trend data
  const weightData = progressHistory
    .filter(p => p.weight)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map(p => ({
      date: new Date(p.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      weight: p.weight,
    }));

  // Prepare measurement data
  const measurementChanges = progressHistory
    .filter(p => p.measurements)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map((p, idx, arr) => {
      if (idx === 0) return null;
      const prev = arr[idx - 1].measurements || {};
      const curr = p.measurements || {};
      return {
        date: new Date(p.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        chest: (curr.chest || 0) - (prev.chest || 0),
        waist: (curr.waist || 0) - (prev.waist || 0),
      };
    })
    .filter(Boolean) as any[];

  // Calculate stats
  const currentWeight = weightData[weightData.length - 1]?.weight;
  const previousWeight = weightData[0]?.weight;
  const weightChange = currentWeight && previousWeight ? currentWeight - previousWeight : 0;
  const weightChangePercent = previousWeight ? ((weightChange / previousWeight) * 100).toFixed(1) : '0';

  const completedWorkouts = workoutLogs.filter(log =>
    log.exerciseLogs.every(e => e.completed)
  ).length;

  return (
    <div className="space-y-6">
      {/* Weight Trend Chart */}
      {weightData.length > 1 && (
        <motion.div
          className="bg-white rounded-2xl p-6 border border-slate-200 shadow-lg"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-500" />
              Weight Trend
            </h3>
            {weightChange !== 0 && (
              <span className={cn(
                "text-sm font-semibold",
                weightChange < 0 ? "text-green-600" : "text-orange-600"
              )}>
                {weightChange > 0 ? '+' : ''}{weightChange.toFixed(1)} kg ({weightChangePercent}%)
              </span>
            )}
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={weightData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" stroke="#94a3b8" />
              <YAxis domain={['dataMin - 2', 'dataMax + 2']} stroke="#94a3b8" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1e293b',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#fff',
                }}
              />
              <Line
                type="monotone"
                dataKey="weight"
                stroke="#3b82f6"
                strokeWidth={3}
                dot={{ fill: '#3b82f6', r: 5 }}
                activeDot={{ r: 7 }}
                isAnimationActive={true}
              />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>
      )}

      {/* Measurement Progress */}
      {measurementChanges.length > 0 && (
        <motion.div
          className="bg-white rounded-2xl p-6 border border-slate-200 shadow-lg"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-purple-500" />
            Measurement Changes
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={measurementChanges}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1e293b',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#fff',
                }}
              />
              <Line
                type="monotone"
                dataKey="chest"
                stroke="#8b5cf6"
                strokeWidth={2}
                dot={false}
                name="Chest"
              />
              <Line
                type="monotone"
                dataKey="waist"
                stroke="#ec4899"
                strokeWidth={2}
                dot={false}
                name="Waist"
              />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>
      )}

      {/* Completion Stats */}
      <motion.div
        className="grid grid-cols-2 gap-4"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl p-4 border border-emerald-200">
          <p className="text-xs font-semibold text-emerald-700 mb-1">Total Workouts</p>
          <p className="text-2xl font-bold text-emerald-900">{workoutLogs.length}</p>
        </div>
        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-4 border border-blue-200">
          <p className="text-xs font-semibold text-blue-700 mb-1">Completion Rate</p>
          <p className="text-2xl font-bold text-blue-900">
            {workoutLogs.length > 0
              ? Math.round((completedWorkouts / workoutLogs.length) * 100)
              : 0}%
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export const StreakDisplay: React.FC<StreakDisplayProps> = ({
  currentStreak,
  longestStreak,
  workoutDaysThisWeek,
  targetDaysPerWeek,
  lastWorkoutDate,
}) => {
  const streakPercentage = (workoutDaysThisWeek / targetDaysPerWeek) * 100;
  const isOnFire = currentStreak >= 3;

  const getStreakColor = (streak: number) => {
    if (streak >= 7) return 'text-red-600';
    if (streak >= 3) return 'text-orange-600';
    if (streak > 0) return 'text-yellow-600';
    return 'text-slate-600';
  };

  const getStreakBgColor = (streak: number) => {
    if (streak >= 7) return 'bg-red-50 border-red-200';
    if (streak >= 3) return 'bg-orange-50 border-orange-200';
    if (streak > 0) return 'bg-yellow-50 border-yellow-200';
    return 'bg-slate-50 border-slate-200';
  };

  return (
    <motion.div
      className="space-y-4"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Current Streak */}
      <div className={cn(
        "rounded-2xl p-6 border-2 shadow-lg",
        getStreakBgColor(currentStreak)
      )}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Flame className={cn("w-6 h-6", getStreakColor(currentStreak))} />
            Current Streak
          </h3>
          {isOnFire && <span className="text-2xl animate-bounce">🔥</span>}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-semibold text-slate-600 mb-1">Days</p>
            <p className={cn("text-4xl font-bold", getStreakColor(currentStreak))}>
              {currentStreak}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-600 mb-1">Longest</p>
            <p className="text-2xl font-bold text-slate-900">{longestStreak}</p>
          </div>
        </div>
        {lastWorkoutDate && (
          <p className="text-xs text-slate-600 mt-3">
            Last workout: {new Date(lastWorkoutDate).toLocaleDateString()}
          </p>
        )}
      </div>

      {/* Weekly Progress */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-lg">
        <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-indigo-500" />
          This Week
        </h3>
        <div className="mb-3">
          <div className="flex items-end justify-between mb-2">
            <span className="text-sm font-semibold text-slate-700">
              {workoutDaysThisWeek} of {targetDaysPerWeek} days
            </span>
            <span className="text-sm font-bold text-indigo-600">{Math.round(streakPercentage)}%</span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${streakPercentage}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
          </div>
        </div>
        <p className="text-xs text-slate-600">
          {workoutDaysThisWeek === targetDaysPerWeek
            ? '🎉 You\'ve hit your weekly goal!'
            : `${targetDaysPerWeek - workoutDaysThisWeek} more to go!`}
        </p>
      </div>

      {/* Motivational Message */}
      <motion.div
        className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-4 border border-indigo-200 text-center"
        animate={{ scale: [1, 1.02, 1] }}
        transition={{ duration: 3, repeat: Infinity }}
      >
        <p className="text-sm font-semibold text-indigo-900">
          {currentStreak === 0
            ? '💪 Start your streak today!'
            : currentStreak < 7
              ? '🚀 Keep the momentum going!'
              : '👑 You\'re crushing it!'}
        </p>
      </motion.div>
    </motion.div>
  );
};

export default TrendCharts;
