import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import Hero from "@/components/sections/Hero";
import FeaturesGrid from "@/components/sections/FeaturesGrid";
import PhotoshopWeb from "@/components/sections/PhotoshopWeb";
import UniqueFeatures from "@/components/sections/UniqueFeatures";
import Gallery from "@/components/sections/Gallery";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />
      <main className="flex-1">
        <Hero />
        <FeaturesGrid />
        <PhotoshopWeb />
        <UniqueFeatures />
        <Gallery />
      </main>
      <Footer />
    </div>
  );
}
