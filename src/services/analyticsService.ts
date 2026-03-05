import { ProgressEntry, WorkoutLog, PerformanceAnalytics, WorkoutStreak, GoalMilestone } from '../types';

/**
 * Analytics Service
 * Analyzes user progress, performance, and provides recommendations
 */

export class AnalyticsService {
  /**
   * Calculate weight change trend
   */
  static getWeightTrend(progressHistory: ProgressEntry[]): {
    currentWeight: number;
    averageWeight: number;
    weightChange: number;
    changePercentage: number;
    trend: 'improving' | 'stable' | 'declining';
  } | null {
    if (!progressHistory || progressHistory.length === 0) return null;

    const weights = progressHistory
      .filter(p => p.weight)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    if (weights.length < 2) return null;

    const currentWeight = weights[weights.length - 1].weight!;
    const previousWeight = weights[0].weight!;
    const averageWeight = weights.reduce((sum, p) => sum + (p.weight || 0), 0) / weights.length;

    const weightChange = currentWeight - previousWeight;
    const changePercentage = (weightChange / previousWeight) * 100;

    // Determine trend
    let trend: 'improving' | 'stable' | 'declining' = 'stable';
    if (Math.abs(weightChange) > 3) {
      trend = weightChange > 0 ? 'declining' : 'improving';
    }

    return {
      currentWeight,
      averageWeight,
      weightChange,
      changePercentage,
      trend,
    };
  }

  /**
   * Calculate measurement progress
   */
  static getMeasurementProgress(progressHistory: ProgressEntry[]): {
    latest: ProgressEntry['measurements'] | null;
    changes: Record<string, number>;
    trend: 'improving' | 'stable' | 'declining';
  } {
    const withMeasurements = progressHistory.filter(p => p.measurements);
    if (withMeasurements.length === 0) {
      return { latest: null, changes: {}, trend: 'stable' };
    }

    const latest = withMeasurements[0].measurements || {};
    const earliest = withMeasurements[withMeasurements.length - 1].measurements || {};
    const changes: Record<string, number> = {};

    Object.keys(latest).forEach(key => {
      const latestVal = latest[key as keyof typeof latest] || 0;
      const earliestVal = earliest[key as keyof typeof earliest] || 0;
      changes[key] = earliestVal ? latestVal - earliestVal : 0;
    });

    const totalChange = Object.values(changes).reduce((a, b) => a + Math.abs(b), 0);
    const trend: 'improving' | 'stable' | 'declining' = totalChange > 0 ? 'improving' : 'stable';

    return { latest, changes, trend };
  }

  /**
   * Analyze workout completion rates
   */
  static getWorkoutCompletionStats(workoutLogs: WorkoutLog[]): {
    totalWorkouts: number;
    fullyCompleted: number;
    completionRate: number;
    averageIntensity: string;
    averageDuration: number;
  } {
    if (!workoutLogs || workoutLogs.length === 0) {
      return {
        totalWorkouts: 0,
        fullyCompleted: 0,
        completionRate: 0,
        averageIntensity: 'N/A',
        averageDuration: 0,
      };
    }

    const fullyCompleted = workoutLogs.filter(log =>
      log.exerciseLogs.every(e => e.completed)
    ).length;

    const completionRate = (fullyCompleted / workoutLogs.length) * 100;
    const intensities = workoutLogs.filter(l => l.intensity);
    const avgIntensity = intensities.length > 0
      ? this.getMostFrequent(intensities.map(l => l.intensity!))
      : 'moderate';

    const avgDuration = workoutLogs
      .filter(l => l.duration)
      .reduce((sum, l) => sum + (l.duration || 0), 0) / (workoutLogs.length || 1);

    return {
      totalWorkouts: workoutLogs.length,
      fullyCompleted,
      completionRate,
      averageIntensity: avgIntensity,
      averageDuration: Math.round(avgDuration),
    };
  }

