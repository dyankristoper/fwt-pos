import { useState } from "react";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import MenuSection from "@/components/MenuSection";
import AboutSection from "@/components/AboutSection";
import LocationsSection from "@/components/LocationsSection";
import Footer from "@/components/Footer";
import OrderChat from "@/components/OrderChat";

const Index = () => {
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <div className="min-h-screen">
      <Header onOpenChat={() => setChatOpen(true)} />
      <Hero onOpenChat={() => setChatOpen(true)} />
      <MenuSection />
      <AboutSection />
      <LocationsSection />
      <Footer />
      <OrderChat isOpen={chatOpen} onClose={() => setChatOpen(false)} />
    </div>
  );
};

export default Index;
