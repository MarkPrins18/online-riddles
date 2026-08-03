import { CommunityPackDetailClient } from "@/components/community/CommunityPackDetailClient";

export default async function CommunityPackPage({
  params,
}: {
  params: Promise<{ packId: string }>;
}) {
  const { packId } = await params;

  return <CommunityPackDetailClient packId={packId} />;
}
