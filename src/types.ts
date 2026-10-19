export type Role = "admin" | "teacher" | "student";
export interface User {
  id: number;
  name: string;
  email: string;
  phone: string;
  active: boolean;
  role: Role;
}
export interface Student extends User {
  teacher_id: number;
  teacher: string;
  plan: string | null;
  plan_id: number | null;
  birthday: string | null;
  enrollment: string;
  objective: string;
  consent: boolean;
}
export interface Teacher extends User {
  specialty: string;
  registration: string;
}
export interface Plan {
  id: number;
  name: string;
  description: string;
  price: number;
  months: number;
  benefits: string;
  active: boolean;
}
export interface Exercise {
  id: number;
  name: string;
  muscle: string;
  category: string;
  equipment: string;
  level: string;
  instructions: string;
  precautions: string;
  active: boolean;
}
export interface WorkoutExercise {
  exercise_id: number;
  name: string;
  muscle: string;
  instructions: string;
  precautions: string;
  sets: number;
  reps: string;
  load: number;
  rest: number;
  position: number;
}
export interface Workout {
  id: number;
  student_id: number;
  teacher_id: number;
  name: string;
  objective: string;
  division: string;
  notes: string;
  active: boolean;
  created: string;
  updated: string;
  exercises: WorkoutExercise[];
  versions: { id: number; created: string; snapshot: Workout }[];
}
export interface Assessment {
  id: number;
  student_id: number;
  date: string;
  weight: number;
  height: number;
  waist: number;
  notes: string;
  objective: string;
  next_date: string;
}
export interface Attendance {
  id: number;
  student_id: number;
  day: string;
  time: string;
}
export interface Payment {
  id: number;
  student_id: number;
  amount: number;
  due: string;
  status: "Pago" | "Pendente" | "Vencido" | "Cancelado";
  paid_at: string | null;
  method: string;
}
export interface Session {
  id: number;
  student_id: number;
  workout_id: number;
  created: string;
  logs: {
    id: number;
    name: string;
    sets: number;
    reps: number;
    load: number;
  }[];
}
export interface State {
  user: User;
  students: Student[];
  teachers: Teacher[];
  plans: Plan[];
  exercises: Exercise[];
  workouts: Workout[];
  assessments: Assessment[];
  attendance: Attendance[];
  payments: Payment[];
  sessions: Session[];
  subscriptions: {
    id: number;
    student_id: number;
    plan_id: number;
    active: boolean;
  }[];
  notifications: { id: number; title: string; created: string }[];
  audit: {
    id: number;
    action: string;
    actor: string;
    entity: string;
    entity_id: number;
    created: string;
  }[];
  settings: { gym_name: string; phone: string; address: string };
  csrf: string;
  today: string;
  demo: boolean;
}
export type Entity =
  | "students"
  | "teachers"
  | "exercises"
  | "workouts"
  | "assessments"
  | "plans"
  | "subscriptions"
  | "payments"
  | "attendance"
  | "profile"
  | "settings";
export interface EditorSpec {
  entity: Entity;
  id?: number;
  studentId?: number;
  paymentAction?: "Pago" | "Cancelado";
}
