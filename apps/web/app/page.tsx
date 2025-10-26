import { headers } from "next/headers";
import { HomeClient } from "../components/HomeClient";
import { validateRequestFromHeaders } from "../server/auth";

export default async function Page() {
  const headerList = headers();
  const auth = await validateRequestFromHeaders(headerList);
  const user = auth
    ? {
        id: auth.user.id,
        email: auth.user.email
      }
    : null;

  return <HomeClient user={user} />;
}
