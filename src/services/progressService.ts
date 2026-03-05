import { ProgressEntry, WorkoutLog, Milestone, MealLog, WorkoutStreak, PerformanceAnalytics } from '../types';
import { collection, query, where, orderBy, getDocs, setDoc, doc, updateDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { getFirestore } from 'firebase/firestore';

/**
 * Progress Tracking Service
 * Handles all progress-related operations for user fitness tracking
 */

export class ProgressService {
  private static instance: ProgressService;
  private db: any;

  private constructor(db: any) {
    this.db = db;
  }

  static getInstance(db: any): ProgressService {
    if (!ProgressService.instance) {
      ProgressService.instance = new ProgressService(db);
    }
    return ProgressService.instance;
  }

  // ===== Progress Entry Methods =====
  async addProgressEntry(userId: string, entry: Omit<ProgressEntry, 'id' | 'createdAt'>): Promise<string> {
    const id = Date.now().toString();
    const progressEntry: ProgressEntry = {
      ...entry,
      id,
      userId,
      createdAt: new Date().toISOString(),
    };

    try {
      await setDoc(
        doc(this.db, 'users', userId, 'progress', id),
        progressEntry
      );
      // Also save to localStorage as backup
      this.saveProgressToLocalStorage(userId, progressEntry);
      return id;
    } catch (error) {
      // Fallback to localStorage
      this.saveProgressToLocalStorage(userId, progressEntry);
      return id;
    }
  }

  async getProgressHistory(userId: string, days: number = 90): Promise<ProgressEntry[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    try {
      const q = query(
        collection(this.db, 'users', userId, 'progress'),
        where('date', '>=', startDate.toISOString().split('T')[0]),
        orderBy('date', 'desc')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => doc.data() as ProgressEntry);
    } catch (error) {
      // Fallback to localStorage
      return this.getProgressFromLocalStorage(userId);
    }
  }

  async updateProgressEntry(userId: string, entryId: string, updates: Partial<ProgressEntry>): Promise<void> {
    try {
      await updateDoc(
        doc(this.db, 'users', userId, 'progress', entryId),
        updates
      );
      // Update localStorage
      this.updateProgressInLocalStorage(userId, entryId, updates);
    } catch (error) {
      this.updateProgressInLocalStorage(userId, entryId, updates);
    }
  }

  async deleteProgressEntry(userId: string, entryId: string): Promise<void> {
    try {
      await deleteDoc(doc(this.db, 'users', userId, 'progress', entryId));
      this.deleteProgressFromLocalStorage(userId, entryId);
    } catch (error) {
      this.deleteProgressFromLocalStorage(userId, entryId);
    }
  }

  // ===== Workout Log Methods =====
  async logWorkout(userId: string, log: Omit<WorkoutLog, 'id' | 'createdAt'>): Promise<string> {
    const id = Date.now().toString();
    const workoutLog: WorkoutLog = {
      ...log,
      id,
      userId,
      createdAt: new Date().toISOString(),
    };

    try {
      await setDoc(
        doc(this.db, 'users', userId, 'workoutLogs', id),
        workoutLog
      );
      this.saveWorkoutLogToLocalStorage(userId, workoutLog);
      return id;
    } catch (error) {
      this.saveWorkoutLogToLocalStorage(userId, workoutLog);
      return id;
    }
  }

  async getWorkoutLogs(userId: string, days: number = 90): Promise<WorkoutLog[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    try {
      const q = query(
        collection(this.db, 'users', userId, 'workoutLogs'),
        where('date', '>=', startDate.toISOString().split('T')[0]),
        orderBy('date', 'desc')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => doc.data() as WorkoutLog);
    } catch (error) {
      return this.getWorkoutLogsFromLocalStorage(userId);
    }
  }

  // ===== Milestone Methods =====
  async createMilestone(userId: string, milestone: Omit<Milestone, 'id' | 'createdAt'>): Promise<string> {
    const id = Date.now().toString();
    const newMilestone: Milestone = {
      ...milestone,
      id,
      userId,
      createdAt: new Date().toISOString(),
    };

    try {
      await setDoc(
        doc(this.db, 'users', userId, 'milestones', id),
        newMilestone
      );
      this.saveMilestoneToLocalStorage(userId, newMilestone);
      return id;
    } catch (error) {
      this.saveMilestoneToLocalStorage(userId, newMilestone);
      return id;
    }
  }

  async getMilestones(userId: string): Promise<Milestone[]> {
    try {
      const q = query(
        collection(this.db, 'users', userId, 'milestones'),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => doc.data() as Milestone);
    } catch (error) {
      return this.getMilestonesFromLocalStorage(userId);
    }
  }

  async updateMilestone(userId: string, milestoneId: string, updates: Partial<Milestone>): Promise<void> {
    try {
      await updateDoc(
        doc(this.db, 'users', userId, 'milestones', milestoneId),
        updates
      );
      this.updateMilestoneInLocalStorage(userId, milestoneId, updates);
    } catch (error) {
      this.updateMilestoneInLocalStorage(userId, milestoneId, updates);
    }
  }

  // ===== Meal Log Methods =====
  async logMeal(userId: string, meal: Omit<MealLog, 'id' | 'createdAt'>): Promise<string> {
    const id = Date.now().toString();
    const mealLog: MealLog = {
      ...meal,
      id,
      userId,
      createdAt: new Date().toISOString(),
    };

    try {
      await setDoc(
        doc(this.db, 'users', userId, 'mealLogs', id),
        mealLog
      );
      this.saveMealLogToLocalStorage(userId, mealLog);
      return id;
    } catch (error) {
      this.saveMealLogToLocalStorage(userId, mealLog);
      return id;
    }
  }

  async getMealLogs(userId: string, date?: string): Promise<MealLog[]> {
    const targetDate = date || new Date().toISOString().split('T')[0];

    try {
      const q = query(
        collection(this.db, 'users', userId, 'mealLogs'),
        where('date', '==', targetDate),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => doc.data() as MealLog);
    } catch (error) {
      return this.getMealLogsFromLocalStorage(userId, targetDate);
    }
  }

  // ===== LocalStorage Fallback Methods =====
  private saveProgressToLocalStorage(userId: string, entry: ProgressEntry): void {
    const key = `progress_${userId}`;
    const existing = JSON.parse(localStorage.getItem(key) || '[]');
    localStorage.setItem(key, JSON.stringify([entry, ...existing].slice(0, 100)));
  }

  private getProgressFromLocalStorage(userId: string): ProgressEntry[] {
    const key = `progress_${userId}`;
    return JSON.parse(localStorage.getItem(key) || '[]');
  }

  private updateProgressInLocalStorage(userId: string, entryId: string, updates: Partial<ProgressEntry>): void {
    const key = `progress_${userId}`;
    const entries = JSON.parse(localStorage.getItem(key) || '[]') as ProgressEntry[];
    const updated = entries.map(e => e.id === entryId ? { ...e, ...updates } : e);
    localStorage.setItem(key, JSON.stringify(updated));
  }

  private deleteProgressFromLocalStorage(userId: string, entryId: string): void {
    const key = `progress_${userId}`;
    const entries = JSON.parse(localStorage.getItem(key) || '[]') as ProgressEntry[];
    const filtered = entries.filter(e => e.id !== entryId);
    localStorage.setItem(key, JSON.stringify(filtered));
  }

  private saveWorkoutLogToLocalStorage(userId: string, log: WorkoutLog): void {
    const key = `workoutLogs_${userId}`;
    const existing = JSON.parse(localStorage.getItem(key) || '[]');
    localStorage.setItem(key, JSON.stringify([log, ...existing].slice(0, 100)));
  }

  private getWorkoutLogsFromLocalStorage(userId: string): WorkoutLog[] {
    const key = `workoutLogs_${userId}`;
    return JSON.parse(localStorage.getItem(key) || '[]');
  }

  private saveMilestoneToLocalStorage(userId: string, milestone: Milestone): void {
    const key = `milestones_${userId}`;
    const existing = JSON.parse(localStorage.getItem(key) || '[]');
    localStorage.setItem(key, JSON.stringify([milestone, ...existing]));
  }

  private getMilestonesFromLocalStorage(userId: string): Milestone[] {
    const key = `milestones_${userId}`;
    return JSON.parse(localStorage.getItem(key) || '[]');
  }

  private updateMilestoneInLocalStorage(userId: string, milestoneId: string, updates: Partial<Milestone>): void {
    const key = `milestones_${userId}`;
    const milestones = JSON.parse(localStorage.getItem(key) || '[]') as Milestone[];
    const updated = milestones.map(m => m.id === milestoneId ? { ...m, ...updates } : m);
    localStorage.setItem(key, JSON.stringify(updated));
  }

  private saveMealLogToLocalStorage(userId: string, meal: MealLog): void {
    const key = `mealLogs_${userId}`;
    const existing = JSON.parse(localStorage.getItem(key) || '[]');
    localStorage.setItem(key, JSON.stringify([meal, ...existing].slice(0, 200)));
  }

  private getMealLogsFromLocalStorage(userId: string, date?: string): MealLog[] {
    const key = `mealLogs_${userId}`;
    const all = JSON.parse(localStorage.getItem(key) || '[]') as MealLog[];
    if (date) {
      return all.filter(m => m.date === date);
    }
    return all;
  }
}
