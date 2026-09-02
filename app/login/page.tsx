import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
  checkCredentials,
  createSessionCookieValue,
  isValidSessionCookieValue,
} from "@/lib/auth";
import { LoginForm } from "./LoginForm";

function safeNextPath(next: string | undefined): string {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const cookieStore = await cookies();

  if (isValidSessionCookieValue(cookieStore.get(SESSION_COOKIE_NAME)?.value)) {
    redirect(safeNextPath(next));
  }

  async function login(_prevState: { error?: string } | undefined, formData: FormData) {
    "use server";

    const username = String(formData.get("username") ?? "");
    const password = String(formData.get("password") ?? "");
    const nextPath = safeNextPath(String(formData.get("next") ?? ""));

    if (!checkCredentials(username, password)) {
      return { error: "Nesprávné jméno nebo heslo." };
    }

    const store = await cookies();
    store.set(SESSION_COOKIE_NAME, createSessionCookieValue(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE_SECONDS,
    });

    redirect(nextPath);
  }

  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 px-6 dark:bg-black">
      <LoginForm action={login} next={safeNextPath(next)} />
    </div>
  );
}
