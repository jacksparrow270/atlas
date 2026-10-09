import { Lesson } from "@/components/learning";
import { notFound } from "next/navigation";
export default async function Page({
  params,
}: {
  params: Promise<{ day: string }>;
}) {
  const { day } = await params;
  const n = Number(day);
  if (!Number.isInteger(n) || n < 1 || n > 14) notFound();
  return <Lesson key={n} restartDay={n} />;
}
