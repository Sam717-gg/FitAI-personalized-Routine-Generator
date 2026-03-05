/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Dumbbell, 
  ChevronRight, 
  ChevronLeft, 
  Sparkles, 
  Calendar, 
  Target, 
  User, 
  CheckCircle2,
  Loader2,
  RotateCcw,
  Download,
  Utensils,
  History,
  Trash2,
  LogIn,
  LogOut,
  AlertCircle,
  TrendingUp,
  LineChart as LineChartIcon
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { generateFitnessRoutine } from './services/geminiService';
import { UserProfile, FitnessGoal, FitnessLevel, Equipment, ProgressEntry, WorkoutLog, MealLog, Milestone } from './types';
import { initFirebase, signIn, logOut, handleFirestoreError, OperationType } from './firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { collection, query, orderBy, onSnapshot, setDoc, doc, deleteDoc } from 'firebase/firestore';
import { ProgressTracker } from './components/ProgressTracker';
import { TrendCharts, StreakDisplay } from './components/TrendCharts';
import { MealLogger, MilestoneTracker } from './components/MealLogger';
import { InsightsPanel } from './components/InsightsPanel';
import { ProgressService } from './services/progressService';
import { AnalyticsService } from './services/analyticsService';

// Error Boundary Component
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: any }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      let errorMessage = "Something went wrong.";
      try {
        const parsed = JSON.parse(this.state.error.message);
        if (parsed.error) errorMessage = `Firebase Error: ${parsed.error}`;
      } catch (e) {
        errorMessage = this.state.error.message || errorMessage;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
          <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-xl border border-red-100 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-slate-900 mb-2">Application Error</h2>
            <p className="text-slate-600 mb-6">{errorMessage}</p>
            <button 
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              Reload App
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const GOALS: { value: FitnessGoal; label: string; icon: React.ReactNode }[] = [
  { value: 'weight-loss', label: 'Weight Loss', icon: <Target className="w-5 h-5" /> },
  { value: 'muscle-gain', label: 'Muscle Gain', icon: <Dumbbell className="w-5 h-5" /> },
  { value: 'endurance', label: 'Endurance', icon: <Sparkles className="w-5 h-5" /> },
  { value: 'flexibility', label: 'Flexibility', icon: <Sparkles className="w-5 h-5" /> },
  { value: 'general-health', label: 'General Health', icon: <CheckCircle2 className="w-5 h-5" /> },
];

const LEVELS: { value: FitnessLevel; label: string }[] = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
];

const EQUIPMENT: { value: Equipment; label: string }[] = [
  { value: 'none', label: 'No Equipment (Bodyweight)' },
  { value: 'dumbbells', label: 'Dumbbells' },
  { value: 'resistance-bands', label: 'Resistance Bands' },
  { value: 'kettlebells', label: 'Kettlebells' },
  { value: 'full-gym', label: 'Full Gym Access' },
];

function calculateBMI(weight: number, height: number) {
  const heightInMeters = height / 100;
  const bmi = weight / (heightInMeters * heightInMeters);
  let category = '';
  if (bmi < 18.5) category = 'Underweight';
  else if (bmi < 25) category = 'Normal weight';
  else if (bmi < 30) category = 'Overweight';
  else category = 'Obese';
  return { bmi: parseFloat(bmi.toFixed(1)), category };
}

