export type FitnessGoal = 'weight-loss' | 'muscle-gain' | 'endurance' | 'flexibility' | 'general-health';
export type FitnessLevel = 'beginner' | 'intermediate' | 'advanced';
export type Equipment = 'none' | 'dumbbells' | 'resistance-bands' | 'full-gym' | 'kettlebells';

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
