import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { PostForm } from "@/components/PostForm";
import { createPost } from "@/app/new/actions";

export default async function NewPostPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6">
      <Link
        href="/"
        className="inline-flex w-fit items-center gap-1.5 text-sm text-muted transition-colors hover:text-accent"
      >
        ← На главную
      </Link>

      {/*
        Заголовок лежит прямо на бумаге, а не в карточке: карточкой на этом
        экране становится только то, на чём пишут. Коробка вокруг всей формы
        — та же «панель управления», от которой ушёл дневник автора в заходе A.
      */}
      <header className="flex flex-col gap-2">
        <h1 className="font-serif text-2xl tracking-tight text-ink">Добавить запись</h1>
        <p className="text-sm text-muted">
          Найди трек, который слушаешь, и напиши пару слов о нём.
        </p>
      </header>

      <PostForm action={createPost} submitLabel="Опубликовать" pendingLabel="Публикуем…" />
    </div>
  );
}
