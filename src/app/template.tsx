"use client";

import { m as motion } from "motion/react";
import { useMotionPref } from "@/components/shell/MotionPref";

/**
 * Route enter transition. `template.tsx` remounts on every navigation, so the new page fades in and rises 8px.
 * (App Router unmounts the old page immediately, so a true cross-fade exit is not possible without a router hack;
 * shared elements use the View Transitions API instead.) Reduced motion: opacity only.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  const { reduce } = useMotionPref();
  return (
    <motion.div initial={{ opacity: 0, y: reduce ? 0 : 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}>
      {children}
    </motion.div>
  );
}
