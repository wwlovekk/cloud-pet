import { notFound } from "next/navigation";
import { db } from "@/lib/server/db";
import CloudPet from "@/components/CloudPet";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export default async function SharedPet({ params }: { params: Promise<{ shareCode: string }> }) {
  const { shareCode } = await params;
  const p = await db.userPetProfile.findUnique({ where: { shareCode } });
  if (!p?.isPublic) notFound();
  return <CloudPet initial={{ nickname: p.nickname, species: p.species, breedId: p.breedId, coatPatternId: p.coatPatternId, backgroundSceneId: p.backgroundSceneId, size: p.size, chubbiness: p.chubbiness, view: p.view, lighting: p.lighting }}/>;
}
