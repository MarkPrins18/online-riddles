"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useGameState } from "@/lib/game/useGameState";
import { getStoredPlayerId } from "@/lib/session";
import { getRandomPuzzle } from "@/lib/supabase/puzzles";
import { setNarrator, claimNarrator } from "@/lib/supabase/players";
import { setRoomPuzzle, advanceRoomRound, updateRoomStatus } from "@/lib/supabase/rooms";
import { pickNextNarrator, isNarrator } from "@/lib/game/roles";
import {
  createKickHandler,
  pickNarratorTakeoverElector,
  pickRandomOnlineCandidate,
} from "@/lib/game/membership";
import {
  nextRoundNumber,
  hasMoreRounds,
  isRoundTimeUp,
  isNextRoundTimeUp,
  secondsUntilNextRound,
} from "@/lib/game/rounds";
import { getLastYesAt, shouldShowHint } from "@/lib/game/hint";
import { targetDifficultyForRound } from "@/lib/game/difficulty";
import { useNowTick } from "@/lib/game/useNowTick";
import { getErrorMessage } from "@/lib/errors";
import { logCaseOutcome } from "@/lib/supabase/caseLog";
import { pinQuestion } from "@/lib/supabase/board";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Tabs } from "@/components/ui/Tabs";
import { InterrogationLog } from "./InterrogationLog";
import { CluesList } from "./CluesList";
import { QuestionForm } from "./QuestionForm";
import { ChatPanel } from "./ChatPanel";
import { ChatDrawer } from "./ChatDrawer";
import { NarratorCaseDrawer } from "./NarratorCaseDrawer";
import { NarratorBriefingScreen } from "./NarratorBriefingScreen";
import { ChatIconButton } from "./ChatIconButton";
import { ClaimHostBanner } from "@/components/ClaimHostBanner";
import { GuessForm } from "./GuessForm";
import { MyGuessFeedback } from "./MyGuessFeedback";
import { NarratorInbox } from "./NarratorInbox";
import { NarratorArchive } from "./NarratorArchive";
import { CorkboardButton } from "./CorkboardButton";
import { CorkboardOverlay } from "./CorkboardOverlay";
import { NextRoundCountdown } from "./NextRoundCountdown";
import { NarratorTensionPanel } from "./NarratorTensionPanel";
import { FinalScoreboard } from "./FinalScoreboard";
import { GameOverScreen } from "./GameOverScreen";
import { TeamLivesDisplay } from "./TeamLivesDisplay";
import { PlayersDrawer } from "./PlayersDrawer";
import { PlayersStrip } from "./PlayersStrip";
import { SolutionReveal } from "./SolutionReveal";
import { Timer } from "./Timer";

// How long the Verteller must be continuously offline (per Presence) before
// the game reassigns the role automatically — long enough that a closed
// laptop lid or a brief refresh doesn't trigger a handoff nobody wanted.
const NARRATOR_OFFLINE_TIMEOUT_MS = 2 * 60 * 1000;

