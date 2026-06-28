export type ExerciseType = 'media' | 'drag_drop' | 'multiple_choice';

export interface BaseQuestion {
  id: string;
  options: { id: string; text: string }[];
  correctAnswerId: string;
}

export interface MediaQuestion extends BaseQuestion {
  groupId?: string;
  triggerTime: number;
  mustPauseToAnswer: boolean;
  questionText: string;
}

export interface DragDropQuestion extends BaseQuestion {
  zoneId: string;
  passage?: string; // Dành cho Part 5 (Mỗi câu 1 đoạn văn)
}

export interface MultipleChoiceQuestion extends BaseQuestion {
  questionText: string;
}

interface BaseExercise {
  id: string;
  title?: string;
  instruction?: string;
  part?: number;
}

export interface MediaExercise extends BaseExercise {
  type: 'media';
  mediaType: 'video' | 'audio';
  url: string;
  imageUrl?: string;
  allowSeekForward: boolean;
  allowSeekReview: boolean;
  questions: MediaQuestion[];
}

export interface DragDropExercise extends BaseExercise {
  type: 'drag_drop';
  passage?: string;
  questions: DragDropQuestion[];
}

export interface MultipleChoiceExercise extends BaseExercise {
  type: 'multiple_choice';
  passage: string;
  questions: MultipleChoiceQuestion[];
}

export type ExamExercise = MediaExercise | DragDropExercise | MultipleChoiceExercise;

export interface CourseData {
  courseId: string;
  title: string;
  hasTimer: boolean;
  timeLimit: number;
  exercises: ExamExercise[];
}

export interface UserAnswerState {
  questionId: string;
  selectedAnswer: string;
  isCorrect: boolean;
}

export interface VocabItem {
  id: string;
  word: string;
  ipa: string;
  meaning: string;
  example?: string;
}