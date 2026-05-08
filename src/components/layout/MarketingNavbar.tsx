import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowRight, Menu, X } from 'lucide-react';

export const goldGradient =
  'bg-gradient-to-br from-[#F0D27B] via-[#C89B3C] to-[#8A6A23] bg-clip-text text-transparent';

export const btnGold =
  'inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-br from-[#F0D27B] via-[#C89B3C] to-[#8A6A23] text-background font-semibold px-6 py-3 min-h-[48px] shadow-[0_8px_28px_-6px_rgba(200,155,60,0.55)] ring-1 ring-inset ring-[rgba(255,235,180,0.25)] hover:brightness-110 transition-[filter,transform] duration-200 active:scale-[0.98]';

export const btnGoldOutline =
  'inline-flex items-center justify-center gap-2 rounded-lg border border-[rgba(200,155,60,0.4)] text-gold font-semibold px-6 py-3 min-h-[48px] hover:bg-[rgba(200,155,60,0.08)] hover:border-[rgba(200,155,60,0.6)] transition-colors duration-200';

export const goldDivider =
  'h-px w-full bg-gradient-to-r from-transparent via-[rgba(200,155,60,0.35)] to-transparent';

export function MarketingNavbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const isHome = pathname === '/';

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 32);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const links: Array<
    { label: string; href: string } | { label: string; to: string }
  > = [
    { label: 'Features', href: isHome ? '#features' : '/#features' },
    { label: 'How It Works', href: isHome ? '#how-it-works' : '/#how-it-works' },
    { label: 'FAQ', href: isHome ? '#faq' : '/#faq' },
    { label: 'Settlement Calculator', to: '/poker-settlement-calculator' },
    { label: 'Hand Calculator', to: '/poker-hand-calculator' },
  ];

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-[background-color,backdrop-filter,border-color] duration-500 ${
        scrolled
          ? 'bg-[rgba(10,13,24,0.78)] backdrop-blur-xl border-b border-[rgba(200,155,60,0.1)]'
          : 'bg-transparent border-b border-transparent'
      }`}
    >
      <nav className="max-w-[1280px] mx-auto px-5 sm:px-6 lg:px-8 h-[68px] flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5 group">
          <img
            src="/icon-192x192.png"
            alt="Stack Tracker logo"
            className="w-9 h-9 rounded-lg shadow-[0_0_18px_rgba(200,155,60,0.35)] group-hover:shadow-[0_0_28px_rgba(200,155,60,0.55)] transition-shadow duration-300"
          />
          <span className="text-foreground font-semibold tracking-tight text-[17px]">
            Stack Tracker
          </span>
        </Link>

        <div className="hidden lg:flex items-center gap-7">
          {links.map((l) =>
            'href' in l ? (
              <a
                key={l.href}
                href={l.href}
                className="text-foreground/60 hover:text-gold text-[13px] font-medium tracking-wide uppercase transition-colors duration-300"
              >
                {l.label}
              </a>
            ) : (
              <Link
                key={l.to}
                to={l.to}
                className="text-foreground/60 hover:text-gold text-[13px] font-medium tracking-wide uppercase transition-colors duration-300"
              >
                {l.label}
              </Link>
            ),
          )}
        </div>

        <div className="hidden lg:flex items-center gap-4">
          <Link
            to="/auth"
            className="text-foreground/65 hover:text-foreground text-sm font-medium transition-colors duration-300"
          >
            Sign In
          </Link>
          <Link to="/auth" className={`${btnGold} px-5 py-2.5 min-h-0 text-sm`}>
            Get Started
            <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="lg:hidden p-2 -mr-2 text-foreground"
          aria-label={open ? 'Close menu' : 'Open menu'}
        >
          {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </nav>

      {open && (
        <div className="lg:hidden bg-[rgba(10,13,24,0.96)] backdrop-blur-xl border-b border-[rgba(200,155,60,0.1)] px-6 pb-6 animate-fade-in">
          <div className="flex flex-col gap-1 pt-2">
            {links.map((l) =>
              'href' in l ? (
                <a
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="py-3 text-foreground/75 hover:text-gold text-base font-medium transition-colors"
                >
                  {l.label}
                </a>
              ) : (
                <Link
                  key={l.to}
                  to={l.to}
                  onClick={() => setOpen(false)}
                  className="py-3 text-foreground/75 hover:text-gold text-base font-medium transition-colors"
                >
                  {l.label}
                </Link>
              ),
            )}
            <div className={`${goldDivider} my-3`} />
            <Link
              to="/auth"
              onClick={() => setOpen(false)}
              className="py-3 text-foreground/65 text-base font-medium"
            >
              Sign In
            </Link>
            <Link to="/auth" className={`${btnGold} mt-2`} onClick={() => setOpen(false)}>
              Get Started — Free
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
