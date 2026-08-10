// Matches one emoji "cluster": a pictographic base optionally followed by a
// skin-tone modifier, a variation selector, or a ZWJ-joined sequence of more
// pictographs (e.g. a family/couple emoji) — or a two-letter regional
// indicator flag sequence (e.g. 🇳🇱) — but not plain text. A blunt check,
// not a full grapheme-cluster parser, in the same spirit as the chat's
// banned-words filter: good enough to keep a free-text input from becoming
// a way to type out the solution.
const VARIATION_SELECTOR = "️";
const ZWJ = "‍";
const PICTOGRAPH = "[\\p{Extended_Pictographic}\\p{Emoji_Presentation}]";
const EMOJI_PATTERN = new RegExp(
  `^(\\p{Regional_Indicator}{2}|${PICTOGRAPH}(\\p{Emoji_Modifier}|${VARIATION_SELECTOR}|${ZWJ}${PICTOGRAPH})*)$`,
  "u"
);

export function isSingleEmoji(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  return EMOJI_PATTERN.test(trimmed);
}
