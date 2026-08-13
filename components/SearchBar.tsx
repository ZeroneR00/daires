import Form from "next/form";

// `next/form`, а не обычный `<form>`: сабмит уходит client-side навигацией
// на /search?q=..., без полной перезагрузки. Без JS деградирует до обычной
// отправки формы — поведение сохраняется.
export function SearchBar() {
  return (
    <Form action="/search" className="flex min-w-0 flex-1 justify-center">
      <input
        type="search"
        name="q"
        placeholder="Поиск"
        aria-label="Поиск по сайту"
        className="w-full max-w-xs rounded-full border border-black/[.08] bg-white px-4 py-1.5 text-sm text-black outline-none placeholder:text-zinc-400 focus:border-black/[.25] dark:border-white/[.145] dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-white/[.35]"
      />
    </Form>
  );
}
