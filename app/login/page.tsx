"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { authClient } from "@/lib/auth-client";
import { field, submitButton } from "@/lib/ui";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const { error: signInError } = await authClient.signIn.email({
      email,
      password,
      callbackURL: "/",
    });

    setIsSubmitting(false);

    if (signInError) {
      setError(signInError.message ?? "Не удалось войти");
      return;
    }

    router.push("/");
  }

  return (
    /*
      Титульный лист, а не карточка-коробка: это первый экран, который видит
      пришедший человек, и коробка на кремовой бумаге читалась бы формой
      в учреждении. Заголовок антиквой лежит прямо на линованном фоне —
      тот же ход, что сделал титульный лист из дневника автора.
    */
    <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-4 py-16">
      <header className="flex flex-col gap-2">
        <h1 className="font-serif text-3xl tracking-tight text-ink">Вход</h1>
        <p className="text-sm text-muted">Рады видеть снова.</p>
      </header>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className={labelClassName}>
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className={field}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="password" className={labelClassName}>
            Пароль
          </label>
          <input
            id="password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={field}
          />
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}

        <button
          type="submit"
          disabled={isSubmitting}
          className={`mt-2 ${submitButton}`}
        >
          {isSubmitting ? "Входим…" : "Войти"}
        </button>
      </form>

      <p className="text-center text-sm text-muted">
        Ещё нет аккаунта?{" "}
        <Link
          href="/signup"
          className="font-medium text-accent underline-offset-4 hover:underline"
        >
          Зарегистрироваться
        </Link>
      </p>
    </div>
  );
}

const labelClassName = "text-sm font-medium text-ink";
