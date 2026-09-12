import Link from "next/link";
import { SearchDialog } from "./SearchDialog";
import { ThemeToggle } from "./ThemeToggle";
import { Waveline } from "./Waveline";
import { SessionStatus } from "./SessionStatus";

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="group flex shrink-0 items-center gap-2.5">
          {/* Фирменный знак: он же разделитель на страницах, он же иконка */}
          <Waveline className="h-5 w-[68px] shrink-0 text-ink transition-colors group-hover:text-accent sm:h-6 sm:w-[82px]" />
          <span className="hidden font-serif text-xl font-medium tracking-tight text-ink sm:inline">
            music
            <span className="text-accent">·</span>
            diary
          </span>
        </Link>


        <div className="flex items-center gap-3">
          <ThemeToggle />
          <SearchDialog />
          <SessionStatus />
        </div>
      </div>
    </header>
  );
}
