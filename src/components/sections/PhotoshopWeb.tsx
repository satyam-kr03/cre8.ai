import Image from "next/image";
import { Button } from "@/components/ui/button";

export default function PhotoshopWeb() {
  return (
    <section className="bg-gray-50 py-16">
      <div className="max-w-screen-xl mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center gap-8">
          <div className="flex-1">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              All Your Creative Needs in One Place
            </h2>
            <p className="text-gray-600 mb-6">
             Create stunning images, videos, and graphics with our powerful tools.
             Our user-friendly interface makes it easy to create beautiful designs,
             edit photos, and add text to your images.
            </p>
          </div>
          <div className="flex-1">
            <div className="relative h-[300px] w-full rounded-lg overflow-hidden shadow-xl">
              <Image
                src="/images/template4.png"
                alt="Photoshop on the web interface"
                fill
                style={{ objectFit: "cover" , borderRadius: "10px", border: "1px solid #ccc"}}
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
