import { Suspense } from "react";
import { Focus } from "@/components/productivity";
export default function Page() {
  return (
    <Suspense fallback={<p>Preparing focus room…</p>}>
      <Focus />
    </Suspense>
  );
}
