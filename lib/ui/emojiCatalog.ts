export type EmojiCategory = {
  labelKey: "categorySmileys" | "categoryGestures" | "categoryHearts" | "categoryFun";
  emojis: string[];
};

// A curated, small catalog for the picker's expanded grid — not the full
// Unicode emoji set (that's a multi-thousand-entry data file for a "fun
// chat extra"). Anything not listed here can still be typed/pasted via the
// free-text field at the bottom of the picker.
export const EMOJI_CATEGORIES: EmojiCategory[] = [
  {
    labelKey: "categorySmileys",
    emojis: ["😀", "😂", "🤣", "😊", "😍", "😘", "🤔", "😮", "😢", "😭", "😡", "😱", "🥳", "😴", "🤯", "🙄"],
  },
  {
    labelKey: "categoryGestures",
    emojis: ["👍", "👎", "👏", "🙌", "🤝", "🙏", "💪", "👀", "🤷", "🖐️"],
  },
  {
    labelKey: "categoryHearts",
    emojis: ["❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "💔", "💯"],
  },
  {
    labelKey: "categoryFun",
    emojis: ["🔥", "🎉", "✨", "💡", "🕵️", "🔍", "💀", "👻", "🃏", "🎲"],
  },
];
