import { createHandler } from "@solidjs/start/server";

export default createHandler(() => import("./root"));
