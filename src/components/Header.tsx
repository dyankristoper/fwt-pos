import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";

const Header = ({ onOpenChat }: { onOpenChat: () => void }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-primary/95 backdrop-blur-sm">
      <div className="container flex h-16 items-center justify-between">
        {/* Logo */}
        <a href="#" className="flex items-center gap-2">
          <span className="font-display text-2xl font-bold tracking-tight text-primary-foreground">
            FWT
          </span>
          <span className="hidden font-display text-sm font-medium uppercase tracking-widest text-primary-foreground/80 sm:inline">
            Featherweight Chicken
          </span>
        </a>

        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-8 md:flex">
          <a
            href="#menu"
            className="font-body text-sm text-primary-foreground/80 transition-colors hover:text-accent"
          >
            Menu
          </a>
          <a
            href="#about"
            className="font-body text-sm text-primary-foreground/80 transition-colors hover:text-accent"
          >
            About
          </a>
          <a
            href="#locations"
            className="font-body text-sm text-primary-foreground/80 transition-colors hover:text-accent"
          >
            Locations
          </a>
          <Button variant="hero" size="sm" onClick={onOpenChat}>
            Order Now
          </Button>
        </nav>

        {/* Mobile Menu Button */}
        <button
          className="text-primary-foreground md:hidden"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="border-t border-primary-foreground/10 bg-primary md:hidden">
          <nav className="container flex flex-col gap-4 py-6">
            <a
              href="#menu"
              className="font-body text-primary-foreground/80 transition-colors hover:text-accent"
              onClick={() => setMobileMenuOpen(false)}
            >
              Menu
            </a>
            <a
              href="#about"
              className="font-body text-primary-foreground/80 transition-colors hover:text-accent"
              onClick={() => setMobileMenuOpen(false)}
            >
              About
            </a>
            <a
              href="#locations"
              className="font-body text-primary-foreground/80 transition-colors hover:text-accent"
              onClick={() => setMobileMenuOpen(false)}
            >
              Locations
            </a>
            <Button
              variant="hero"
              size="default"
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenChat();
              }}
            >
              Order Now
            </Button>
          </nav>
        </div>
      )}
    </header>
  );
};

export default Header;
