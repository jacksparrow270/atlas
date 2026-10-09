import { WeekView } from "@/components/learning";
import { notFound } from "next/navigation";
export default async function Page({
  params,
}: {
  params: Promise<{ week: string }>;
}) {
  const { week } = await params;
  const n = Number(week);
  if (!Number.isInteger(n) || n < 1 || n > 52) notFound();
  return <WeekView weekNumber={n} />;
}
