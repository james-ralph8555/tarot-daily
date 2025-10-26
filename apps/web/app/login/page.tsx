import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { LoginForm } from "./LoginForm";
import { validateRequestFromHeaders } from "../../server/auth";

export default async function LoginPage() {
  const auth = await validateRequestFromHeaders(await headers());
  if (auth?.user) {
    redirect("/");
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center px-4 py-16">
      <LoginForm />
    </main>
  );
}
