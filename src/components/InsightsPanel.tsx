import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { Lightbulb, TrendingUp, Target, Zap } from 'lucide-react';
import { ProgressEntry, WorkoutLog, PerformanceAnalytics } from '../types';
import { AnalyticsService } from '../services/analyticsService';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface InsightsPanelProps {
  progressHistory: ProgressEntry[];
  workoutLogs: WorkoutLog[];
  goalType: string;
}

export const InsightsPanel: React.FC<InsightsPanelProps> = ({
  progressHistory,
  workoutLogs,
  goalType,
}) => {
  const analytics = useMemo(() => {
    const weightTrend = AnalyticsService.getWeightTrend(progressHistory);
    const measurements = AnalyticsService.getMeasurementProgress(progressHistory);
    const completion = AnalyticsService.getWorkoutCompletionStats(workoutLogs);
    const streak = AnalyticsService.calculateStreak(workoutLogs);
    const recommendations = AnalyticsService.generateRecommendations(
      progressHistory,
      workoutLogs,
      completion
    );

    return {
      weightTrend,
      measurements,
      completion,
      streak,
      recommendations,
    };
  }, [progressHistory, workoutLogs]);

  if (!analytics.weightTrend && workoutLogs.length === 0 && progressHistory.length === 0) {
    return (
      <motion.div
        className="bg-slate-50 rounded-2xl p-8 border-2 border-dashed border-slate-300 text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <Lightbulb className="w-12 h-12 text-slate-400 mx-auto mb-3" />
        <p className="text-slate-600 font-semibold mb-2">Start Tracking to See Insights</p>
        <p className="text-slate-500 text-sm">
          Log your workouts and progress entries to unlock personalized insights and recommendations.
        </p>
      </motion.div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <motion.div
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {/* Workouts */}
        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-4 border border-blue-200">
          <p className="text-xs font-semibold text-blue-700 mb-1">Total Workouts</p>
          <p className="text-3xl font-bold text-blue-900">{analytics.completion.totalWorkouts}</p>
        </div>

        {/* Completion Rate */}
        <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl p-4 border border-emerald-200">
          <p className="text-xs font-semibold text-emerald-700 mb-1">Completion</p>
          <p className="text-3xl font-bold text-emerald-900">
            {analytics.completion.completionRate.toFixed(0)}%
          </p>
        </div>

        {/* Current Streak */}
        <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-xl p-4 border border-orange-200">
          <p className="text-xs font-semibold text-orange-700 mb-1">Current Streak</p>
          <p className="text-3xl font-bold text-orange-900">{analytics.streak.currentStreak}</p>
        </div>

        {/* Weight Change */}
        {analytics.weightTrend && (
          <div className={cn(
            "rounded-xl p-4 border-2",
            analytics.weightTrend.weightChange < 0
              ? "bg-gradient-to-br from-green-50 to-emerald-50 border-green-200"
              : "bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200"
          )}>
            <p className="text-xs font-semibold mb-1" style={{
              color: analytics.weightTrend.weightChange < 0 ? '#166534' : '#9a3412'
            }}>
              Weight Change
            </p>
            <p className="text-3xl font-bold" style={{
              color: analytics.weightTrend.weightChange < 0 ? '#166534' : '#9a3412'
            }}>
              {analytics.weightTrend.weightChange > 0 ? '+' : ''}{analytics.weightTrend.weightChange.toFixed(1)}kg
            </p>
          </div>
        )}
      </motion.div>

      {/* Weight Trend Analysis */}
      {analytics.weightTrend && (
        <motion.div
          className="bg-white rounded-2xl p-6 border border-slate-200 shadow-lg"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-500" />
            Weight Trend Analysis
          </h3>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <span className="text-slate-700 font-semibold">Current Weight</span>
              <span className="text-2xl font-bold text-blue-600">{analytics.weightTrend.currentWeight} kg</span>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <span className="text-slate-700 font-semibold">Average Weight</span>
              <span className="text-2xl font-bold text-slate-600">
                {analytics.weightTrend.averageWeight.toFixed(1)} kg
              </span>
            </div>

            <div className={cn(
              "flex items-center justify-between p-3 rounded-lg",
              analytics.weightTrend.trend === 'improving'
                ? 'bg-green-50 border border-green-200'
                : analytics.weightTrend.trend === 'declining'
                  ? 'bg-orange-50 border border-orange-200'
                  : 'bg-yellow-50 border border-yellow-200'
            )}>
              <span className="text-slate-700 font-semibold">Trend</span>
              <span className={cn(
                "text-lg font-bold",
                analytics.weightTrend.trend === 'improving'
                  ? 'text-green-600'
                  : analytics.weightTrend.trend === 'declining'
                    ? 'text-orange-600'
                    : 'text-yellow-600'
              )}>
                {analytics.weightTrend.trend === 'improving' ? '📈' : analytics.weightTrend.trend === 'declining' ? '📉' : '➡️'} {
                  analytics.weightTrend.trend.charAt(0).toUpperCase() + analytics.weightTrend.trend.slice(1)
                }
              </span>
            </div>

            <p className="text-sm text-slate-600 italic border-t border-slate-200 pt-3">
              {goalType === 'weight-loss' && analytics.weightTrend.weightChange < 0
                ? '🎉 You\'re making great progress toward your weight loss goal!'
                : goalType === 'muscle-gain' && analytics.weightTrend.weightChange > 0
                  ? '💪 Solid gains! Keep up the good nutrition and training.'
                  : 'Keep tracking consistently for better results!'}
            </p>
          </div>
        </motion.div>
      )}

      {/* Measurement Progress */}
      {analytics.measurements.latest && Object.values(analytics.measurements.latest).some(v => v) && (
        <motion.div
          className="bg-white rounded-2xl p-6 border border-slate-200 shadow-lg"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Target className="w-5 h-5 text-purple-500" />
            Measurement Progress
          </h3>

          <div className="space-y-2">
            {Object.entries(analytics.measurements.latest || {})
              .filter(([_, val]) => val)
              .map(([key, val]) => {
                const change = analytics.measurements.changes[key] || 0;
                return (
                  <div key={key} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <span className="text-slate-700 font-semibold capitalize">{key}</span>
                    <div className="text-right">
                      <p className="text-lg font-bold text-slate-900">{val} cm</p>
                      <p className={cn(
                        "text-xs font-semibold",
                        change > 0 ? 'text-orange-600' : change < 0 ? 'text-green-600' : 'text-slate-600'
                      )}>
                        {change > 0 ? '+' : ''}{change.toFixed(1)} cm
                      </p>
                    </div>
                  </div>
                );
              })}
          </div>
        </motion.div>
      )}

      {/* Performance Stats */}
      <motion.div
        className="bg-white rounded-2xl p-6 border border-slate-200 shadow-lg"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Zap className="w-5 h-5 text-yellow-500" />
          Performance & Effort
        </h3>

        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
            <span className="text-slate-700 font-semibold">Avg. Workout Duration</span>
            <span className="text-lg font-bold text-slate-600">
              {analytics.completion.averageDuration} min
            </span>
          </div>

          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
            <span className="text-slate-700 font-semibold">Preferred Intensity</span>
            <span className="text-lg font-bold text-slate-600 capitalize">
              {analytics.completion.averageIntensity}
            </span>
          </div>

          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
            <span className="text-slate-700 font-semibold">Longest Streak</span>
            <span className="text-lg font-bold text-slate-600">
              {analytics.streak.longestStreak} days
            </span>
          </div>
        </div>
      </motion.div>

      {/* Smart Recommendations */}
      <motion.div
        className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-6 border-2 border-indigo-200 shadow-lg"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
      >
        <h3 className="text-lg font-bold text-indigo-900 mb-4 flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-indigo-600" />
          AI Recommendations
        </h3>

        <div className="space-y-2">
          {analytics.recommendations.map((rec, idx) => (
            <motion.div
              key={idx}
              className="flex items-start gap-3 p-3 bg-white rounded-lg border border-indigo-100"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + idx * 0.05 }}
            >
              <span className="text-lg flex-shrink-0">{rec.split(' ')[0]}</span>
              <p className="text-sm text-slate-700">
                {rec.split(/\s+/).slice(1).join(' ')}
              </p>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Call to Action */}
      {workoutLogs.length < 10 && (
        <motion.div
          className="bg-gradient-to-r from-emerald-50 to-green-50 rounded-xl p-4 border border-emerald-300 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          whileHover={{ scale: 1.02 }}
        >
          <p className="text-sm font-semibold text-emerald-900">
            💪 Keep logging your workouts for more accurate insights!
          </p>
        </motion.div>
      )}
    </div>
  );
};

export default InsightsPanel;
