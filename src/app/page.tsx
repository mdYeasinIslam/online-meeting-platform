import Link from "next/link";
export default function Home() {
  return (
    <section className="mx-auto max-w-4xl px-6 py-16">
      <h1 className="text-4xl font-bold">Bangla accessible meetings</h1>
      <p className="my-6 text-xl">
        A thesis platform for in-browser Bangla sign-to-text research.
      </p>
      <div className="flex flex-wrap gap-4">
        <Link className="rounded bg-emerald-700 px-5 py-3" href="/dashboard">
          Open dashboard
        </Link>
        <Link className="rounded border px-5 py-3" href="/sign-demo">
          Try the static alphabet demo
        </Link>
      </div>
      <p className="mt-8 text-slate-400">
        Day-1 foundation. Live meeting media and continuous sign recognition are
        upcoming milestones.
      </p>
    </section>
  );
}
