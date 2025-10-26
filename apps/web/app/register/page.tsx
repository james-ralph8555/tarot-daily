import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { RegisterForm } from "./RegisterForm";
import { validateRequestFromHeaders } from "../../server/auth";

export default async function RegisterPage() {
  const auth = await validateRequestFromHeaders(await headers());
  if (auth?.user) {
    redirect("/");
  }

  return (
    <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-4 pb-24 pt-20">
      <RegisterForm />
    </main>
  );
}
