import { CommunityNav } from "@/components/community/CommunityNav";

export default function CommunityLayout({ children }: { children: React.ReactNode }) {
  return (
    <main id="main-content" className="flex flex-1 flex-col px-6 py-16">
      <div className="mx-auto w-full max-w-3xl">
        <CommunityNav />
        <div className="pt-8">{children}</div>
      </div>
    </main>
  );
}
