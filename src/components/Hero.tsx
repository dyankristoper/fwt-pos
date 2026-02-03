import { Button } from "@/components/ui/button";
import heroImage from "@/assets/hero-sandwich.jpg";

const Hero = ({ onOpenChat }: { onOpenChat: () => void }) => {
  return (
    <section className="relative min-h-screen overflow-hidden hero-gradient">
      {/* Background Image */}
      <div className="absolute inset-0">
        <img
          src={heroImage}
          alt="Crispy chicken sandwich"
          className="h-full w-full object-cover opacity-40"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-primary via-primary/80 to-transparent" />
      </div>

      {/* Content */}
      <div className="container relative flex min-h-screen flex-col justify-center pt-16">
        <div className="max-w-2xl animate-fade-in">
          {/* Tagline */}
          <p className="mb-4 font-display text-sm font-medium uppercase tracking-[0.3em] text-accent">
            Chicken that hits
          </p>

          {/* Main Headline */}
          <h1 className="mb-6 font-display text-5xl font-bold leading-tight text-primary-foreground md:text-7xl">
            No bad bites.
          </h1>

          {/* Subheadline */}
          <p className="mb-10 max-w-md font-body text-lg text-primary-foreground/80 md:text-xl">
            Consistent, high-quality chicken done right. Every time.
          </p>

          {/* CTAs */}
          <div className="flex flex-col gap-4 sm:flex-row">
            <Button variant="hero" size="lg" onClick={onOpenChat}>
              Start Your Order
            </Button>
            <Button variant="hero-outline" size="lg" asChild>
              <a href="#menu">View Menu</a>
            </Button>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
          <div className="flex flex-col items-center gap-2">
            <span className="font-body text-xs uppercase tracking-widest text-primary-foreground/60">
              Scroll
            </span>
            <div className="h-12 w-px bg-gradient-to-b from-primary-foreground/60 to-transparent" />
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
