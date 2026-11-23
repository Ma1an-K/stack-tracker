import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { PokerChipSpade } from "@/components/icons/PokerChipSpade";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <main className="relative flex min-h-[100lvh] items-center justify-center overflow-hidden bg-background px-6">
      <div aria-hidden="true" className="pointer-events-none absolute -left-24 -top-24 h-[420px] w-[420px] rounded-full bg-[radial-gradient(circle,hsl(var(--gold)/0.1)_0%,transparent_65%)]" />
      <div className="page-enter relative max-w-sm text-center">
        <span className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-gold/40 bg-card shadow-[0_0_30px_-6px_hsl(var(--gold)/0.5)]">
          <PokerChipSpade className="h-8 w-8 text-gold" />
        </span>
        <p className="section-header mb-2">Error 404</p>
        <h1 className="font-display text-[2.6rem] font-semibold leading-tight">This seat is empty.</h1>
        <p className="mt-3 text-muted-foreground">The page you were looking for doesn't exist or has moved.</p>
        <Button asChild size="lg" className="mt-8 w-full">
          <Link to="/">Back to the table</Link>
        </Button>
      </div>
    </main>
  );
};

export default NotFound;
