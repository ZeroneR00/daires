"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { authClient } from "@/lib/auth-client";
import { DEMO_EMAIL, DEMO_PASSWORD } from "@/lib/demo";
import { field, submitButton } from "@/lib/ui";
import { resetDemoAccount } from "./actions";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  // Какое из двух действий идёт: пока идёт любое, заперты обе кнопки.
  const [pending, setPending] = useState<"form" | "demo" | null>(null);

  async function signIn(credentials: { email: string; password: string }) {
    const { error: signInError } = await authClient.signIn.email({
      ...credentials,
      callbackURL: "/",
    });

    setPending(null);

    if (signInError) {
      setError(signInError.message ?? "Не удалось войти");
      return;
    }

    router.push("/");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending("form");
    await signIn({ email, password });
  }

  /*
    Сброс — отдельным экшеном ДО входа, а сам вход — тем же клиентским
    `authClient`, что и у формы. Можно было войти прямо в экшене через
    `auth.api.signInEmail`, но тогда ставить куку из Server Action пришлось бы
    плагином `nextCookies`, то есть менять конфиг auth ради одной кнопки.
    Пароль демо на клиенте не секрет — см. `lib/demo.ts`.
  */
  async function handleDemo() {
    setError(null);
    setPending("demo");

    const result = await resetDemoAccount();
    if ("error" in result) {
      setPending(null);
      setError(result.error);
      return;
    }

    await signIn({ email: DEMO_EMAIL, password: DEMO_PASSWORD });
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
          disabled={pending !== null}
          className={`mt-2 ${submitButton}`}
        >
          {pending === "form" ? "Входим…" : "Войти"}
        </button>
      </form>

      {/*
        Контурная, а не залитая: главная кнопка на экране одна, и это «Войти».
        Подпись предупреждает честно — гость должен знать, что пишет в общий
        аккаунт, прежде чем что-то в нём оставит.
      */}
      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={handleDemo}
          disabled={pending !== null}
          className={demoButton}
        >
          {pending === "demo" ? "Готовим аккаунт…" : "Войти как гость"}
        </button>
        <p className="text-center text-xs text-muted">
          Общий демо-аккаунт: всё, что в нём появится, убирается
          при следующем входе гостя.
        </p>
      </div>

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

// Контурный близнец `submitButton` — тот же размер, чтобы две кнопки
// читались одной парой, а не главной и случайной.
const demoButton =
  "flex h-11 w-full items-center justify-center rounded-full border border-line px-5 text-sm font-medium text-ink transition-colors hover:border-accent/60 hover:text-accent disabled:opacity-50";
