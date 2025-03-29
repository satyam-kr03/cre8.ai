import Image from "next/image";
import { Button } from "@/components/ui/button";

export default function PhotoshopWeb() {
  return (
    <section className="bg-gray-50 py-16">
      <div className="max-w-screen-xl mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center gap-8">
          <div className="flex-1">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Go further with Photoshop on the web
            </h2>
            <p className="text-gray-600 mb-6">
              Photoshop on the web delivers powerful editing tools in a
              streamlined interface. Preview the app now - no sign in or download
              required.
            </p>
            <Button className="bg-gray-900 hover:bg-gray-800">Try it</Button>
          </div>
          <div className="flex-1">
            <div className="relative h-[300px] w-full rounded-lg overflow-hidden shadow-xl">
              <Image
                src="https://ext.same-assets.com/426488002/2421270945.bin"
                alt="Photoshop on the web interface"
                fill
                style={{ objectFit: "cover" }}
                className="rounded-lg"
              />
              {/* Overlay UI elements that mimic the photoshop interface */}
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-4/5 h-10 bg-white/20 backdrop-blur-sm rounded"></div>
                <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 w-3/4 h-8 bg-white/20 backdrop-blur-sm rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
