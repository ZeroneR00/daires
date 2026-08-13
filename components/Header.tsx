import Link from "next/link";
import { SearchBar } from "./SearchBar";
import { SessionStatus } from "./SessionStatus";

export function Header() {
  return (
    <header className="border-b border-black/[.08] bg-white dark:border-white/[.145] dark:bg-black">
      <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link
          href="/"
          className="shrink-0 text-lg font-semibold tracking-tight text-black dark:text-zinc-50"
        >
          music-diary
        </Link>

        <SearchBar />

        <SessionStatus />
      </div>
    </header>
  );
}
