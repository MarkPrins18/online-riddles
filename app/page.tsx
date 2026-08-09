import Link from "next/link";
import { useTranslations } from "next-intl";
import { CreateRoomForm } from "@/components/lobby/CreateRoomForm";
import { JoinRoomForm } from "@/components/lobby/JoinRoomForm";
import { Card } from "@/components/ui/Card";
import { HowToPlayButton } from "@/components/HowToPlayButton";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

export default function Home() {
  const t = useTranslations("HomePage");

  return (
    <main id="main-content" className="flex flex-1 flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-3xl">
        <div className="flex justify-end">
          <LanguageSwitcher />
        </div>

        {/* Cover: title stamped on a tab, notes typed off to the side —
            left-aligned and asymmetric rather than a centered hero block. */}
        <div className="relative -rotate-[0.3deg]">
          <span className="absolute -top-3 left-8 -rotate-2 rounded-[2px_8px_2px_8px] border-2 border-accent/60 bg-bg-primary px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-accent">
            {t("coverStamp")}
          </span>
          <div className="rounded-sm border border-black/40 bg-bg-case px-8 pb-8 pt-10 shadow-[0_10px_24px_-8px_rgba(0,0,0,0.55)]">
            <h1 className="font-serif text-4xl italic text-text-primary sm:text-5xl">
              {t("title")}
            </h1>
            <p className="mt-3 max-w-md font-mono text-sm text-text-secondary">
              {t("subtitle")}
            </p>
          </div>
        </div>

        {/* Two sheets tossed onto the desk, not a symmetric grid — opposite
            tilt, staggered vertically, one pinned. */}
        <div className="relative mt-14 flex flex-col gap-8 sm:mt-20 sm:block sm:h-[27rem]">
          <div className="paperclip relative rotate-[1.1deg] sm:absolute sm:left-0 sm:top-0 sm:w-[21rem]">
            <Card tone="case">
              <p className="mb-4 font-mono text-xs uppercase tracking-widest text-accent">
                {t("newFile")}
              </p>
              <CreateRoomForm />
            </Card>
          </div>
          <div className="relative -rotate-[1.4deg] sm:absolute sm:right-0 sm:top-10 sm:w-[21rem]">
            <Card tone="case">
              <p className="mb-4 font-mono text-xs uppercase tracking-widest text-accent">
                {t("existingFile")}
              </p>
              <JoinRoomForm />
            </Card>
          </div>
        </div>

        <div className="mt-16 flex flex-col items-center gap-2 text-center font-mono text-xs uppercase tracking-widest text-text-secondary sm:mt-10 sm:flex-row sm:justify-center sm:gap-4">
          <Link href="/community" className="underline decoration-accent/60 hover:text-accent">
            {t("communityLink")}
          </Link>
          <HowToPlayButton />
        </div>
      </div>
    </main>
  );
}
