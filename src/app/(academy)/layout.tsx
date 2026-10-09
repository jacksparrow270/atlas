import { configured, db } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Provider } from "@/components/store";
import { Shell } from "@/components/shell";
export const dynamic = "force-dynamic";
export default async function AcademyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const preview = !configured();
  let userId = "preview";
  if (!preview) {
    const client = await db();
    const {
      data: { user },
    } = await client.auth.getUser();
    if (!user) redirect("/auth");
    userId = user.id;
  }
  return (
    <Provider preview={preview} userId={userId}>
      <Shell>{children}</Shell>
    </Provider>
  );
}