export function GamePlayClient({ code }: { code: string }) {
  const [playerId] = useState(() => getStoredPlayerId(code));
  const { state, supabase } = useGameState(code, playerId);
  const router = useRouter();
  const now = useNowTick();
  const [nextCaseError, setNextCaseError] = useState<string | null>(null);
  const [isSkippingPuzzle, setIsSkippingPuzzle] = useState(false);
  const [skipPuzzleError, setSkipPuzzleError] = useState<string | null>(null);
  const [corkboardOpen, setCorkboardOpen] = useState(false);
  const [playersOpen, setPlayersOpen] = useState(false);
  const [chatDrawerOpen, setChatDrawerOpen] = useState(false);
  const [caseDrawerOpen, setCaseDrawerOpen] = useState(false);
  // The Verteller hasn't seen this puzzle's solution before (it's assigned
  // at random) — the briefing screen is a required first read, not
  // optional reference material, so it's tracked separately from the
  // on-demand NarratorCaseDrawer above. "Last acknowledged puzzle id"
  // rather than a boolean: a mid-round narrator handoff still needs its
  // own briefing even though the puzzle itself didn't change state.
  const [briefingSeenPuzzleId, setBriefingSeenPuzzleId] = useState<string | undefined>(undefined);
  // Drives the "Overleg" tab's unread badge on narrow screens (chat has its
  // own permanent column from xl up, so no badge is needed there).
  const [chatSeenCount, setChatSeenCount] = useState(() => state.chatMessages.length);
  // The scenario text starts open (you need to read it), but is collapsible
  // afterward to reclaim vertical space — biggest single space cost on a
  // small screen. Re-opens automatically for each new case (the "adjusting
  // state during render" pattern, not an effect, so it can't cascade).
  const [dossierOpen, setDossierOpen] = useState(true);
  const [dossierPuzzleId, setDossierPuzzleId] = useState<string | undefined>(undefined);
  const advancingToNextRoundRef = useRef(false);

  // Measures "vast" (dossier + los-de-zaak-op/spanningspaneel) so the
  // Overleg column (xl up) can be pinned to that exact pixel height instead
  // of growing forever with the message count. Re-runs once the guarded
  // early-return below stops blocking the vast div from existing, and again
  // whenever its content changes shape (new puzzle, revealed, etc).
  const vastRef = useRef<HTMLDivElement>(null);
  const [vastHeight, setVastHeight] = useState<number | null>(null);
  useEffect(() => {
    const el = vastRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const height = entries[0]?.contentRect.height;
      if (height) setVastHeight(height);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [state.room?.id, state.room?.status, state.puzzle?.id]);

  useEffect(() => {
    if (state.room?.status === "lobby") {
      router.push(`/room/${code}`);
    }
  }, [state.room?.status, code, router]);

  const timeUpHandledForRoundRef = useRef<number | null>(null);
  useEffect(() => {
    const room = state.room;
    const puzzle = state.puzzle;
    if (!room || !puzzle || room.status !== "playing") return;
    if (playerId !== room.host_id) return;
    if (!isRoundTimeUp(room.round_started_at, room.round_duration_seconds, now)) return;
    if (timeUpHandledForRoundRef.current === room.round) return;

    timeUpHandledForRoundRef.current = room.round;
    const narratorName = state.players.find((p) => p.id === room.narrator_id)?.name ?? null;
    logCaseOutcome(supabase, {
      roomId: room.id,
      round: room.round,
      puzzleTitle: puzzle.title,
      difficulty: puzzle.difficulty,
      outcome: "unsolved",
      solverName: null,
      narratorName,
      questionsAsked: state.questions.length,
    });
    updateRoomStatus(supabase, room.id, "revealed");
  }, [state.room, state.puzzle, state.players, state.questions, playerId, now, supabase]);

  const autoAdvanceHandledForRoundRef = useRef<number | null>(null);
  useEffect(() => {
    const room = state.room;
    if (!room || room.status !== "revealed" || !room.revealed_at) return;
    if (!hasMoreRounds(room.round, room.max_rounds)) return;
    if (playerId !== room.host_id) return;
    if (autoAdvanceHandledForRoundRef.current === room.round) return;
    if (!isNextRoundTimeUp(room.revealed_at, now)) return;

    autoAdvanceHandledForRoundRef.current = room.round;
    handleNextCase();
    // handleNextCase closes over state directly and is redefined every render;
    // including it here would just make this effect re-run every render for no
    // behavioral difference (the ref guard above already makes it idempotent
    // per round).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.room, playerId, now]);

  // Tracks how long the Verteller has been continuously absent from
  // Presence — Presence itself only reports "online or not right now", so
  // this is the only place that remembers *since when*.
  const narratorOfflineSinceRef = useRef<number | null>(null);
  useEffect(() => {
    const narratorId = state.room?.narrator_id ?? null;
    const isOnline = !narratorId || state.onlinePlayerIds.has(narratorId);
    if (isOnline) {
      narratorOfflineSinceRef.current = null;
    } else if (narratorOfflineSinceRef.current === null) {
      narratorOfflineSinceRef.current = Date.now();
    }
  }, [state.room?.narrator_id, state.onlinePlayerIds]);

  // Once the Verteller has been offline past NARRATOR_OFFLINE_TIMEOUT_MS,
  // automatically hands the role to a random online player — no banner, no
  // manual choice (see lib/game/membership.ts: pickNarratorTakeoverElector
  // picks the one client that acts, so concurrent clients don't race each
  // other; pickRandomOnlineCandidate picks who they hand it to).
  const narratorTakeoverAttemptedRef = useRef<string | null>(null);
  useEffect(() => {
    const room = state.room;
    const narratorId = room?.narrator_id ?? null;
    const offlineSince = narratorOfflineSinceRef.current;
    if (!room || !narratorId || offlineSince === null) return;
    if (now - offlineSince < NARRATOR_OFFLINE_TIMEOUT_MS) return;

    const episodeKey = `${narratorId}:${offlineSince}`;
    if (narratorTakeoverAttemptedRef.current === episodeKey) return;

    const elector = pickNarratorTakeoverElector(state.players, state.onlinePlayerIds, narratorId);
    if (!elector || elector.id !== playerId) return;

    const candidate = pickRandomOnlineCandidate(state.players, state.onlinePlayerIds, narratorId);
    if (!candidate) return;

    narratorTakeoverAttemptedRef.current = episodeKey;
    claimNarrator(supabase, room.id, candidate.id);
  }, [now, state.room, state.players, state.onlinePlayerIds, playerId, supabase]);

  if (state.error) {
    return (
      <p className="font-mono text-sm text-danger">
        Er ging iets mis: {state.error}
      </p>
    );
  }

  if (!state.room || !state.puzzle || !playerId) {
    return (
      <p className="font-mono text-sm text-text-secondary">Zaak laden...</p>
    );
  }

  const { room, puzzle, players, questions, guesses, chatMessages } = state;

  if (puzzle.id !== dossierPuzzleId) {
    setDossierPuzzleId(puzzle.id);
    setDossierOpen(true);
  }

  if (room.hardcore_mode && room.team_lives_remaining === 0) {
    return (
      <Dialog>
        <GameOverScreen
          supabase={supabase}
          roomId={room.id}
          players={players}
          isHost={playerId === room.host_id}
          onNewGame={() => router.push("/")}
        />
      </Dialog>
    );
  }

  const currentPlayer = players.find((p) => p.id === playerId);
  const narrating = currentPlayer ? isNarrator(currentPlayer, room.narrator_id) : false;
  const isHost = playerId === room.host_id;
  const isRevealed = room.status === "revealed";
  const isSpectator = currentPlayer?.is_spectator ?? false;

  const needsBriefing = narrating && !isRevealed && puzzle.id !== briefingSeenPuzzleId;
  const solver = guesses.find((g) => g.status === "correct");
  const nextNarrator = pickNextNarrator(players, room.narrator_id);
  const lastYesAt = getLastYesAt(questions, room.round_started_at);
  const showHint = !isRevealed && shouldShowHint(lastYesAt, now);

  const clueCount = questions.filter((q) => q.answer === "yes").length;
  const unansweredCount = questions.filter((q) => q.answer === null).length;
  const pendingGuessCount = guesses.filter((g) => g.status === "pending").length;
  const unreadChatCount = Math.max(0, chatMessages.length - chatSeenCount);
  const incorrectGuessCount = guesses.filter((g) => g.status === "incorrect").length;
  const answeredCount = questions.length - unansweredCount;

  async function handlePinToBoard(questionId: string) {
    if (!playerId) return;
    await pinQuestion(supabase, {
      roomId: room.id,
      playerId,
      questionId,
      x: 0.5 + (Math.random() - 0.5) * 0.2,
      y: 0.5 + (Math.random() - 0.5) * 0.2,
    });
    setCorkboardOpen(true);
  }

  async function handleNextCase() {
    const currentRoom = state.room;
    if (!currentRoom || advancingToNextRoundRef.current) return;
    const narrator = pickNextNarrator(state.players, currentRoom.narrator_id);
    if (!narrator) return;

    advancingToNextRoundRef.current = true;
    setNextCaseError(null);
    try {
      const nextRound = nextRoundNumber(currentRoom.round);
      const nextPuzzle = await getRandomPuzzle(
        supabase,
        currentRoom.played_puzzle_ids,
        currentRoom.pack_theme_filter ?? [],
        currentRoom.community_pack_ids,
        targetDifficultyForRound(nextRound, currentRoom.max_rounds)
      );
      await setNarrator(supabase, currentRoom.id, narrator.id);
      await setRoomPuzzle(supabase, currentRoom.id, nextPuzzle.id, currentRoom.played_puzzle_ids);
      await advanceRoomRound(supabase, currentRoom.id, nextRound);
    } catch (error) {
      setNextCaseError(getErrorMessage(error, "Kon geen nieuwe zaak starten. Probeer het opnieuw."));
    } finally {
      advancingToNextRoundRef.current = false;
    }
  }

  async function handleSkipPuzzle() {
    const currentRoom = state.room;
    if (!currentRoom || isSkippingPuzzle) return;
    if (
      (questions.length > 0 || guesses.length > 0) &&
      !window.confirm("Deze zaak overslaan? Alle vragen en gokken hiervoor gaan verloren.")
    ) {
      return;
    }

    setIsSkippingPuzzle(true);
    setSkipPuzzleError(null);
    try {
      const nextPuzzle = await getRandomPuzzle(
        supabase,
        currentRoom.played_puzzle_ids,
        currentRoom.pack_theme_filter ?? [],
        currentRoom.community_pack_ids,
        targetDifficultyForRound(currentRoom.round, currentRoom.max_rounds)
      );
      await setRoomPuzzle(supabase, currentRoom.id, nextPuzzle.id, currentRoom.played_puzzle_ids);
      // Otherwise the manual drawer can stay open on top of the new
      // briefing dialog that needsBriefing triggers for the fresh puzzle.
      setCaseDrawerOpen(false);
    } catch (error) {
      setSkipPuzzleError(getErrorMessage(error, "Kon geen andere zaak ophalen. Probeer het opnieuw."));
    } finally {
      setIsSkippingPuzzle(false);
    }
  }

  return (
    <>
      {needsBriefing && (
        // Mobile only — desktop already shows the dossier/oplossing inline
        // permanently, so there's nothing to gate there.
        <div className="xl:hidden">
          <Dialog>
            <NarratorBriefingScreen
              title={puzzle.title}
              scenario={puzzle.scenario}
              solution={puzzle.solution}
              onAcknowledge={() => setBriefingSeenPuzzleId(puzzle.id)}
              onSkip={handleSkipPuzzle}
              isSkipping={isSkippingPuzzle}
              skipError={skipPuzzleError}
            />
          </Dialog>
        </div>
      )}

      <div className="mb-4 flex w-full max-w-[72rem] flex-col gap-3">
        <ClaimHostBanner
          supabase={supabase}
          roomId={room.id}
          players={players}
          hostId={room.host_id}
          onlinePlayerIds={state.onlinePlayerIds}
          playerId={playerId}
        />
      </div>

      <div className="desk-layout w-full max-w-[72rem]">
        <div className="flex flex-nowrap items-center justify-between gap-2 overflow-x-auto [grid-area:status]">
          <div className="flex shrink-0 flex-nowrap items-center gap-2 whitespace-nowrap font-mono text-sm text-text-secondary sm:gap-3">
            <span>Ronde {room.round + 1}</span>
            {narrating && (
              <span className="hidden text-accent sm:inline">Jij bent de Verteller</span>
            )}
            {isSpectator && <span>Toeschouwer</span>}
            {narrating && !isRevealed && (
              <span className="hidden sm:inline">
                {incorrectGuessCount > 0 && <span className="text-danger">{incorrectGuessCount} fout · </span>}
                {answeredCount} beantwoord
              </span>
            )}
            {room.hardcore_mode && room.team_lives_remaining !== null && room.team_lives_total !== null && (
              <TeamLivesDisplay remaining={room.team_lives_remaining} total={room.team_lives_total} />
            )}
          </div>
          <div className="flex shrink-0 flex-nowrap items-center gap-1.5 whitespace-nowrap sm:gap-3">
            <PlayersStrip players={players} narratorId={room.narrator_id} onOpen={() => setPlayersOpen(true)} />
            {room.round_started_at && (
              <Timer
                startedAt={room.round_started_at}
                now={now}
                durationSeconds={room.round_duration_seconds}
              />
            )}
            {/* Prikbord is a freeform drag-and-connect canvas with
                fixed-width cards (180-200px) — deliberately desktop-only.
                Below xl those cards eat most of the screen width and the
                small connector-drag targets are hard to hit with a finger;
                it'd need its own simplified mobile design (e.g. a plain
                list) rather than just unhiding this button. */}
            {!narrating && !isSpectator && (
              <div className="hidden xl:block">
                <CorkboardButton onClick={() => setCorkboardOpen(true)} />
              </div>
            )}
          </div>
        </div>

        {/* "Vast": never grows with the game — the dossier, the private
            Verteller panel, and (for raders) the ask/solve forms all live
            here so they're never at the mercy of a long Verhoor/Postvak. */}
        <div ref={vastRef} className="flex flex-col gap-3 [grid-area:vast] sm:gap-4">
          {/* Verteller already knows the case and the solution — pinning
              both open here is what was pushing Postvak (the thing that
              actually needs attention) off the bottom of the screen below
              xl. So below xl it's a single button opening NarratorCaseDrawer
              instead; from xl up there's no space pressure, so it stays
              inline exactly like the rader's dossier does. Raders need the
              scenario actively (to ask questions), so theirs stays inline
              and open/closed as before at every width. */}
          <div className={narrating ? "hidden xl:block" : undefined}>
            <div className="relative -rotate-[0.4deg]">
              <span className="absolute -top-3 left-6 -rotate-2 rounded-[2px_8px_2px_8px] border-2 border-accent/60 bg-bg-primary px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-accent">
                Zaak-dossier
              </span>
              <Card tone="case" className="!p-4 sm:!p-6">
                <button
                  type="button"
                  onClick={() => setDossierOpen((v) => !v)}
                  aria-expanded={dossierOpen}
                  className="flex w-full items-center justify-between gap-3 text-left"
                >
                  <h1 className="font-serif text-xl text-text-primary sm:text-2xl">{puzzle.title}</h1>
                  <span className="shrink-0 font-mono text-xs text-text-secondary" aria-hidden="true">
                    {dossierOpen ? "▾" : "▸"}
                  </span>
                </button>
                {dossierOpen && (
                  <p className="mt-3 font-serif text-base leading-relaxed text-text-primary/90">
                    {puzzle.scenario}
                  </p>
                )}
              </Card>
            </div>
          </div>

          {narrating && (
            <div className="xl:hidden">
              <Button
                type="button"
                variant="secondary"
                className="w-full"
                onClick={() => setCaseDrawerOpen(true)}
              >
                Zaak &amp; oplossing
              </Button>
            </div>
          )}

          {/* Overleg shortcut for narrow screens: xl+ has a permanent chat
              column, but below xl it's buried at the bottom of a tab strip
              shared with Postvak/Verhoor/etc. This opens it directly from
              the vast column instead, for both roles. */}
          {!isRevealed && (
            <div className="flex justify-end xl:hidden">
              <ChatIconButton
                onClick={() => {
                  setChatDrawerOpen(true);
                  setChatSeenCount(chatMessages.length);
                }}
                unreadCount={unreadChatCount}
              />
            </div>
          )}

          {narrating && !isRevealed && (
            <div className="hidden xl:block">
              <NarratorTensionPanel
                solution={puzzle.solution}
                guesses={guesses}
                questions={questions}
                onSkip={handleSkipPuzzle}
                isSkipping={isSkippingPuzzle}
                skipError={skipPuzzleError}
              />
            </div>
          )}

          {isRevealed && (
            <SolutionReveal supabase={supabase} puzzle={puzzle} solverName={solver?.player_name} />
          )}

          {/* Below xl: one tab pair instead of two stacked cards, so
              Aanwijzingen/Verhoor/Overleg get more of the screen. From xl
              up these split apart again — "Los de zaak op" stays here,
              "Stel een vraag" moves to the "side" column next to Overleg. */}
          {!narrating && !isRevealed && (
            <div className="xl:hidden">
              {isSpectator ? (
                <Card>
                  <p className="font-mono text-sm text-text-secondary">
                    Je kijkt mee tot de volgende zaak begint...
                  </p>
                </Card>
              ) : (
                <Tabs
                  tabs={[
                    {
                      key: "vraag",
                      label: "Stel een vraag",
                      content: (
                        <Card tone="paper" className="w-full p-4">
                          <QuestionForm
                            supabase={supabase}
                            roomId={room.id}
                            puzzleId={puzzle.id}
                            playerId={playerId}
                            playerName={currentPlayer?.name ?? ""}
                            round={room.round}
                          />
                        </Card>
                      ),
                    },
                    {
                      key: "oplossing",
                      label: "Los de zaak op",
                      content: (
                        <Card>
                          <GuessForm
                            supabase={supabase}
                            roomId={room.id}
                            puzzleId={puzzle.id}
                            playerId={playerId}
                            playerName={currentPlayer?.name ?? ""}
                          />
                          <MyGuessFeedback guesses={guesses} playerId={playerId} />
                        </Card>
                      ),
                    },
                  ]}
                />
              )}
            </div>
          )}

          {!narrating && !isRevealed && !isSpectator && (
            <Card className="hidden xl:block">
              <p className="mb-3 font-mono text-xs text-text-secondary">
                Los de zaak op.
              </p>
              <GuessForm
                supabase={supabase}
                roomId={room.id}
                puzzleId={puzzle.id}
                playerId={playerId}
                playerName={currentPlayer?.name ?? ""}
              />
              <MyGuessFeedback guesses={guesses} playerId={playerId} />
            </Card>
          )}
        </div>

        {/* "Main": whatever grows with the game, as tabs so only one pane
            occupies this space at a time. This block scrolls in place once
            it hits the viewport cap, instead of pushing "vast" or the
            footer around. */}
        {/* Below lg: no sticky/max-height here — the grid row itself
            (minmax(0, 1fr) in .desk-layout) fills whatever space "vast"
            isn't using, so this box grows when the dossier is collapsed
            instead of shrink-wrapping to its own (often short) content.
            `flex flex-col` + `min-h-0` here (paired with `flex-1 min-h-0`
            on Tabs) is what actually passes that height down to the active
            pane — a `height:100%` chain breaks silently the moment any
            link in it doesn't have a spec-definite height; flex-grow
            doesn't have that failure mode. */}
        <div className="flex min-h-0 flex-col overflow-y-auto [grid-area:main] lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)]">
          <div className="flex min-h-0 flex-1 flex-col xl:hidden">
            {narrating ? (
              <Tabs
                defaultTab="postvak"
                tabs={[
                  {
                    key: "postvak",
                    label: "Postvak",
                    badge: unansweredCount + pendingGuessCount,
                    content: isRevealed ? (
                      <p className="font-mono text-sm text-text-secondary">Zaak gesloten.</p>
                    ) : (
                      <NarratorInbox
                        supabase={supabase}
                        roomId={room.id}
                        round={room.round}
                        puzzle={puzzle}
                        questions={questions}
                        guesses={guesses}
                        players={players}
                        narratorId={room.narrator_id}
                        hardcoreMode={room.hardcore_mode}
                        teamLivesRemaining={room.team_lives_remaining}
                      />
                    ),
                  },
                  {
                    key: "archief",
                    label: "Archief",
                    content: (
                      <NarratorArchive
                        supabase={supabase}
                        roomId={room.id}
                        round={room.round}
                        questions={questions}
                        guesses={guesses}
                      />
                    ),
                  },
                ]}
              />
            ) : (
              <Tabs
                defaultTab="aanwijzingen"
                tabs={[
                  {
                    key: "aanwijzingen",
                    label: "Aanwijzingen",
                    badge: clueCount,
                    content: (
                      <CluesList
                        questions={questions}
                        onPinToBoard={isSpectator ? undefined : handlePinToBoard}
                      />
                    ),
                  },
                  {
                    key: "verhoor",
                    label: "Verhoor",
                    badge: unansweredCount,
                    content: (
                      <InterrogationLog
                        supabase={supabase}
                        roomId={room.id}
                        round={room.round}
                        questions={questions}
                        narrating={narrating}
                        hint={puzzle.hint}
                        showHint={showHint}
                      />
                    ),
                  },
                ]}
              />
            )}
          </div>

          <div className="hidden min-h-0 flex-1 flex-col xl:flex">
            {narrating ? (
              <Tabs
                defaultTab="postvak"
                tabs={[
                  {
                    key: "postvak",
                    label: "Postvak",
                    badge: unansweredCount + pendingGuessCount,
                    content: isRevealed ? (
                      <p className="font-mono text-sm text-text-secondary">Zaak gesloten.</p>
                    ) : (
                      <NarratorInbox
                        supabase={supabase}
                        roomId={room.id}
                        round={room.round}
                        puzzle={puzzle}
                        questions={questions}
                        guesses={guesses}
                        players={players}
                        narratorId={room.narrator_id}
                        hardcoreMode={room.hardcore_mode}
                        teamLivesRemaining={room.team_lives_remaining}
                      />
                    ),
                  },
                  {
                    key: "archief",
                    label: "Archief",
                    content: (
                      <NarratorArchive
                        supabase={supabase}
                        roomId={room.id}
                        round={room.round}
                        questions={questions}
                        guesses={guesses}
                      />
                    ),
                  },
                ]}
              />
            ) : (
              <Tabs
                defaultTab="aanwijzingen"
                tabs={[
                  {
                    key: "aanwijzingen",
                    label: "Aanwijzingen",
                    badge: clueCount,
                    content: (
                      <CluesList
                        questions={questions}
                        onPinToBoard={isSpectator ? undefined : handlePinToBoard}
                      />
                    ),
                  },
                  {
                    key: "verhoor",
                    label: "Verhoor",
                    badge: unansweredCount,
                    content: (
                      <InterrogationLog
                        supabase={supabase}
                        roomId={room.id}
                        round={room.round}
                        questions={questions}
                        narrating={narrating}
                        hint={puzzle.hint}
                        showHint={showHint}
                      />
                    ),
                  },
                ]}
              />
            )}
          </div>
        </div>

        {/* Overleg's permanent column from xl up — always visible, so it
            never needs an unread badge the way the narrow tab does. Its
            height is pinned to the measured height of "vast" (via
            `vastHeight`, a ResizeObserver reading), not to its own content
            — so its bottom edge lands on the same line as "Los de zaak op"
            and it never grows past that no matter how many messages come
            in; messages scroll inside it instead. */}
        <div
          className="hidden [grid-area:chat] xl:flex xl:flex-col xl:overflow-hidden"
          style={vastHeight ? { height: vastHeight } : undefined}
        >
          <ChatPanel
            supabase={supabase}
            roomId={room.id}
            playerId={playerId}
            playerName={currentPlayer?.name ?? ""}
            chatMessages={chatMessages}
            narrating={narrating}
            narratorId={room.narrator_id}
            className="xl:min-h-0 xl:flex-1"
          />
        </div>

        {/* Directly under Overleg: what overleg usually leads to. Moving
            it out of "vast" frees that column up, so Aanwijzingen/Verhoor
            gets the full column height on the left. */}
        {!narrating && !isRevealed && !isSpectator && (
          <div className="hidden [grid-area:side] xl:block">
            <Card tone="paper" className="w-full p-4">
              <p className="font-mono text-[11px] uppercase tracking-widest text-black/60">
                Stel een vraag
              </p>
              <div className="mt-2">
                <QuestionForm
                  supabase={supabase}
                  roomId={room.id}
                  puzzleId={puzzle.id}
                  playerId={playerId}
                  playerName={currentPlayer?.name ?? ""}
                  round={room.round}
                />
              </div>
            </Card>
          </div>
        )}

        {isRevealed && hasMoreRounds(room.round, room.max_rounds) && isHost && (
          <div className="[grid-area:footer]">
            <Card>
              <p className="mb-3 font-mono text-xs text-text-secondary">
                {nextNarrator
                  ? `${nextNarrator.name} wordt de nieuwe Verteller.`
                  : "Niet genoeg spelers voor een nieuwe ronde."}
              </p>
              {nextCaseError && (
                <p className="mb-3 font-mono text-xs text-danger">{nextCaseError}</p>
              )}
              <Button className="w-full" onClick={handleNextCase} disabled={!nextNarrator}>
                Volgende zaak
              </Button>
            </Card>
          </div>
        )}
      </div>

      {isRevealed && hasMoreRounds(room.round, room.max_rounds) && room.revealed_at && (
        <NextRoundCountdown seconds={secondsUntilNextRound(room.revealed_at, now) ?? 0} />
      )}

      {isRevealed && !hasMoreRounds(room.round, room.max_rounds) && (
        <Dialog>
          <FinalScoreboard
            supabase={supabase}
            roomId={room.id}
            players={players}
            isHost={isHost}
            onPlayAnotherRound={handleNextCase}
            onNewGame={() => router.push("/")}
          />
          {isHost && nextCaseError && (
            <p className="mt-2 font-mono text-xs text-danger">{nextCaseError}</p>
          )}
        </Dialog>
      )}

      {playersOpen && (
        <PlayersDrawer
          supabase={supabase}
          roomId={room.id}
          roomCode={room.code}
          playerId={playerId}
          players={players}
          caseLog={state.caseLog}
          isHost={isHost}
          isRevealed={isRevealed}
          narratorId={room.narrator_id}
          onlinePlayerIds={state.onlinePlayerIds}
          onKick={isHost ? createKickHandler(supabase, players) : undefined}
          onClose={() => setPlayersOpen(false)}
        />
      )}

      {caseDrawerOpen && (
        // xl+ already shows the dossier/oplossing inline (see "vast"
        // above) — the drawer would just be a redundant overlay there, so
        // this wrapper keeps the auto-open-per-round logic breakpoint-
        // agnostic while only ever rendering the overlay below xl.
        <div className="xl:hidden">
          <NarratorCaseDrawer
            title={puzzle.title}
            scenario={puzzle.scenario}
            solution={puzzle.solution}
            guesses={guesses}
            questions={questions}
            onClose={() => setCaseDrawerOpen(false)}
            onSkip={handleSkipPuzzle}
            isSkipping={isSkippingPuzzle}
            skipError={skipPuzzleError}
          />
        </div>
      )}

      {chatDrawerOpen && (
        <ChatDrawer
          supabase={supabase}
          roomId={room.id}
          playerId={playerId}
          playerName={currentPlayer?.name ?? ""}
          chatMessages={chatMessages}
          narrating={narrating}
          narratorId={room.narrator_id}
          onClose={() => {
            setChatDrawerOpen(false);
            setChatSeenCount(chatMessages.length);
          }}
        />
      )}

      {corkboardOpen && !narrating && (
        <CorkboardOverlay
          supabase={supabase}
          roomId={room.id}
          playerId={playerId}
          playerName={currentPlayer?.name ?? ""}
          questions={questions}
          isHost={isHost}
          onClose={() => setCorkboardOpen(false)}
        />
      )}
    </>
  );
}
