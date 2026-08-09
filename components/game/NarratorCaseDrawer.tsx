"use client";

import { useTranslations } from "next-intl";
import type { Guess } from "@/types/guess";
import type { Question } from "@/types/question";
import { Drawer } from "@/components/ui/Drawer";
import { NarratorTensionPanel } from "./NarratorTensionPanel";

/**
 * Zaak-dossier + oplossing on demand, below xl: the Verteller already knows
 * both, so they don't need to sit permanently expanded above Postvak —
 * that's what pushed Postvak (the thing that actually needs attention) off
 * screen. Same on-demand pattern as ChatDrawer, just for reference material
 * instead of chat.
 */
export function NarratorCaseDrawer({
  title,
  scenario,
  solution,
  guesses,
  questions,
  onClose,
  onSkip,
  isSkipping,
  skipError,
}: {
  title: string;
  scenario: string;
  solution: string;
  guesses: Guess[];
  questions: Question[];
  onClose: () => void;
  onSkip: () => void;
  isSkipping: boolean;
  skipError: string | null;
}) {
  const t = useTranslations("NarratorCaseDrawer");

  return (
    <Drawer title={t("title")} onClose={onClose}>
      <div className="flex flex-col gap-4">
        <div>
          <p className="mb-2 font-mono text-xs uppercase tracking-widest text-text-secondary">
            {title}
          </p>
          <p className="font-serif text-base leading-relaxed text-text-primary/90">{scenario}</p>
        </div>
        <NarratorTensionPanel
          solution={solution}
          guesses={guesses}
          questions={questions}
          onSkip={onSkip}
          isSkipping={isSkipping}
          skipError={skipError}
        />
      </div>
    </Drawer>
  );
}
