import { createHmac } from "node:crypto";
import { tarotDeck, type TarotCard } from "../lib/common";
import { getEnv } from "../server/config";
import { createRng, deterministicShuffle } from "./random";

export type SpreadType = "single" | "three-card" | "celtic-cross";

export function deriveSeed(userId: string, isoDate: string) {
  const env = getEnv();
  const hmac = createHmac("sha256", env.HMAC_SECRET);
  hmac.update(`${userId}:${isoDate}`);
  return hmac.digest("hex");
}

export function generateSpread(seed: string, spreadType: SpreadType) {
  const rng = createRng(seed);
  const shuffled = deterministicShuffle(tarotDeck, rng);
  return shuffled.slice(0, spreadCardCount(spreadType)).map((card, index) => ({
    card,
    orientation: rng() > 0.5 ? ("reversed" as const) : ("upright" as const),
    position: spreadPosition(spreadType, index)
  }));
}

function spreadCardCount(spreadType: SpreadType) {
  switch (spreadType) {
    case "single":
      return 1;
    case "three-card":
      return 3;
    case "celtic-cross":
      return 10;
    default:
      return 3;
  }
}

function spreadPosition(spreadType: SpreadType, index: number): string {
  if (spreadType === "single") {
    return "focus";
  }
  if (spreadType === "three-card") {
    return ["past", "present", "potential"][index] ?? `slot-${index + 1}`;
  }
  const positions = [
    "significator",
    "crossing",
    "foundation",
    "recent past",
    "aspiration",
    "near future",
    "self",
    "surroundings",
    "hopes and fears",
    "outcome"
  ];
  return positions[index] ?? `slot-${index + 1}`;
}

export type GeneratedDraw = {
  card: TarotCard;
  orientation: "upright" | "reversed";
  position: string;
};
