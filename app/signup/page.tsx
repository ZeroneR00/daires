"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { authClient } from "@/lib/auth-client";
import { field, submitButton } from "@/lib/ui";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const { error: signUpError } = await authClient.signUp.email({
      name,
      username,
      email,
      password,
      callbackURL: "/",
    });

    setIsSubmitting(false);

    if (signUpError) {
      setError(signUpError.message ?? "Не удалось зарегистрироваться");
      return;
    }

    router.push("/");
  }

  return (
    /*
      Титульный лист, как и на входе: коробка вокруг формы на кремовой бумаге
      читалась бы бланком, а это первое, что видит пришедший человек.
    */
    <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-4 py-16">
      <header className="flex flex-col gap-2">
        <h1 className="font-serif text-3xl tracking-tight text-ink">
          Регистрация
        </h1>
        <p className="text-sm text-muted">Заведи свой музыкальный дневник.</p>
      </header>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field label="Имя" id="name">
          <input
            id="name"
            type="text"
            required
            autoComplete="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className={field}
          />
        </Field>

        <Field label="Username" id="username">
          <input
            id="username"
            type="text"
            required
            pattern="[a-zA-Z0-9_\-]+"
            title="Только латинские буквы, цифры, - и _"
            autoComplete="username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            className={field}
          />
        </Field>

        <Field label="Email" id="email">
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className={field}
          />
        </Field>

        <Field label="Пароль" id="password">
          <input
            id="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={field}
          />
        </Field>

        {error && <p className="text-sm text-danger">{error}</p>}

        <button
          type="submit"
          disabled={isSubmitting}
          className={`mt-2 ${submitButton}`}
        >
          {isSubmitting ? "Создаём…" : "Зарегистрироваться"}
        </button>
      </form>

      <p className="text-center text-sm text-muted">
        Уже есть аккаунт?{" "}
        <Link
          href="/login"
          className="font-medium text-accent underline-offset-4 hover:underline"
        >
          Войти
        </Link>
      </p>
    </div>
  );
}

function Field({
  label,
  id,
  children,
}: {
  label: string;
  id: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-ink">
        {label}
      </label>
      {children}
    </div>
  );
}
