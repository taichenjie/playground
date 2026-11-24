import Link from "next/link";
import { FallingTiles } from "@/components/motion/falling-tiles";

export default function NotFound() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-24 text-center sm:px-6">
      <FallingTiles text="404" />
      <h1 className="wide mt-10 text-4xl font-black uppercase sm:text-5xl">Game over… for this page.</h1>
      <p className="mx-auto mt-4 max-w-md text-ink-soft">
        We couldn’t find what you were looking for. Try one of the sections instead.
      </p>
      <Link
        href="/"
        data-burst
        className="brut press mt-9 inline-flex items-center rounded-full bg-pop px-7 py-3.5 font-extrabold text-paper"
      >
        Insert coin · back to home
      </Link>
    </section>
  );
}
