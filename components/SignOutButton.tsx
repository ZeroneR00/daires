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
      className="text-sm font-medium text-zinc-600 underline underline-offset-4 hover:text-black dark:text-zinc-400 dark:hover:text-zinc-50"
    >
      Выйти
    </button>
  );
}
