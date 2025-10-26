import { headers } from "next/headers";
import { SettingsClient } from "../../components/SettingsClient";
import { validateRequestFromHeaders } from "../../server/auth";

export default async function SettingsPage() {
  const headerList = headers();
  const auth = await validateRequestFromHeaders(headerList);
  const user = auth
    ? {
        id: auth.user.id,
        email: auth.user.email
      }
    : null;

  return <SettingsClient user={user} />;
}
