import Link from "next/link";
import { btn } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-[680px] px-4 py-24 text-center">
      <p className="num text-6xl font-black text-sub">404</p>
      <h1 className="mt-4 text-2xl font-bold">这一页不在时间线上</h1>
      <p className="mt-3 text-sub">剧本不存在，或者链接写错了。</p>
      <Link href="/" className={btn("primary", "mt-8")}>
        回首页
      </Link>
    </main>
  );
}
