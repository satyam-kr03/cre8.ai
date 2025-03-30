import Image from "next/image";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useRouter } from "next/navigation";

interface GalleryItem {
  id: string;
  prompt: string;
  contentData?: string;
  contentType?: string;
  type?: string;
  imageUrl?: string; // For sample items
  createdAt?: string;
  settings?: Record<string, any>;
  isLiked?: boolean;
}

// Custom gallery items
const customGalleryItems: GalleryItem[] = [
  {
    id: "custom1",
    imageUrl: "/images/GT1.jpeg",
    prompt: "The image depicts a young man with anime-style features, gazing pensively upward against a nighttime backdrop.",
    isLiked: true,
  },
  {
    id: "custom2",
    imageUrl: "/images/GT5.jpeg",
    prompt: "A rainy evening in a bustling city, with wet streets reflecting the glow of streetlights and neon signs. Pedestrians in coats and umbrellas hurry along sidewalks, their footsteps splashing in puddles. Cars drive slowly, their headlights illuminating the misty air. Raindrops streak across glass windows, and water droplets slide down. In the distance, faint chatter and the hum of traffic blend with the sound of rain falling.",
    isLiked: false,
  },
  {
    id: "custom3",
    imageUrl: "/images/GT3.png",
    prompt: "A hyperrealistic painting in the style of Caspar David Friedrich, depicting a bustling city street scene at golden hour. The focal point is a magnificent, ornate brick building with a steeply pitched green roof and a tall, slender clock tower, reminiscent of late 19th-century architecture.  A bronze statue of a ballerina in a flowing tutu stands gracefully in the foreground, positioned centrally, seemingly observing the urban activity.  The street is filled with vintage cars from the 1950s-1970s, pedestrians dressed in period clothing, and modern elements like electric scooters subtly integrated, creating a blend of eras.  The sky is",
    isLiked: true,
  },
  {
    id: "custom4",
    imageUrl: "/images/GT4.png",
    prompt: "The image depicts a silhouetted girl standing in a field of tall grass under a large, vibrant moon.  Numerous butterflies, rendered in various shades of purple and cyan, flutter around her and the moon. The overall color palette is a dreamy blend of purples, blues, and pinks, creating a soft, ethereal atmosphere.  The composition is centered around the girl, with the moon acting as a powerful backdrop and the butterflies creating a sense of movement and enchantment.  The mood is serene, peaceful, and slightly melancholic, with a touch of magical wonder. The style is reminiscent of digital art or fantasy illustration.",
    isLiked: true,
  },
];

export default function Gallery() {
  const [galleryItems] = useState<GalleryItem[]>(customGalleryItems);
  const [isLoading] = useState(false);
  const [error] = useState<string | null>(null);
  const router = useRouter();

  const handleViewGallery = () => {
    router.push('/gallery');
  };

  if (isLoading) {
    return (
      <section className="py-16 bg-gray-50">
        <div className="max-w-screen-xl mx-auto px-4">
          <h2 className="text-center text-2xl font-semibold text-gray-600 mb-6">
            Featured content from the Cre8.ai community
          </h2>
          <h3 className="text-center text-3xl font-bold text-gray-900 mb-10">
            Find inspiration in the gallery
          </h3>
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        </div>
      </section>
    );
  }

  if (error && galleryItems.length === 0) {
    return (
      <section className="py-16 bg-gray-50">
        <div className="max-w-screen-xl mx-auto px-4">
          <h2 className="text-center text-2xl font-semibold text-gray-600 mb-6">
            Featured content from the Cre8.ai community
          </h2>
          <h3 className="text-center text-3xl font-bold text-gray-900 mb-10">
            Find inspiration in the gallery
          </h3>
          <div className="text-center py-12">
            <p className="text-gray-500">{error || "No gallery items found. Start creating to build your gallery!"}</p>
          </div>
          <div className="mt-10 text-center">
            <Button variant="outline" className="rounded-full border-gray-300 hover:bg-gray-100" onClick={handleViewGallery}>
              View my gallery
            </Button>
          </div>
        </div>
      </section>
    );
  }

  const renderGalleryItem = (item: GalleryItem) => (
    <div key={item.id} className="group rounded-lg overflow-hidden bg-white shadow-md transition-all duration-300 hover:shadow-lg">
      <div className="relative aspect-square overflow-hidden">
        <Image
          src={item.imageUrl || ""}
          alt={item.prompt || "Gallery item"}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
          style={{ objectFit: "cover" }}
          className="transition-transform duration-500 group-hover:scale-105"
        />
      </div>
      <div className="p-4">
        <p className="text-sm text-gray-600 line-clamp-2">{item.prompt || "No prompt provided"}</p>
      </div>
    </div>
  );

  return (
    <section className="py-16 bg-gray-50">
      <div className="max-w-screen-xl mx-auto px-4">
        <h2 className="text-center text-2xl font-semibold text-gray-600 mb-6">
          Featured content from the Cre8.ai community
        </h2>
        <h3 className="text-center text-3xl font-bold text-gray-900 mb-10">
          Find inspiration in the gallery
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {galleryItems.map(renderGalleryItem)}
        </div>

        <div className="mt-10 text-center">
          <Button 
            variant="outline" 
            className="rounded-full border-gray-300 hover:bg-gray-100"
            onClick={handleViewGallery}
          >
            View my gallery
          </Button>
        </div>
      </div>
    </section>
  );
}
