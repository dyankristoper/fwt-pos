import foodTexture from "@/assets/food-texture.jpg";
const AboutSection = () => {
  return <section id="about" className="bg-primary py-24">
      <div className="container">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
          {/* Image */}
          <div className="relative">
            <div className="aspect-[4/3] overflow-hidden rounded-sm">
              <img alt="Featherweight Chicken kitchen" className="h-full w-full object-cover" src="/lovable-uploads/4bb93ed7-93a2-4500-9698-f23c79f931b0.jpg" />
            </div>
            {/* Accent line */}
            <div className="absolute -bottom-4 -left-4 h-full w-full border-2 border-accent rounded-sm -z-10" />
          </div>

          {/* Content */}
          <div>
            <p className="mb-3 font-display text-sm font-medium uppercase tracking-[0.3em] text-accent">
              Our Standard
            </p>
            <h2 className="mb-6 font-display text-4xl font-bold text-primary-foreground md:text-5xl">
              High standards.
              <br />
              Low ego.
            </h2>

            <div className="space-y-6 font-body text-primary-foreground/80">
              <p>
                Built by people who take food seriously — not themselves. We
                solve one problem: inconsistent quality in QSR. "Looks good
                once, bad the next time" food.
              </p>
              <p>
                Featherweight Chicken is a mid-premium fast-casual chicken brand
                built on one promise: consistent, high-quality chicken done
                right, every time.
              </p>
            </div>

            {/* Values */}
            <div className="mt-10 grid grid-cols-3 gap-6 border-t border-primary-foreground/20 pt-10">
              <div>
                <p className="font-display text-3xl font-bold text-accent">
                  Trust
                </p>
                <p className="mt-1 font-body text-sm text-primary-foreground/60">
                  Earned daily
                </p>
              </div>
              <div>
                <p className="font-display text-3xl font-bold text-accent">
                  Speed
                </p>
                <p className="mt-1 font-body text-sm text-primary-foreground/60">
                  Never rushed
                </p>
              </div>
              <div>
                <p className="font-display text-3xl font-bold text-accent">
                  Care
                </p>
                <p className="mt-1 font-body text-sm text-primary-foreground/60">
                  In every bite
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>;
};
export default AboutSection;