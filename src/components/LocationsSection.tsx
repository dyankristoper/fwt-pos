import { MapPin, Clock } from "lucide-react";
const locations = [{
  name: "1610 Food Avenue",
  address: "GF Triumph Building, Quezon Avenue, Quezon City",
  hours: "Mon-Fri: 9:00am - 5:00pm"
}];
const LocationsSection = () => {
  return <section id="locations" className="bg-secondary py-24">
      <div className="container">
        {/* Section Header */}
        <div className="mb-16 text-center">
          <p className="mb-3 font-display text-sm font-medium uppercase tracking-[0.3em] text-accent">
            Find Us
          </p>
          <h2 className="font-display text-4xl font-bold text-foreground md:text-5xl">
            Locations
          </h2>
          
        </div>

        {/* Locations Grid */}
        <div className="grid gap-6 md:grid-cols-3">
          {locations.map(location => <div key={location.name} className="rounded-sm bg-card p-8 transition-all duration-300 hover:shadow-lg">
              <h3 className="mb-4 font-display text-xl font-bold text-card-foreground">
                {location.name}
              </h3>

              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <MapPin size={18} className="mt-0.5 shrink-0 text-accent" />
                  <p className="font-body text-sm text-muted-foreground">
                    {location.address}
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <Clock size={18} className="mt-0.5 shrink-0 text-accent" />
                  <p className="font-body text-sm text-muted-foreground">
                    {location.hours}
                  </p>
                </div>
              </div>
            </div>)}
        </div>
      </div>
    </section>;
};
export default LocationsSection;