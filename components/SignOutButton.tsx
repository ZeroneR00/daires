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
      className="rounded-full px-3 py-1 text-sm font-medium text-muted transition-colors hover:bg-accent-wash hover:text-accent"
    >
      Выйти
    </button>
  );
}
