export type FitnessGoal = 'weight-loss' | 'muscle-gain' | 'endurance' | 'flexibility' | 'general-health';
export type FitnessLevel = 'beginner' | 'intermediate' | 'advanced';
export type Equipment = 'none' | 'dumbbells' | 'resistance-bands' | 'full-gym' | 'kettlebells';
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface UserProfile {
  name: string;
  gender: 'Male' | 'Female';
  age: number;
  weight: number;
  height: number;
  targetWeightGain: number;
  goal: FitnessGoal;
  level: FitnessLevel;
  equipment: Equipment[];
  daysPerWeek: number;
  bmi?: number;
  bmiCategory?: string;
}

export interface DietSuggestion {
  mealType: string;
  suggestions: string[];
}

export interface WorkoutRoutine {
  id: string;
  name: string;
  description: string;
  weeklySchedule: any[];
  dietSuggestions: DietSuggestion[];
  createdAt: string;
  profileSnapshot?: UserProfile;
}

export interface Exercise {
  name: string;
  sets: number;
  reps: string;
  rest: string;
  notes?: string;
}

// Progress Tracking Types
export interface ProgressEntry {
  id: string;
  date: string; // ISO date string
  weight?: number; // kg
  measurements?: {
    chest?: number; // cm
    waist?: number;
    hips?: number;
    thighs?: number;
    arms?: number;
  };
  strengthData?: {
    exerciseName: string;
    maxWeight?: number; // kg
    reps?: number;
  }[];
  enduranceData?: {
    exerciseName: string;
    duration?: number; // minutes
    distance?: number; // km
    calories?: number;
  }[];
  notes?: string;
  userId: string;
  createdAt: string;
}

export interface WorkoutLog {
  id: string;
  date: string; // ISO date string
  routineId: string;
  exerciseLogs: {
    exerciseName: string;
    plannedSets: number;
    plannedReps: string;
    actualSets: number;
    actualReps: number;
    actualWeight?: number; // kg
    completed: boolean;
    notes?: string;
  }[];
  duration?: number; // minutes
  intensity?: 'light' | 'moderate' | 'high'; // perceived intensity
  notes?: string;
  userId: string;
  createdAt: string;
}

export interface Milestone {
  id: string;
  userId: string;
  goal: FitnessGoal;
  title: string;
  description: string;
  targetValue: number; // e.g., weight, strength, endurance
  metric: 'weight' | 'strength' | 'endurance' | 'measurements' | 'custom';
  currentValue: number;
  completed: boolean;
  completedDate?: string; // ISO date string
  dueDate?: string;
  createdAt: string;
}

export interface MealLog {
  id: string;
  date: string; // ISO date string
  mealType: MealType;
  foodItems: {
    name: string;
    quantity: string;
    calories?: number;
    protein?: number; // grams
    carbs?: number; // grams
    fats?: number; // grams
  }[];
  totalCalories?: number;
  notes?: string;
  userId: string;
  createdAt: string;
}

export interface AchievementBadge {
  id: string;
  userId: string;
  type: 'streak' | 'milestone' | 'consistency' | 'performance';
  title: string;
  description: string;
  icon: string; // emoji or icon identifier
  earnedDate: string; // ISO date string
  value?: number; // e.g., streak days
}

export interface WorkoutStreak {
  userId: string;
  currentStreak: number; // days
  longestStreak: number; // days
  lastWorkoutDate?: string; // ISO date string
  workoutDaysThisWeek: number;
  targetDaysPerWeek: number;
}

export interface PerformanceAnalytics {
  userId: string;
  routineId: string;
  exerciseName: string;
  totalWorkouts: number;
  completedWorkouts: number;
  averageWeight?: number; // kg
  maxWeight?: number;
  progressRate?: number; // percentage change
  improvementTrend: 'improving' | 'stable' | 'declining';
  lastUpdated: string;
}

export interface GoalMilestone {
  id: string;
  userId: string;
  goal: FitnessGoal;
  milestones: {
    percentage: number; // 25%, 50%, 75%, 100%
    title: string;
    targetValue: number;
    completed: boolean;
    completedDate?: string;
  }[];
  startDate: string;
  estimatedCompletionDate?: string;
  progress: number; // 0-100
}
