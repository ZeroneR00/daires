import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getUserByUsername } from "@/lib/posts";
import { SettingsForm } from "@/components/SettingsForm";
import { AvatarUploadForm } from "@/components/AvatarUploadForm";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const user = await getUserByUsername(session.user.username);
  if (!user) redirect("/login");

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 bg-zinc-50 px-4 py-12 font-sans dark:bg-black">
      <div className="rounded-2xl border border-black/[.08] bg-white p-8 dark:border-white/[.145] dark:bg-black">
        <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">
          Настройки профиля
        </h1>

        <div className="mt-6">
          <AvatarUploadForm initialAvatarUrl={user.avatarUrl} />
        </div>

        <div className="mt-6 border-t border-black/[.08] pt-6 dark:border-white/[.145]">
          <SettingsForm initialName={user.name} initialBio={user.bio ?? ""} />
        </div>
      </div>
    </div>
  );
}
