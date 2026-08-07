"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { SignOutButton } from "./SignOutButton";

export function SessionStatus() {
  const [mounted, setMounted] = useState(false);
  const { data, isPending } = authClient.useSession();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || isPending) {
    return null;
  }

  if (data) {
    return (
      <div className="flex items-center gap-4">
        <span className="text-sm text-zinc-600 dark:text-zinc-400">
          {data.user.username}
        </span>
        <SignOutButton />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 text-sm font-medium">
      <Link href="/login" className="text-black dark:text-zinc-50">
        Войти
      </Link>
      <Link
        href="/signup"
        className="flex h-9 items-center rounded-full bg-foreground px-4 text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
      >
        Регистрация
      </Link>
    </div>
  );
}
