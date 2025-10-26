import { headers } from "next/headers";
import { HistoryClient } from "../../components/HistoryClient";
import { validateRequestFromHeaders } from "../../server/auth";
import { listReadings } from "../../server/reading";

export default async function HistoryPage() {
  const headerList = await headers();
  const auth = await validateRequestFromHeaders(headerList);
  const user = auth
    ? {
        id: auth.user.id,
        email: auth.user.email
      }
    : null;

  const history = user ? await listReadings({ userId: user.id, limit: 10 }) : { items: [], nextCursor: null };

  return <HistoryClient user={user} initialItems={history.items} initialCursor={history.nextCursor} />;
}
