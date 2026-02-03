const Footer = () => {
  return (
    <footer className="bg-primary py-16">
      <div className="container">
        <div className="flex flex-col items-center gap-8 md:flex-row md:justify-between">
          {/* Logo & Tagline */}
          <div>
            <p className="font-display text-3xl font-bold text-primary-foreground">
              FWT
            </p>
            <p className="mt-2 font-display text-sm uppercase tracking-widest text-primary-foreground/60">
              Featherweight Chicken
            </p>
          </div>

          {/* Links */}
          <nav className="flex flex-wrap justify-center gap-6 md:gap-8">
            <a
              href="#menu"
              className="font-body text-sm text-primary-foreground/70 transition-colors hover:text-accent"
            >
              Menu
            </a>
            <a
              href="#about"
              className="font-body text-sm text-primary-foreground/70 transition-colors hover:text-accent"
            >
              About
            </a>
            <a
              href="#locations"
              className="font-body text-sm text-primary-foreground/70 transition-colors hover:text-accent"
            >
              Locations
            </a>
            <a
              href="#"
              className="font-body text-sm text-primary-foreground/70 transition-colors hover:text-accent"
            >
              Careers
            </a>
          </nav>

          {/* Tagline */}
          <p className="font-display text-lg font-semibold text-accent">
            No bad bites.
          </p>
        </div>

        {/* Divider */}
        <div className="my-10 h-px bg-primary-foreground/10" />

        {/* Copyright */}
        <div className="flex flex-col items-center gap-4 text-center md:flex-row md:justify-between md:text-left">
          <p className="font-body text-xs text-primary-foreground/50">
            © {new Date().getFullYear()} Featherweight Chicken. All rights
            reserved.
          </p>
          <p className="font-body text-xs text-primary-foreground/50">
            A Bad Bites Brands Company
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
