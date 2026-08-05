"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

/**
 * Drop-in trigger + content for "how does this game work" — there's
 * otherwise no rules explanation anywhere in the app. A self-contained
 * Modal (not a separate route) so it can sit next to CreateRoomForm/
 * JoinRoomForm on the homepage without losing their in-progress local
 * state on navigation, and be reused as-is in the room lobby.
 */
export function HowToPlayButton({ className = "" }: { className?: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`font-mono text-xs uppercase tracking-widest text-text-secondary underline decoration-accent/60 hover:text-accent ${className}`}
      >
        Spelregels
      </button>

      {open && (
        <Modal onClose={() => setOpen(false)} className="mx-auto w-full max-w-xl">
          <div className="flex items-center justify-between gap-3 border-b border-white/5 p-4">
            <p className="font-mono text-sm uppercase tracking-widest text-text-secondary">
              Spelregels
            </p>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Sluiten
            </Button>
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-5">
            <section>
              <p className="font-serif text-lg italic text-text-primary">Het idee</p>
              <p className="mt-1 font-mono text-sm leading-relaxed text-text-secondary">
                Elke ronde kent één speler — de Verteller — de oplossing van
                een raadsel. De rest stelt ja/nee-vragen en probeert de zaak
                op te lossen.
              </p>
            </section>

            <section>
              <p className="font-serif text-lg italic text-text-primary">De Verteller</p>
              <p className="mt-1 font-mono text-sm leading-relaxed text-text-secondary">
                Beantwoordt elke vraag met ja, nee, of n.v.t. (niet relevant
                voor de oplossing). Ingediende oplossingen van andere spelers
                keurt de Verteller goed of fout in het Postvak.
              </p>
            </section>

            <section>
              <p className="font-serif text-lg italic text-text-primary">
                Vragen &amp; aanwijzingen
              </p>
              <p className="mt-1 font-mono text-sm leading-relaxed text-text-secondary">
                Elk &ldquo;ja&rdquo;-antwoord wordt automatisch een
                aanwijzing. Alle vragen (ook de nee&apos;s en n.v.t.&apos;s)
                staan terug te lezen bij Verhoor.
              </p>
            </section>

            <section>
              <p className="font-serif text-lg italic text-text-primary">Los de zaak op</p>
              <p className="mt-1 font-mono text-sm leading-relaxed text-text-secondary">
                Denk je het antwoord te weten? Dien een oplossing in. De
                Verteller ziet &apos;m als eerste en keurt &apos;m goed of
                fout — andere spelers zien pas wat je had ingediend als het
                klopt.
              </p>
            </section>

            <section>
              <p className="font-serif text-lg italic text-text-primary">Punten</p>
              <p className="mt-1 font-mono text-sm leading-relaxed text-text-secondary">
                Een moeilijkere zaak levert meer punten op. De speler die
                oplost én de Verteller krijgen allebei een bonus, net als de
                beste vraag van de ronde. Een foute gok kost punten.
              </p>
            </section>

            <section>
              <p className="font-serif text-lg italic text-text-primary">Hardcore modus</p>
              <p className="mt-1 font-mono text-sm leading-relaxed text-text-secondary">
                Optioneel, door de host in te stellen: elke foute gok kost
                het hele team 1 leven. Op 0 levens is het game over voor de
                hele sessie.
              </p>
            </section>

            <section>
              <p className="font-serif text-lg italic text-text-primary">Prikbord</p>
              <p className="mt-1 font-mono text-sm leading-relaxed text-text-secondary">
                Een gedeeld bord om aanwijzingen en theorieën op vast te
                pinnen en met draadjes te verbinden — alleen op een groter
                scherm (desktop/tablet), niet op de telefoon.
              </p>
            </section>
          </div>
        </Modal>
      )}
    </>
  );
}
