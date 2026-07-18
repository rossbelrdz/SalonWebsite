import { PublicNav } from "@/components/PublicNav";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PublicNav />
      <main>{children}</main>
      <footer className="footer-public">
        <div className="container row" style={{ justifyContent: "space-between" }}>
          <span>Salon · Demo Beauty Group</span>
          <span className="tiny">Fases 3–5 · Docker + Next.js</span>
        </div>
      </footer>
    </>
  );
}
