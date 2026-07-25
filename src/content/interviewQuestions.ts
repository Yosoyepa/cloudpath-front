export const interviewQuestions = [
  {
    id: "goal",
    prompt: "¿Qué quieres conseguir con esta certificación?",
    placeholder: "Ej. postular a mi primer rol cloud en dos meses",
  },
  {
    id: "experience",
    prompt: "¿Qué experiencia tienes hoy con AWS o cloud?",
    placeholder: "Ej. he usado S3 y EC2 en proyectos personales",
  },
  {
    id: "weekly-minutes",
    prompt: "¿Cuánto tiempo puedes estudiar por semana?",
    placeholder: "Ej. 150 minutos, principalmente los fines de semana",
  },
  {
    id: "deadline",
    prompt: "¿Tienes una fecha objetivo para el examen?",
    placeholder: "Ej. dentro de ocho semanas",
  },
  {
    id: "format",
    prompt: "¿Aprendes mejor leyendo, viendo, practicando o explicando?",
    placeholder: "Ej. practicando y luego explicándolo en voz alta",
  },
  {
    id: "friction",
    prompt: "¿Qué suele hacerte abandonar una ruta de estudio?",
    placeholder: "Ej. demasiada teoría sin saber si realmente entendí",
  },
] as const;

export type InterviewQuestionId = (typeof interviewQuestions)[number]["id"];
