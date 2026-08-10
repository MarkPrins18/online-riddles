/** Shared with Timer's own display math and the sound-cue hook, so both agree on when the round is "almost up". */
export function computeRemainingSeconds(
  startedAt: string,
  durationSeconds: number,
  now: number
): number {
  const elapsedSeconds = (now - new Date(startedAt).getTime()) / 1000;
  return durationSeconds - elapsedSeconds;
}
