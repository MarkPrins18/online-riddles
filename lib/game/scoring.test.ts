import { describe, expect, it } from "vitest";
import {
  ACCUSATION_CORRECT_BONUS,
  ACCUSATION_WRONG_PENALTY,
  BEST_QUESTION_BONUS,
  NARRATOR_BONUS_ON_SOLVE,
  TEAM_SOLVE_BONUS,
  WRONG_GUESS_PENALTY,
  calculateAccusationCorrectBonus,
  calculateAccusationWrongPenalty,
  calculateBestQuestionBonus,
  calculateGuessScore,
  calculateNarratorBonus,
  calculateSaboteurBonus,
  calculateTeamSolveBonus,
  calculateWrongGuessPenalty,
} from "./scoring";

describe("calculateGuessScore", () => {
  it("returns the base score per difficulty when under the question threshold", () => {
    expect(calculateGuessScore("easy", 5)).toBe(100);
    expect(calculateGuessScore("medium", 10)).toBe(150);
    expect(calculateGuessScore("hard", 0)).toBe(200);
  });

  it("applies no penalty exactly at the threshold", () => {
    expect(calculateGuessScore("easy", 10)).toBe(100);
  });

  it("subtracts a penalty per question above the threshold", () => {
    expect(calculateGuessScore("easy", 12)).toBe(100 - 2 * 5);
  });

  it("floors the score at the minimum instead of going negative", () => {
    expect(calculateGuessScore("easy", 100)).toBe(25);
  });
});

describe("flat bonuses/penalties", () => {
  it("expose their constants via the calculate* helpers", () => {
    expect(calculateTeamSolveBonus()).toBe(TEAM_SOLVE_BONUS);
    expect(calculateWrongGuessPenalty()).toBe(WRONG_GUESS_PENALTY);
    expect(calculateNarratorBonus()).toBe(NARRATOR_BONUS_ON_SOLVE);
    expect(calculateBestQuestionBonus()).toBe(BEST_QUESTION_BONUS);
    expect(calculateAccusationCorrectBonus()).toBe(ACCUSATION_CORRECT_BONUS);
    expect(calculateAccusationWrongPenalty()).toBe(ACCUSATION_WRONG_PENALTY);
  });
});

describe("calculateSaboteurBonus", () => {
  it("pays the jackpot when unsolved and undetected", () => {
    expect(calculateSaboteurBonus(false, false)).toBe(150);
  });

  it("pays a reduced bonus when unsolved but identified", () => {
    expect(calculateSaboteurBonus(false, true)).toBe(75);
  });

  it("pays a small bonus when solved but undetected", () => {
    expect(calculateSaboteurBonus(true, false)).toBe(40);
  });

  it("pays nothing when solved and identified", () => {
    expect(calculateSaboteurBonus(true, true)).toBe(0);
  });
});
