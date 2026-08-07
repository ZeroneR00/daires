import Link from "next/link";

export default function PostNotFound() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-4 bg-zinc-50 px-4 py-12 text-center font-sans dark:bg-black">
      <div className="rounded-2xl border border-black/[.08] bg-white p-8 dark:border-white/[.145] dark:bg-black">
        <h1 className="text-xl font-semibold tracking-tight text-black dark:text-zinc-50">
          Запись не найдена
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Такого поста не существует — возможно, ссылка устарела.
        </p>
        <Link
          href="/"
          className="mt-4 inline-flex h-10 items-center rounded-full bg-foreground px-5 text-sm font-medium text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
        >
          На главную
        </Link>
      </div>
    </div>
  );
}
