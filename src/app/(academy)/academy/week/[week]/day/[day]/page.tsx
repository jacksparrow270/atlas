import { Lesson } from "@/components/learning";
import { notFound } from "next/navigation";
export default async function Page({
  params,
}: {
  params: Promise<{ week: string; day: string }>;
}) {
  const { week, day } = await params;
  const w = Number(week),
    d = Number(day);
  if (
    !Number.isInteger(w) ||
    !Number.isInteger(d) ||
    w < 1 ||
    w > 52 ||
    d < 1 ||
    d > 6
  )
    notFound();
  return <Lesson key={w + "-" + d} weekNumber={w} day={d} />;
}
