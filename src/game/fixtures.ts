import type { Allocation } from "./types";

const a = (sh50: number, cyb: number, bank: number, baijiu: number, cash: number, margin: number): Allocation => ({ sh50, cyb, bank, baijiu, cash, margin });

/** Appendix B fixed play used by the C1 CLI and the snapshot test. */
export const APPENDIX_B: Allocation[] = [
  ...Array.from({ length: 4 }, () => a(50, 30, 0, 0, 20, 0)),
  a(20, 40, 0, 0, 0, 40),
  a(0, 20, 0, 0, 80, 0),
  ...Array.from({ length: 3 }, () => a(0, 0, 0, 0, 100, 0)),
  ...Array.from({ length: 3 }, () => a(40, 30, 10, 20, 0, 0)),
];
