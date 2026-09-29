import { notFound } from "next/navigation";
import { MotionDemo } from "./MotionDemo";

/** Component gallery for the motion primitives. Excluded from production builds unless NEXT_PUBLIC_DEV_PAGES=1. */
export default function Page() {
  if (process.env.NODE_ENV === "production" && process.env.NEXT_PUBLIC_DEV_PAGES !== "1") notFound();
  return <MotionDemo />;
}
