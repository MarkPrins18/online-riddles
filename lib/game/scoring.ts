import type { PuzzleDifficulty } from "@/types/puzzle";

const BASE_SCORE_BY_DIFFICULTY: Record<PuzzleDifficulty, number> = {
  easy: 100,
  medium: 150,
  hard: 200,
};

const QUESTIONS_PENALTY_THRESHOLD = 10;
const PENALTY_PER_EXTRA_QUESTION = 5;
const MIN_SCORE = 25;

/**
 * The solver's *extra* on top of the shared TEAM_SOLVE_BONUS — rewards
 * fewer questions asked with a higher score, floored so that a
 * puzzle-heavy round still yields a meaningful reward.
 */
export function calculateGuessScore(
  difficulty: PuzzleDifficulty,
  questionsAsked: number
): number {
  const base = BASE_SCORE_BY_DIFFICULTY[difficulty];
  const extraQuestions = Math.max(0, questionsAsked - QUESTIONS_PENALTY_THRESHOLD);
  const penalty = extraQuestions * PENALTY_PER_EXTRA_QUESTION;
  return Math.max(MIN_SCORE, base - penalty);
}

/** Awarded to every non-narrator player (including the solver) when a puzzle is solved. */
export const TEAM_SOLVE_BONUS = 100;

export function calculateTeamSolveBonus(): number {
  return TEAM_SOLVE_BONUS;
}

export const WRONG_GUESS_PENALTY = 20;

export function calculateWrongGuessPenalty(): number {
  return WRONG_GUESS_PENALTY;
}

export const NARRATOR_BONUS_ON_SOLVE = 25;

export function calculateNarratorBonus(): number {
  return NARRATOR_BONUS_ON_SOLVE;
}

export const BEST_QUESTION_BONUS = 15;

export function calculateBestQuestionBonus(): number {
  return BEST_QUESTION_BONUS;
}
