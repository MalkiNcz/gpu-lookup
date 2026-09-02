"use client";

import { useActionState } from "react";

type State = { error?: string } | undefined;

export function LoginForm({
  action,
  next,
}: {
  action: (state: State, formData: FormData) => Promise<State>;
  next: string;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);

  return (
    <form
      action={formAction}
      className="w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
    >
      <h1 className="text-lg font-semibold text-black dark:text-zinc-50">Přihlášení</h1>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">RX 9070 XT – hlídač cen</p>

      <input type="hidden" name="next" value={next} />

      <div className="mt-6 flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="username" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Uživatelské jméno
          </label>
          <input
            id="username"
            name="username"
            autoComplete="username"
            required
            autoFocus
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-black focus:border-red-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="password" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Heslo
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-black focus:border-red-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          />
        </div>

        {state?.error && <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>}

        <button
          type="submit"
          disabled={pending}
          className="mt-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-60"
        >
          {pending ? "Přihlašuji…" : "Přihlásit se"}
        </button>
      </div>
    </form>
  );
}
