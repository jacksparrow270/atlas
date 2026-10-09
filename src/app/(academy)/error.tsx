"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <section className="card">
      <h1>We couldn’t open this page.</h1>
      <p>
        Your saved work is still in your account. Try loading the page again.
      </p>
      <button className="btn btn-primary" onClick={reset}>
        Try again
      </button>
    </section>
  );
}
