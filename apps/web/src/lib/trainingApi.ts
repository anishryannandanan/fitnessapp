import { apiFetch } from './authApi';

// ---- Exercises ----
export interface Exercise {
  id: string;
  name: string;
  muscleGroup: string | null;
  equipment: string | null;
  difficulty: string;
}

export function fetchExercises(token: string, q?: string): Promise<Exercise[]> {
  return apiFetch<Exercise[]>(`/api/v1/exercises${q ? `?q=${encodeURIComponent(q)}` : ''}`, token);
}

// ---- Workout plans ----
export interface PlanExerciseInput {
  exerciseId: string;
  sets: number;
  reps: string;
  restSec: number;
}
export interface WorkoutPlan {
  id: string;
  name: string;
  goal: string | null;
  isTemplate: boolean;
  exercises: { id: string; sets: number; reps: string; exercise?: { name: string; muscleGroup: string | null } }[];
}

export function fetchWorkoutPlans(token: string): Promise<WorkoutPlan[]> {
  return apiFetch<WorkoutPlan[]>('/api/v1/workout-plans', token);
}

export function createWorkoutPlan(
  token: string,
  payload: { name: string; goal?: string; exercises: PlanExerciseInput[] },
): Promise<WorkoutPlan> {
  return apiFetch<WorkoutPlan>('/api/v1/workout-plans', token, { method: 'POST', body: JSON.stringify(payload) });
}

// ---- Diet plans ----
export interface DietMealInput {
  mealType: string;
  title: string;
  calories?: number;
  proteinG?: number;
  carbsG?: number;
  fatG?: number;
}
export interface DietPlan {
  id: string;
  name: string;
  dailyCalories: number | null;
  meals: { id: string; mealType: string; title: string; calories: number | null }[];
}

export function fetchDietPlans(token: string): Promise<DietPlan[]> {
  return apiFetch<DietPlan[]>('/api/v1/diet-plans', token);
}

export function createDietPlan(
  token: string,
  payload: { name: string; dailyCalories?: number; meals: DietMealInput[] },
): Promise<DietPlan> {
  return apiFetch<DietPlan>('/api/v1/diet-plans', token, { method: 'POST', body: JSON.stringify(payload) });
}
