export type Kind = "upper" | "lower" | "iso" | "bodyweight";

export type Exercise = {
  id: string;
  name: string;
  sets: number;
  repMin: number;
  repMax: number;
  kind: Kind;
  jump: number;
  note?: string;
};

export type DayType = "push" | "pull" | "legs";

export type Day = {
  day: number; // JS Date.getDay(): 1 = Mon … 6 = Sat
  short: string;
  title: string;
  type: DayType;
  exercises: Exercise[];
};

export const JUMP: Record<Kind, number> = { upper: 2.5, lower: 5, iso: 2, bodyweight: 0 };

export const REST_GUIDANCE = "Rest 2–3 min on the first 2 exercises, 60–90 sec on the rest.";
export const REST_DAY_MESSAGE = "Rest day. Sleep 7–9 hours. Walk if you want.";

function ex(
  id: string,
  name: string,
  sets: number,
  repMin: number,
  repMax: number,
  kind: Kind,
  extra: { note?: string; jump?: number } = {},
): Exercise {
  return { id, name, sets, repMin, repMax, kind, jump: extra.jump ?? JUMP[kind], ...(extra.note ? { note: extra.note } : {}) };
}

// Shared exercises are the same object, so they share one history (keyed by id).
const inclineDbPress = ex("incline-db-press", "Incline dumbbell press", 4, 8, 10, "upper");
const rdl = (sets: number) => ex("romanian-deadlift", "Romanian deadlift", sets, 8, 10, "lower");

export const PLAN: Day[] = [
  {
    day: 1,
    short: "Mon",
    title: "Push A — chest",
    type: "push",
    exercises: [
      ex("bench-press", "Barbell bench press", 4, 6, 8, "upper"),
      inclineDbPress,
      ex("cable-fly", "Cable fly", 3, 12, 15, "iso"),
      ex("seated-db-press", "Seated dumbbell press", 3, 8, 10, "upper"),
      ex("lateral-raise", "Lateral raise", 4, 12, 15, "iso"),
      ex("overhead-cable-ext", "Overhead cable extension", 3, 10, 12, "iso"),
      ex("rope-pushdown", "Rope pushdown", 3, 12, 15, "iso"),
    ],
  },
  {
    day: 2,
    short: "Tue",
    title: "Pull A — back thickness",
    type: "pull",
    exercises: [
      ex("deadlift", "Deadlift", 3, 5, 5, "lower"),
      ex("barbell-row", "Barbell row", 4, 6, 8, "upper"),
      ex("lat-pulldown-wide", "Lat pulldown (wide)", 3, 10, 12, "upper"),
      ex("chest-supported-row", "Chest-supported row", 3, 10, 12, "upper"),
      ex("face-pull", "Face pull", 3, 15, 20, "iso"),
      ex("barbell-curl", "Barbell curl", 4, 8, 10, "iso"),
      ex("hammer-curl", "Hammer curl", 3, 10, 12, "iso"),
    ],
  },
  {
    day: 3,
    short: "Wed",
    title: "Legs A — quads",
    type: "legs",
    exercises: [
      ex("back-squat", "Barbell back squat", 4, 6, 8, "lower"),
      ex("leg-press", "Leg press", 3, 10, 12, "lower"),
      rdl(3),
      ex("leg-extension", "Leg extension", 3, 12, 15, "iso"),
      ex("seated-leg-curl", "Seated leg curl", 3, 10, 12, "iso"),
      ex("standing-calf-raise", "Standing calf raise", 4, 12, 15, "iso"),
      ex("hanging-leg-raise", "Hanging leg raise", 3, 12, 15, "bodyweight"),
    ],
  },
  {
    day: 4,
    short: "Thu",
    title: "Push B — shoulders",
    type: "push",
    exercises: [
      ex("ohp", "Overhead barbell press", 4, 6, 8, "upper"),
      inclineDbPress,
      ex("cable-lateral-raise", "Cable lateral raise", 4, 15, 20, "iso"),
      ex("pec-deck", "Pec deck", 3, 12, 15, "iso"),
      ex("reverse-pec-deck", "Reverse pec deck", 3, 15, 20, "iso"),
      ex("close-grip-bench", "Close-grip bench press", 3, 8, 10, "upper"),
      ex("overhead-db-ext", "Overhead dumbbell extension", 3, 10, 12, "iso"),
    ],
  },
  {
    day: 5,
    short: "Fri",
    title: "Pull B — back width",
    type: "pull",
    exercises: [
      ex("weighted-pullup", "Weighted pull-up", 4, 6, 8, "upper", { note: "weight = added kg" }),
      ex("single-arm-db-row", "Single-arm dumbbell row", 4, 10, 12, "upper"),
      ex("seated-cable-row-wide", "Seated cable row (wide)", 3, 10, 12, "upper"),
      ex("straight-arm-pulldown", "Straight-arm pulldown", 3, 12, 15, "iso"),
      ex("barbell-shrug", "Barbell shrug", 3, 12, 15, "iso"),
      ex("incline-db-curl", "Incline dumbbell curl", 3, 10, 12, "iso"),
      ex("reverse-curl", "Reverse curl", 3, 12, 15, "iso"),
    ],
  },
  {
    day: 6,
    short: "Sat",
    title: "Legs B — hams & glutes",
    type: "legs",
    exercises: [
      rdl(4),
      ex("hip-thrust", "Barbell hip thrust", 4, 10, 12, "lower"),
      ex("bulgarian-split-squat", "Bulgarian split squat", 3, 10, 10, "lower", { note: "reps per leg", jump: 2.5 }),
      ex("lying-leg-curl", "Lying leg curl", 4, 12, 15, "iso"),
      ex("leg-press-feet-high", "Leg press (feet high)", 3, 12, 15, "lower"),
      ex("seated-calf-raise", "Seated calf raise", 4, 15, 20, "iso"),
      ex("cable-crunch", "Cable crunch", 3, 15, 15, "iso"),
    ],
  },
];

export function getDay(day: number): Day | undefined {
  return PLAN.find((d) => d.day === day);
}

export function findExercise(day: number, exerciseId: string): Exercise | undefined {
  return getDay(day)?.exercises.find((e) => e.id === exerciseId);
}
