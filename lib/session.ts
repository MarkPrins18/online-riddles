const STORAGE_PREFIX = "dark-riddles:player:";

export function getStoredPlayerId(roomCode: string): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(STORAGE_PREFIX + roomCode.toUpperCase());
}

export function storePlayerId(roomCode: string, playerId: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_PREFIX + roomCode.toUpperCase(), playerId);
}

export function clearStoredPlayerId(roomCode: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_PREFIX + roomCode.toUpperCase());
}