export default function App() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [routine, setRoutine] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [view, setView] = useState<'generator' | 'progress'>('generator');
  const [progressView, setProgressView] = useState<'overview' | 'workouts' | 'meals' | 'milestones'>('overview');
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [firebaseError, setFirebaseError] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile>({
    name: '',
    gender: 'Male',
    age: 25,
    weight: 70,
    height: 175,
    targetWeightGain: 0,
    goal: 'general-health',
    level: 'beginner',
    equipment: ['none'],
    daysPerWeek: 3,
  });

  // Progress tracking state
  const [progressHistory, setProgressHistory] = useState<ProgressEntry[]>([]);
  const [workoutLogs, setWorkoutLogs] = useState<WorkoutLog[]>([]);
  const [todayMeals, setTodayMeals] = useState<MealLog[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [progressService, setProgressService] = useState<ProgressService | null>(null);

  useEffect(() => {
    let unsubscribeAuth: (() => void) | undefined;
    let unsubscribeFirestore: (() => void) | undefined;
    
    const setupApp = async () => {
      try {
        const { auth, db } = await initFirebase();
        
        unsubscribeAuth = onAuthStateChanged(auth, (u) => {
          setUser(u);
          
          // If user logs in, sync with Firestore
          if (u) {
            const routinesRef = collection(db, 'users', u.uid, 'routines');
            const q = query(routinesRef, orderBy('createdAt', 'desc'));
            
            unsubscribeFirestore = onSnapshot(q, (snapshot) => {
              const routines = snapshot.docs.map(doc => doc.data());
              setHistory(routines);
            }, (error) => {
              handleFirestoreError(error, OperationType.GET, `users/${u.uid}/routines`);
            });
          } else {
            // If logged out, use localStorage
            const saved = localStorage.getItem('fitai_history');
            if (saved) setHistory(JSON.parse(saved));
            if (unsubscribeFirestore) {
              unsubscribeFirestore();
              unsubscribeFirestore = undefined;
            }
          }
        });
        
        setFirebaseError(null);
      } catch (error) {
        console.warn("Firebase setup failed:", error);
        setFirebaseError("Firebase not configured. Please accept terms in the setup UI.");
        
        // Fallback to localStorage if Firebase fails
        const saved = localStorage.getItem('fitai_history');
        if (saved) setHistory(JSON.parse(saved));
      }
    };

    setupApp();
    return () => {
      unsubscribeAuth?.();
      unsubscribeFirestore?.();
    };
  }, []);

  // Initialize progress service and load data
  useEffect(() => {
    const initProgressService = async () => {
      if (!user) return;
      
      try {
        const { db } = await initFirebase();
        const service = ProgressService.getInstance(db);
        setProgressService(service);

        // Load progress data
        const progress = await service.getProgressHistory(user.uid, 90);
        const logs = await service.getWorkoutLogs(user.uid, 90);
        const milesList = await service.getMilestones(user.uid);
        const mealsToday = await service.getMealLogs(user.uid);

        setProgressHistory(progress);
        setWorkoutLogs(logs);
        setMilestones(milesList);
        setTodayMeals(mealsToday);
      } catch (error) {
        console.warn("Progress service init failed, using localStorage:", error);
        // Fallback to localStorage
        const savedProgress = JSON.parse(localStorage.getItem(`progress_${user?.uid}`) || '[]');
        const savedLogs = JSON.parse(localStorage.getItem(`workoutLogs_${user?.uid}`) || '[]');
        const savedMiles = JSON.parse(localStorage.getItem(`milestones_${user?.uid}`) || '[]');
        const savedMeals = JSON.parse(localStorage.getItem(`mealLogs_${user?.uid}`) || '[]');
        
        setProgressHistory(savedProgress);
        setWorkoutLogs(savedLogs);
        setMilestones(savedMiles);
        setTodayMeals(savedMeals);
      }
    };

    initProgressService();
  }, [user]);

  const handleNext = () => setStep(s => s + 1);
  const handleBack = () => setStep(s => s - 1);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const result = await generateFitnessRoutine(profile);
      const newRoutine = { 
        ...result, 
        id: Date.now().toString(), 
        userId: user?.uid || 'local',
        createdAt: new Date().toISOString(),
        profileSnapshot: { ...profile }
      };
      
      setRoutine(newRoutine);
      
      if (user) {
        // Save to Firestore
        try {
          const { db } = await initFirebase();
          await setDoc(doc(db, 'users', user.uid, 'routines', newRoutine.id), newRoutine);
        } catch (error) {
          handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}/routines/${newRoutine.id}`);
        }
      } else {
        // Save to localStorage
        const updatedHistory = [newRoutine, ...history].slice(0, 10);
        setHistory(updatedHistory);
        localStorage.setItem('fitai_history', JSON.stringify(updatedHistory));
      }
      
      setStep(4);
    } catch (error) {
      console.error("Generation failed", error);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setStep(1);
    setRoutine(null);
    setShowHistory(false);
  };

  const downloadPlan = () => {
    if (!routine) return;
    let text = `FITAI WORKOUT PLAN: ${routine.name}\n`;
    text += `Description: ${routine.description}\n\n`;
    routine.weeklySchedule.forEach((day: any) => {
      text += `--- ${day.day}: ${day.focus} ---\n`;
      day.exercises.forEach((ex: any) => {
        text += `- ${ex.name}: ${ex.sets} sets x ${ex.reps} reps (Rest: ${ex.rest})\n`;
        if (ex.notes) text += `  Notes: ${ex.notes}\n`;
      });
      text += `\n`;
    });
    text += `\nDIET SUGGESTIONS:\n`;
    routine.dietSuggestions.forEach((diet: any) => {
      text += `${diet.mealType}: ${diet.suggestions.join(', ')}\n`;
    });

    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${routine.name.replace(/\s+/g, '_')}_Plan.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const deleteHistoryItem = async (id: string) => {
    if (user) {
      try {
        const { db } = await initFirebase();
        await deleteDoc(doc(db, 'users', user.uid, 'routines', id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `users/${user.uid}/routines/${id}`);
      }
    } else {
      const updated = history.filter(item => item.id !== id);
      setHistory(updated);
      localStorage.setItem('fitai_history', JSON.stringify(updated));
    }
  };

  // Progress tracking handlers
  const handleAddProgress = async (entry: Omit<ProgressEntry, 'id' | 'createdAt' | 'userId'>) => {
    if (!user || !progressService) return;
    
    try {
      setLoading(true);
      const id = await progressService.addProgressEntry(user.uid, {
        ...entry,
        userId: user.uid,
      });
      
      const updated = [...progressHistory, {
        ...entry,
        id,
        userId: user.uid,
        createdAt: new Date().toISOString(),
      }];
      setProgressHistory(updated);
    } catch (error) {
      console.error("Failed to add progress:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogWorkout = async (log: Omit<WorkoutLog, 'id' | 'createdAt' | 'userId'>) => {
    if (!user || !progressService) return;
    
    try {
      setLoading(true);
      const id = await progressService.logWorkout(user.uid, {
        ...log,
        userId: user.uid,
      });
      
      const updated = [...workoutLogs, {
        ...log,
        id,
        userId: user.uid,
        createdAt: new Date().toISOString(),
      }];
      setWorkoutLogs(updated);
    } catch (error) {
      console.error("Failed to log workout:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogMeal = async (meal: Omit<MealLog, 'id' | 'createdAt' | 'userId'>) => {
    if (!user || !progressService) return;
    
    try {
      setLoading(true);
      const id = await progressService.logMeal(user.uid, {
        ...meal,
        userId: user.uid,
      });
      
      const updated = [...todayMeals, {
        ...meal,
        id,
        userId: user.uid,
        createdAt: new Date().toISOString(),
      }];
      setTodayMeals(updated);
    } catch (error) {
      console.error("Failed to log meal:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMilestone = async (milestone: Omit<Milestone, 'id' | 'createdAt'>) => {
    if (!user || !progressService) return;
    
    try {
      setLoading(true);
      const id = await progressService.createMilestone(user.uid, {
        ...milestone,
        userId: user.uid,
      });
      
      const updated = [...milestones, {
        ...milestone,
        id,
        userId: user.uid,
        createdAt: new Date().toISOString(),
      }];
      setMilestones(updated);
    } catch (error) {
      console.error("Failed to add milestone:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateMilestone = async (milestoneId: string, updates: Partial<Milestone>) => {
    if (!user || !progressService) return;
    
    try {
      await progressService.updateMilestone(user.uid, milestoneId, updates);
      const updated = milestones.map(m => m.id === milestoneId ? { ...m, ...updates } : m);
      setMilestones(updated);
    } catch (error) {
      console.error("Failed to update milestone:", error);
    }
  };

  const bmiData = calculateBMI(profile.weight, profile.height);
  
  // Calculate streak
  const streak = AnalyticsService.calculateStreak(workoutLogs);

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-[#F8F9FA] flex flex-col items-center py-12 px-4">
      {/* Header */}
      <div className="max-w-2xl w-full mb-12 text-center relative">
        <div className="absolute right-0 top-0 flex gap-2">
          <button 
            onClick={() => setView(view === 'generator' ? 'progress' : 'generator')}
            className={cn(
              "p-2 transition-colors",
              view === 'progress' ? "text-emerald-500" : "text-slate-400 hover:text-emerald-500"
            )}
            title="View Progress"
          >
            <TrendingUp className="w-6 h-6" />
          </button>
          <button 
            onClick={() => setShowHistory(!showHistory)}
            className="p-2 text-slate-400 hover:text-emerald-500 transition-colors"
            title="History"
          >
            <History className="w-6 h-6" />
          </button>
          {!firebaseError && (
            user ? (
              <button 
                onClick={logOut}
                className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                title="Logout"
              >
                <LogOut className="w-6 h-6" />
              </button>
            ) : (
              <button 
                onClick={signIn}
                className="p-2 text-slate-400 hover:text-emerald-500 transition-colors"
                title="Login with Google"
              >
                <LogIn className="w-6 h-6" />
              </button>
            )
          )}
        </div>
        <div className="inline-flex items-center justify-center w-12 h-12 bg-emerald-500 rounded-xl mb-4 shadow-lg shadow-emerald-200">
          <Dumbbell className="text-white w-6 h-6" />
        </div>
        <h1 className="text-4xl font-bold text-slate-900 tracking-tight mb-2">FitAI</h1>
        <p className="text-slate-500 font-medium">Your personal AI-powered fitness architect.</p>
        
        {firebaseError && (
          <div className="mt-4 flex items-center justify-center gap-2 text-xs text-amber-600 bg-amber-50 py-2 px-4 rounded-full border border-amber-100 mx-auto w-fit">
            <AlertCircle className="w-3 h-3" />
            {firebaseError}
          </div>
        )}
      </div>

      <div className="max-w-2xl w-full">
        <AnimatePresence mode="wait">
          {view === 'progress' ? (
            <motion.div
              key="progress"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <TrendingUp className="text-emerald-500" />
                  <h2 className="text-xl font-semibold">Progress & Analytics</h2>
                </div>
                <button onClick={() => setView('generator')} className="text-sm text-slate-400 hover:text-slate-600 bg-white px-3 py-1 rounded-lg border border-slate-200">Back to Generator</button>
              </div>

              {/* Tab Navigation */}
              <div className="flex gap-2 bg-white rounded-xl p-2 border border-slate-200 overflow-x-auto">
                {[
                  { id: 'overview', label: '📊 Overview', icon: 'overview' },
                  { id: 'workouts', label: '💪 Workouts', icon: 'workouts' },
                  { id: 'meals', label: '🍎 Meals', icon: 'meals' },
                  { id: 'milestones', label: '🎯 Goals', icon: 'milestones' },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setProgressView(tab.id as typeof progressView)}
                    className={cn(
                      "px-4 py-2 rounded-lg font-semibold transition-all whitespace-nowrap",
                      progressView === tab.id
                        ? "bg-emerald-500 text-white shadow-lg"
                        : "text-slate-600 hover:text-slate-900"
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              <AnimatePresence mode="wait">
                {progressView === 'overview' && (
                  <motion.div
                    key="overview"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="bg-white rounded-2xl p-8 border border-slate-200 shadow-lg space-y-6"
                  >
                    {/* Streak Display */}
                    <StreakDisplay 
                      currentStreak={streak.currentStreak}
                      longestStreak={streak.longestStreak}
                      workoutDaysThisWeek={streak.workoutDaysThisWeek}
                      targetDaysPerWeek={profile.daysPerWeek}
                      lastWorkoutDate={streak.lastWorkoutDate}
                    />

                    {/* Trend Charts */}
                    <TrendCharts 
                      progressHistory={progressHistory}
                      workoutLogs={workoutLogs}
                    />

                    {/* Insights Panel */}
                    <InsightsPanel 
                      progressHistory={progressHistory}
                      workoutLogs={workoutLogs}
                      goalType={profile.goal}
                    />
                  </motion.div>
                )}

                {progressView === 'workouts' && (
                  <motion.div
                    key="workouts"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="bg-white rounded-2xl p-8 border border-slate-200 shadow-lg"
                  >
                    <ProgressTracker
                      onAddProgress={handleAddProgress}
                      progressHistory={progressHistory}
                      isLoading={loading}
                    />
                  </motion.div>
                )}

                {progressView === 'meals' && (
                  <motion.div
                    key="meals"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="bg-white rounded-2xl p-8 border border-slate-200 shadow-lg"
                  >
                    <MealLogger
                      onLogMeal={handleLogMeal}
                      todayMeals={todayMeals}
                      isLoading={loading}
                    />
                  </motion.div>
                )}

                {progressView === 'milestones' && (
                  <motion.div
                    key="milestones"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="bg-white rounded-2xl p-8 border border-slate-200 shadow-lg"
                  >
                    <MilestoneTracker
                      milestones={milestones}
                      onAddMilestone={handleAddMilestone}
                      onUpdateMilestone={handleUpdateMilestone}
                      isLoading={loading}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ) : showHistory ? (
            <motion.div
              key="history"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="glass-card p-8"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <History className="text-emerald-500" />
                  <h2 className="text-xl font-semibold">Workout History</h2>
                </div>
                <button onClick={() => setShowHistory(false)} className="text-sm text-slate-400 hover:text-slate-600">Close</button>
              </div>

              {history.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <p>No history found. Generate your first routine!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {history.map(item => (
                    <div key={item.id} className="p-4 bg-white rounded-xl border border-slate-100 flex items-center justify-between group">
                      <div className="cursor-pointer flex-1" onClick={() => { setRoutine(item); setStep(4); setShowHistory(false); }}>
                        <h3 className="font-bold text-slate-800">{item.name}</h3>
                        <p className="text-xs text-slate-400">{new Date(item.createdAt).toLocaleDateString()}</p>
                      </div>
                      <button 
                        onClick={() => deleteHistoryItem(item.id)}
                        className="p-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          ) : step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="glass-card p-8"
            >
              <div className="flex items-center gap-3 mb-6">
                <User className="text-emerald-500" />
                <h2 className="text-xl font-semibold">Tell us about yourself</h2>
              </div>
              
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-600">Full Name</label>
                  <input 
                    type="text" 
                    placeholder="Enter your name"
                    value={profile.name}
                    onChange={e => setProfile({...profile, name: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-600">Gender</label>
                    <div className="flex gap-2">
                      {['Male', 'Female'].map((g) => (
                        <button
                          key={g}
                          onClick={() => setProfile({...profile, gender: g as 'Male' | 'Female'})}
                          className={cn(
                            "flex-1 py-3 rounded-xl border-2 text-sm font-semibold transition-all",
                            profile.gender === g 
                              ? "border-emerald-500 bg-emerald-50 text-emerald-700" 
                              : "border-slate-100 hover:border-slate-200 text-slate-500"
                          )}
                        >
                          {g}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-600">Age</label>
                    <input 
                      type="number" 
                      value={profile.age}
                      onChange={e => setProfile({...profile, age: parseInt(e.target.value)})}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-600">Current Weight (kg)</label>
                    <input 
                      type="number" 
                      value={profile.weight}
                      onChange={e => setProfile({...profile, weight: parseInt(e.target.value)})}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-600">Target Weight Gain (kg)</label>
                    <input 
                      type="number" 
                      value={profile.targetWeightGain}
                      onChange={e => setProfile({...profile, targetWeightGain: parseInt(e.target.value)})}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-600">Height (cm)</label>
                    <input 
                      type="number" 
                      value={profile.height}
                      onChange={e => setProfile({...profile, height: parseInt(e.target.value)})}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-600">Days per week</label>
                    <select 
                      value={profile.daysPerWeek}
                      onChange={e => setProfile({...profile, daysPerWeek: parseInt(e.target.value)})}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all appearance-none bg-white"
                    >
                      {[1,2,3,4,5,6,7].map(d => <option key={d} value={d}>{d} days</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* BMI Indicator */}
              <div className="mt-8 p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Your BMI</p>
                  <p className="text-2xl font-bold text-slate-800">{bmiData.bmi}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Category</p>
                  <p className={cn(
                    "font-bold",
                    bmiData.category === 'Normal weight' ? "text-emerald-500" : "text-amber-500"
                  )}>{bmiData.category}</p>
                </div>
              </div>

              <button 
                onClick={handleNext}
                className="w-full mt-8 bg-slate-900 text-white py-4 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors group"
              >
                Next Step
                <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="glass-card p-8"
            >
              <div className="flex items-center gap-3 mb-6">
                <Target className="text-emerald-500" />
                <h2 className="text-xl font-semibold">What is your goal?</h2>
              </div>

              <div className="grid gap-3">
                {GOALS.map(goal => (
                  <button
                    key={goal.value}
                    onClick={() => setProfile({...profile, goal: goal.value})}
                    className={cn(
                      "flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left",
                      profile.goal === goal.value 
                        ? "border-emerald-500 bg-emerald-50 text-emerald-700" 
                        : "border-slate-100 hover:border-slate-200 text-slate-600"
                    )}
                  >
                    <div className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center",
                      profile.goal === goal.value ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-400"
                    )}>
                      {goal.icon}
                    </div>
                    <span className="font-semibold">{goal.label}</span>
                    {profile.goal === goal.value && <CheckCircle2 className="ml-auto w-5 h-5" />}
                  </button>
                ))}
              </div>

              <div className="flex gap-4 mt-8">
                <button onClick={handleBack} className="flex-1 py-4 rounded-xl font-semibold text-slate-600 hover:bg-slate-100 transition-colors flex items-center justify-center gap-2">
                  <ChevronLeft className="w-5 h-5" /> Back
                </button>
                <button onClick={handleNext} className="flex-[2] bg-slate-900 text-white py-4 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors group">
                  Continue <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="glass-card p-8"
            >
              <div className="flex items-center gap-3 mb-6">
                <Sparkles className="text-emerald-500" />
                <h2 className="text-xl font-semibold">Equipment & Level</h2>
              </div>

              <div className="space-y-6">
                <div className="space-y-3">
                  <label className="text-sm font-semibold text-slate-600">Fitness Level</label>
                  <div className="grid grid-cols-3 gap-2">
                    {LEVELS.map(level => (
                      <button
                        key={level.value}
                        onClick={() => setProfile({...profile, level: level.value})}
                        className={cn(
                          "py-3 rounded-xl border-2 text-sm font-semibold transition-all",
                          profile.level === level.value 
                            ? "border-emerald-500 bg-emerald-50 text-emerald-700" 
                            : "border-slate-100 hover:border-slate-200 text-slate-500"
                        )}
                      >
                        {level.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-semibold text-slate-600">Available Equipment</label>
                  <div className="grid gap-2">
                    {EQUIPMENT.map(eq => (
                      <button
                        key={eq.value}
                        onClick={() => {
                          const current = profile.equipment;
                          if (current.includes(eq.value)) {
                            setProfile({...profile, equipment: current.filter(i => i !== eq.value)});
                          } else {
                            setProfile({...profile, equipment: [...current, eq.value]});
                          }
                        }}
                        className={cn(
                          "flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left",
                          profile.equipment.includes(eq.value)
                            ? "border-emerald-500 bg-emerald-50 text-emerald-700" 
                            : "border-slate-100 hover:border-slate-200 text-slate-500"
                        )}
                      >
                        <div className={cn(
                          "w-5 h-5 rounded border flex items-center justify-center transition-all",
                          profile.equipment.includes(eq.value) ? "bg-emerald-500 border-emerald-500 text-white" : "border-slate-300"
                        )}>
                          {profile.equipment.includes(eq.value) && <CheckCircle2 className="w-3 h-3" />}
                        </div>
                        <span className="font-medium">{eq.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-4 mt-8">
                <button onClick={handleBack} className="flex-1 py-4 rounded-xl font-semibold text-slate-600 hover:bg-slate-100 transition-colors flex items-center justify-center gap-2">
                  <ChevronLeft className="w-5 h-5" /> Back
                </button>
                <button 
                  onClick={handleGenerate} 
                  disabled={loading}
                  className="flex-[2] bg-emerald-600 text-white py-4 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-emerald-700 transition-colors disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                  {loading ? "Generating..." : "Generate Routine"}
                </button>
              </div>
            </motion.div>
          )}

          {step === 4 && routine && (
            <motion.div
              key="routine"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full space-y-6"
            >
              <div className="glass-card p-8">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h2 className="text-3xl font-bold text-slate-900 mb-2">{routine.name}</h2>
                    <p className="text-slate-500 leading-relaxed">{routine.description}</p>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={downloadPlan}
                      className="p-2 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-lg transition-all"
                      title="Download Plan"
                    >
                      <Download className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={reset}
                      className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
                      title="Reset"
                    >
                      <RotateCcw className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Diet Suggestions Section */}
                <div className="mb-12 p-6 bg-emerald-50 rounded-2xl border border-emerald-100">
                  <div className="flex items-center gap-3 mb-4">
                    <Utensils className="text-emerald-600 w-5 h-5" />
                    <h3 className="text-lg font-bold text-emerald-900">AI Diet Suggestions</h3>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    {routine.dietSuggestions?.map((diet: any, idx: number) => (
                      <div key={idx} className="space-y-1">
                        <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider">{diet.mealType}</p>
                        <ul className="text-sm text-emerald-800 list-disc list-inside">
                          {diet.suggestions.map((s: string, sIdx: number) => (
                            <li key={sIdx}>{s}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-8">
                  {routine.weeklySchedule.map((day: any, idx: number) => (
                    <div key={idx} className="space-y-4">
                      <div className="flex items-center gap-3 pb-2 border-b border-slate-100">
                        <Calendar className="w-5 h-5 text-emerald-500" />
                        <h3 className="text-lg font-bold text-slate-800">{day.day}: <span className="font-medium text-slate-500">{day.focus}</span></h3>
                      </div>
                      
                      <div className="grid gap-3">
                        {day.exercises.map((ex: any, exIdx: number) => (
                          <div key={exIdx} className="p-4 bg-slate-50 rounded-xl border border-slate-100 hover:border-emerald-200 transition-all">
                            <div className="flex justify-between items-start mb-2">
                              <h4 className="font-bold text-slate-800">{ex.name}</h4>
                              <div className="flex gap-2">
                                <span className="px-2 py-1 bg-white rounded text-xs font-bold text-slate-500 border border-slate-200">{ex.sets} Sets</span>
                                <span className="px-2 py-1 bg-white rounded text-xs font-bold text-slate-500 border border-slate-200">{ex.reps} Reps</span>
                              </div>
                            </div>
                            {ex.notes && <p className="text-sm text-slate-500 italic">"{ex.notes}"</p>}
                            <div className="mt-2 flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold text-slate-400">
                              <span>Rest: {ex.rest}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <button 
                  onClick={() => window.print()}
                  className="w-full mt-12 bg-slate-900 text-white py-4 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors"
                >
                  Print Routine
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer Info */}
      <div className="mt-12 text-center text-slate-400 text-sm">
        <p>© 2026 FitAI • Powered by Gemini Pro</p>
      </div>
    </div>
    </ErrorBoundary>
  );
}
