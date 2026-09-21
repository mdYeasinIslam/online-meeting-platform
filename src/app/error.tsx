"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return <section className="p-8"><h1 className="text-xl">This page could not load</h1><button onClick={reset} className="mt-4 rounded border p-3">Try again</button></section>;
}
