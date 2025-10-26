import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { HomeClient } from "../components/HomeClient";
import { validateRequestFromHeaders } from "../server/auth";

export default async function Page() {
  const headerList = await headers();
  const auth = await validateRequestFromHeaders(headerList);
  
  if (!auth) {
    redirect("/login");
  }
  
  const user = {
    id: auth.user.id,
    email: auth.user.email
  };

  return <HomeClient user={user} />;
}
