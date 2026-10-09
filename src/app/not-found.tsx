import Link from "next/link";
export default function NotFound() {
  return (
    <main>
      <h1>This lesson isn’t on the map.</h1>
      <Link href="/academy">Return to the academy</Link>
    </main>
  );
}
