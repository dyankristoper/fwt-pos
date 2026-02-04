import heroSandwich from "@/assets/hero-sandwich.jpg";
import chickenPieces from "@/assets/chicken-pieces.jpg";
import sides from "@/assets/sides.jpg";
import drinks from "@/assets/drinks.jpg";
interface MenuItem {
  name: string;
  description: string;
  price: string;
  image: string;
}
const menuItems: MenuItem[] = [{
  name: "Sandwiches",
  description: "Crispy fried chicken, brioche bun, house sauce",
  price: "From $9",
  image: heroSandwich
}, {
  name: "Chicken",
  description: "Golden tenders and wings, seasoned to order",
  price: "From $8",
  image: chickenPieces
}, {
  name: "Sides",
  description: "Waffle fries, slaw, pickles, mac & cheese",
  price: "From $4",
  image: sides
}, {
  name: "Drinks",
  description: "Fresh lemonade, iced tea, fountain drinks",
  price: "From $3",
  image: drinks
}];
const MenuSection = () => {
  return <section id="menu" className="bg-background py-24">
      <div className="container">
        {/* Section Header */}
        <div className="mb-16 text-center">
          <p className="mb-3 font-display text-sm font-medium uppercase tracking-[0.3em] text-accent">
            The Menu
          </p>
          
        </div>

        {/* Menu Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {menuItems.map(item => <div key={item.name} className="group relative aspect-square overflow-hidden rounded-sm card-hover cursor-pointer">
              {/* Image */}
              <img src={item.image} alt={item.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />

              {/* Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-primary via-primary/40 to-transparent" />

              {/* Content */}
              <div className="absolute bottom-0 left-0 right-0 p-6">
                <h3 className="mb-1 font-display text-2xl font-bold text-primary-foreground">
                  {item.name}
                </h3>
                <p className="mb-2 font-body text-sm text-primary-foreground/70">
                  {item.description}
                </p>
                <p className="font-display text-lg font-semibold text-accent">
                  {item.price}
                </p>
              </div>
            </div>)}
        </div>

        {/* Note */}
        <p className="mt-12 text-center font-body text-sm text-muted-foreground">
          Full menu available at your local Featherweight Chicken.
        </p>
      </div>
    </section>;
};
export default MenuSection;