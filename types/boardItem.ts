export type BoardItemKind = "note" | "question";
export type BoardNoteColor = "yellow" | "pink" | "blue" | "green";

export type BoardItem = {
  id: string;
  room_id: string;
  kind: BoardItemKind;
  text: string | null;
  color: BoardNoteColor;
  question_id: string | null;
  x: number;
  y: number;
  created_by: string;
  created_at: string;
};
