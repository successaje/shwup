"use client";

import { animate, useMotionValue, useReducedMotion, useTransform, motion } from "motion/react";
import { useEffect } from "react";
import { formatUnits } from "viem";
import { USDC_DECIMALS } from "@/lib/money";

/**
 * Shown the instant a guest's ticket flips to checked-in while they're looking at it.
 * The amount counts up to the deposit — money visibly arriving.
 */
export function ArrivalBanner({ amount }: { amount: bigint }) {
  const target = Number(formatUnits(amount, USDC_DECIMALS));
  const reduce = useReducedMotion();
  const value = useMotionValue(reduce ? target : 0);
  const text = useTransform(value, (v) => `+$${v.toFixed(2)}`);

  useEffect(() => {
    if (reduce) return;
    const controls = animate(value, target, { duration: 0.9, ease: [0.2, 0.8, 0.2, 1] });
    return () => controls.stop();
  }, [reduce, target, value]);

  return (
    <div role="status" className="mx-auto w-full max-w-sm animate-rise rounded-lg bg-ok px-6 py-5 text-white lg:mx-0 dark:text-sunken">
      <p className="text-sm font-medium opacity-90">You&apos;re in.</p>
      <motion.p className="num mt-1 text-4xl">{text}</motion.p>
      <p className="mt-1 text-sm opacity-90">is back in your wallet. Final on Arc.</p>
    </div>
  );
}
