import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { PostForm } from "@/components/PostForm";
import { createPost } from "@/app/new/actions";

export default async function NewPostPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 bg-zinc-50 px-4 py-12 font-sans dark:bg-black">
      <div className="rounded-2xl border border-black/[.08] bg-white p-8 dark:border-white/[.145] dark:bg-black">
        <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">
          Добавить запись
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Найди трек, который слушаешь, и напиши пару слов о нём.
        </p>

        <div className="mt-6">
          <PostForm action={createPost} submitLabel="Опубликовать" pendingLabel="Публикуем…" />
        </div>
      </div>
    </div>
  );
}
