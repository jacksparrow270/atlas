import { ProjectDetail } from "@/components/academic";
import { notFound } from "next/navigation";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!/^[a-zA-Z0-9_-]{1,120}$/.test(id)) notFound();
  return <ProjectDetail key={id} id={id} />;
}
