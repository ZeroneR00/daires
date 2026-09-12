import Link from "next/link";
import { Waveline } from "@/components/Waveline";

/*
  404 дневника. Тот же разорванный знак, что у корневого not-found и у 404
  записи: словарь состояний один на весь сайт, отличается только текст.
*/
export default function UserNotFound() {
  return (
    <div className="flex flex-1 items-center justify-center px-4 py-24">
      <div className="flex max-w-md flex-col items-center gap-5 text-center">
        <Waveline variant="broken" className="h-14 w-52 text-accent/70" />
        <div className="flex flex-col gap-2">
          <h1 className="font-serif text-2xl tracking-tight text-ink">
            Дневник не найден
          </h1>
          <p className="text-sm text-muted">
            Такого дневника не существует — возможно, ссылка устарела.
          </p>
        </div>
        <Link
          href="/"
          className="flex h-10 items-center rounded-full bg-accent px-5 text-sm font-medium text-accent-ink transition-opacity hover:opacity-90"
        >
          На главную
        </Link>
      </div>
    </div>
  );
}
