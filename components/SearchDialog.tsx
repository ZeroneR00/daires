"use client";

import Form from "next/form";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

/*
  Кнопка-лупа в шапке вместо постоянно висящего поля. Сама кнопка — честный
  <Link href="/search">: без JS клик уводит на страницу поиска, которая
  работает сама по себе. JS перехватывает клик и открывает модалку — тот же
  progressive enhancement, что был у next/form в прежней строке поиска.

  Диалог — нативный <dialog> + showModal(), как в TrackPickerDialog: фокус
  ловится внутри, Esc закрывает, ::backdrop затемняет — всё это браузер
  делает сам, без библиотек.
*/
export function SearchDialog() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  // Ctrl/⌘ + K — привычная всем комбинация для поиска.
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen(true);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <>
      <Link
        href="/search"
        title="Поиск (Ctrl+K)"
        aria-label="Поиск по сайту"
        onClick={(event) => {
          event.preventDefault();
          setOpen(true);
        }}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line text-muted transition-colors hover:border-accent hover:text-accent"
      >
        <SearchIcon />
      </Link>

      <dialog
        ref={dialogRef}
        onClose={() => setOpen(false)}
        onClick={(event) => {
          if (event.target === event.currentTarget) setOpen(false);
        }}
        className="m-auto w-full max-w-xl rounded-card border border-line bg-surface p-0 backdrop:bg-ink/40 backdrop:backdrop-blur-sm"
      >
        <div className="flex flex-col gap-3 p-5">
          <Form
            action="/search"
            onSubmit={() => setOpen(false)}
            className="flex items-center gap-3"
          >
            <span aria-hidden className="text-muted">
              <SearchIcon />
            </span>
            <input
              type="search"
              name="q"
              placeholder="Посты, треки, люди"
              aria-label="Поисковый запрос"
              autoFocus
              className="min-w-0 flex-1 bg-transparent text-lg text-ink outline-none placeholder:text-muted"
            />
          </Form>
          <p className="text-xs text-muted">
            Enter — искать · Esc — закрыть
          </p>
        </div>
      </dialog>
    </>
  );
}

function SearchIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      aria-hidden
    >
      <circle cx="7" cy="7" r="4.5" />
      <path d="M10.5 10.5 14 14" />
    </svg>
  );
}
