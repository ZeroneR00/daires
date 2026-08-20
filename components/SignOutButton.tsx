"use client";

import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export function SignOutButton() {
  const router = useRouter();

  async function handleSignOut() {
    await authClient.signOut();
    router.refresh();
  }

  return (
    <button
      onClick={handleSignOut}
      className="rounded-full px-3 py-1 text-sm font-medium text-zinc-600 transition-colors hover:bg-black/[.04] hover:text-black dark:text-zinc-400 dark:hover:bg-[#1a1a1a] dark:hover:text-zinc-50"
    >
      Выйти
    </button>
  );
}
