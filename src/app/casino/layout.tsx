import { CasinoBar } from "@/features/casino/components/casino-bar";

/** Every casino page shares the dark casino floor and the bankroll bar. */
export default function CasinoLayout({ children }: LayoutProps<"/casino">) {
  return (
    <div className="casino-floor min-h-[calc(100dvh-4rem)]">
      <CasinoBar />
      {children}
    </div>
  );
}