  /**
   * Analyze exercise-specific performance
   */
  static getExercisePerformance(
    exerciseName: string,
    workoutLogs: WorkoutLog[]
  ): PerformanceAnalytics | null {
    const relevantLogs = workoutLogs.filter(log =>
      log.exerciseLogs.some(e => e.exerciseName === exerciseName)
    );

    if (relevantLogs.length === 0) return null;

    const exercises = relevantLogs
      .flatMap(log => log.exerciseLogs
        .filter(e => e.exerciseName === exerciseName)
        .map(e => ({ ...e, _logDate: log.date })))
      .sort((a, b) => new Date(a._logDate).getTime() - new Date(b._logDate).getTime());

    if (exercises.length === 0) return null;

    const completedExercises = exercises.filter(e => e.completed);
    const weights = exercises.filter(e => e.actualWeight).map(e => e.actualWeight!);
    const avgWeight = weights.length > 0 ? weights.reduce((a, b) => a + b) / weights.length : 0;
    const maxWeight = weights.length > 0 ? Math.max(...weights) : 0;

    const progressRate = weights.length > 1
      ? ((weights[weights.length - 1] - weights[0]) / weights[0]) * 100
      : 0;

    const recentPerformance = exercises.slice(-5);
    const isImproving = recentPerformance.every((e, i) => {
      if (i === 0) return true;
      return (e.actualWeight || 0) >= (recentPerformance[i - 1].actualWeight || 0);
    });

    let trend: 'improving' | 'stable' | 'declining' = 'stable';
    if (isImproving && progressRate > 5) trend = 'improving';
    else if (progressRate < -5) trend = 'declining';

    return {
      userId: '',
      routineId: '',
      exerciseName,
      totalWorkouts: exercises.length,
      completedWorkouts: completedExercises.length,
      averageWeight: avgWeight > 0 ? Math.round(avgWeight * 10) / 10 : undefined,
      maxWeight: maxWeight > 0 ? maxWeight : undefined,
      progressRate,
      improvementTrend: trend,
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * Calculate workout streaks
   */
  static calculateStreak(workoutLogs: WorkoutLog[]): {
    currentStreak: number;
    longestStreak: number;
    lastWorkoutDate?: string;
    workoutDaysThisWeek: number;
  } {
    if (!workoutLogs || workoutLogs.length === 0) {
      return { currentStreak: 0, longestStreak: 0, workoutDaysThisWeek: 0 };
    }

    const uniqueDates = new Set(workoutLogs.map(log => log.date));
    const sortedDates = Array.from(uniqueDates).sort().reverse();

    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;

    const today = new Date();
    const oneDay = 24 * 60 * 60 * 1000;

    sortedDates.forEach((dateStr, index) => {
      const date = new Date(dateStr);
      
      if (index === 0) {
        const daysDiff = Math.floor((today.getTime() - date.getTime()) / oneDay);
        if (daysDiff <= 1) {
          currentStreak = 1;
          tempStreak = 1;
        }
      } else {
        const prevDate = new Date(sortedDates[index - 1]);
        const daysDiff = Math.floor((prevDate.getTime() - date.getTime()) / oneDay);
        
        if (daysDiff === 1) {
          tempStreak++;
          if (index === 1 || currentStreak > 0) {
            currentStreak = tempStreak;
          }
        } else {
          longestStreak = Math.max(longestStreak, tempStreak);
          tempStreak = 1;
        }
      }
    });

    longestStreak = Math.max(longestStreak, tempStreak, currentStreak);

    // Workouts this week
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    weekStart.setHours(0, 0, 0, 0);

    const workoutDaysThisWeek = sortedDates.filter(dateStr => {
      const date = new Date(dateStr);
      return date.getTime() >= weekStart.getTime();
    }).length;

    return {
      currentStreak,
      longestStreak,
      lastWorkoutDate: sortedDates[0],
      workoutDaysThisWeek,
    };
  }

  /**
   * Generate recommendations based on progress
   */
  static generateRecommendations(
    progressHistory: ProgressEntry[],
    workoutLogs: WorkoutLog[],
    completionStats: ReturnType<typeof this.getWorkoutCompletionStats>
  ): string[] {
    const recommendations: string[] = [];

    // Weight trend recommendations
    const weightTrend = this.getWeightTrend(progressHistory);
    if (weightTrend) {
      if (weightTrend.trend === 'improving' && Math.abs(weightTrend.changePercentage) > 5) {
        if (weightTrend.weightChange < 0) {
          recommendations.push('🎉 Great weight loss progress! Keep up the consistent effort.');
        } else {
          recommendations.push('💪 Solid muscle gain! Consider increasing your protein intake.');
        }
      }
      if (Math.abs(weightTrend.changePercentage) < 1) {
        recommendations.push('📊 Weight is stable. Try adjusting your caloric intake or training intensity.');
      }
    }

    // Workout completion recommendations
    if (completionStats.completionRate < 70) {
      recommendations.push('⚠️ Lower completion rate detected. Try breaking workouts into shorter sessions.');
    } else if (completionStats.completionRate > 90) {
      recommendations.push('🏆 Excellent consistency! Consider increasing workout intensity or duration.');
    }

    // Intensity recommendations
    if (completionStats.averageIntensity === 'light') {
      recommendations.push('💡 Most workouts are light intensity. Try progressively increasing difficulty for better gains.');
    }

    // Duration recommendations
    if (completionStats.averageDuration < 30) {
      recommendations.push('⏱️ Average workout duration is short. Aim for 45-60 minutes for optimal results.');
    } else if (completionStats.averageDuration > 90) {
      recommendations.push('⚡ Long workout duration observed. Consider shorter, more intense sessions to prevent overtraining.');
    }

    // Overall progress recommendations
    if (progressHistory.length < 5) {
      recommendations.push('📝 Start logging more progress entries for better analytics and insights.');
    }

    return recommendations.length > 0
      ? recommendations
      : ['✨ You\'re doing great! Keep maintaining your routine and tracking progress.'];
  }

  /**
   * Helper to find most frequent item
   */
  private static getMostFrequent<T>(arr: T[]): T {
    const frequencies = new Map<T, number>();
    let maxCount = 0;
    let mostFrequent = arr[0];

    arr.forEach(item => {
      const count = (frequencies.get(item) || 0) + 1;
      frequencies.set(item, count);
      if (count > maxCount) {
        maxCount = count;
        mostFrequent = item;
      }
    });

    return mostFrequent;
  }

  /**
   * Calculate goal progress
   */
  static calculateGoalProgress(
    progressHistory: ProgressEntry[],
    goalType: string,
    targetValue: number
  ): number {
    if (progressHistory.length === 0) return 0;

    let currentValue = 0;
    let startValue = 0;

    if (goalType === 'weight-loss') {
      const weights = progressHistory.filter(p => p.weight).map(p => p.weight!);
      if (weights.length < 2) return 0;
      currentValue = weights[weights.length - 1];
      startValue = weights[0];
      return Math.min(100, ((startValue - currentValue) / targetValue) * 100);
    } else if (goalType === 'muscle-gain') {
      const weights = progressHistory.filter(p => p.weight).map(p => p.weight!);
      if (weights.length < 2) return 0;
      currentValue = weights[weights.length - 1];
      startValue = weights[0];
      return Math.min(100, ((currentValue - startValue) / targetValue) * 100);
    }

    return 0;
  }
}
