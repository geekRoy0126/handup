import "server-only";

import { randomInt } from "node:crypto";

const RANGE = 2 ** 32;

/** Like Math.random (a number in [0, 1)), but from the OS's cryptographic source, so values can't be predicted. */
export function secureRandom(): number {
  return randomInt(0, RANGE) / RANGE;
}
