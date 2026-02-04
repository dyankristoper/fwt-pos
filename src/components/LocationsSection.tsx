import { MapPin, Clock, ExternalLink } from "lucide-react";

const location = {
  name: "1610 Food Avenue",
  address: "GF Triumph Building, Quezon Avenue, Quezon City",
  hours: "Mon-Fri: 9:00am - 5:00pm",
  mapQuery: "Triumph Building, Quezon Avenue, Quezon City, Philippines",
};

const LocationsSection = () => {
  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location.mapQuery)}`;
  const embedUrl = `https://www.google.com/maps?q=${encodeURIComponent(location.mapQuery)}&output=embed`;

  return (
    <section id="locations" className="bg-secondary py-24">
      <div className="container">
        {/* Section Header */}
        <div className="mb-16 text-center">
          <p className="mb-3 font-display text-sm font-medium uppercase tracking-[0.3em] text-accent">
            Find Us
          </p>
          <h2 className="font-display text-4xl font-bold text-foreground md:text-5xl">
            Our Location
          </h2>
        </div>

        {/* Location Card with Map */}
        <div className="mx-auto max-w-4xl overflow-hidden rounded-sm bg-card shadow-lg">
          {/* Map Embed */}
          <div className="aspect-video w-full">
            <iframe
              src={embedUrl}
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Featherweight Chicken Location"
            />
          </div>

          {/* Location Details */}
          <div className="p-8">
            <h3 className="mb-4 font-display text-2xl font-bold text-card-foreground">
              {location.name}
            </h3>

            <div className="mb-6 space-y-3">
              <div className="flex items-start gap-3">
                <MapPin size={18} className="mt-0.5 shrink-0 text-accent" />
                <p className="font-body text-muted-foreground">
                  {location.address}
                </p>
              </div>
              <div className="flex items-start gap-3">
                <Clock size={18} className="mt-0.5 shrink-0 text-accent" />
                <p className="font-body text-muted-foreground">
                  {location.hours}
                </p>
              </div>
            </div>

            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 font-display text-sm font-semibold uppercase tracking-wider text-accent transition-colors hover:text-accent/80"
            >
              Get Directions
              <ExternalLink size={16} />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

export default LocationsSection;