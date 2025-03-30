import Image from "next/image";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
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

// Sample gallery items to use as fallback
const sampleGalleryItems: GalleryItem[] = [
  {
    id: "sample1",
    imageUrl: "https://cdn.cp.adobe.io/content/2/rendition/4398c8c4-f47b-457e-97b4-a59c383c68f8/artwork/238ee2ad-b95f-4cf2-a1b3-188a449e21d4/version/0/format/jpg/dimension/width/size/350",
    prompt: "Butterfly shaped only by a flower meadow, white background",
    isLiked: false,
  },
  {
    id: "sample2",
    imageUrl: "https://firefly.adobe.com/generated/0B0xEZZrMd-RKA3j0GsZUHA.jpeg",
    prompt: "Surreal portrait of the girl with wildflowers wreath, simple background, risograph printing",
    isLiked: true,
  },
  {
    id: "sample3",
    imageUrl: "https://firefly.adobe.com/generated/gqD_6xLxTDSszDGlaqfKIg.jpeg",
    prompt: "Top-down, birds-eye view of a frogs body, fully visible from above. The frogs skin is covered in intricate, psychedelic patterns...",
    isLiked: true,
  },
  {
    id: "sample4",
    imageUrl: "https://firefly.adobe.com/generated/R1RQFyF7To-lTtOJg9Bdfg.jpeg",
    prompt: "In the style of mosaic art, create an oil painting depicting two magnolia trees...",
    isLiked: true,
  },
];

export default function Gallery() {
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [useApiItems, setUseApiItems] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function fetchGalleryItems() {
      try {
        setIsLoading(true);
        // Fetch more items so we have enough after filtering out audio
        const response = await fetch('/api/gallery?limit=12');
        
        if (!response.ok) {
          throw new Error('Failed to fetch gallery items');
        }
        
        const data = await response.json();
        const items = data.items || [];
        
        // Filter out audio items
        const filteredItems = items.filter((item: GalleryItem) => !item.settings?.isAudio);
        
        // If we have enough items after filtering, use them
        // Otherwise, use sample items
        if (filteredItems.length >= 4) {
          setGalleryItems(filteredItems);
          setUseApiItems(true);
        } else {
          setGalleryItems(sampleGalleryItems);
          setUseApiItems(false);
        }
      } catch (err) {
        console.error('Error fetching gallery:', err);
        setError('Failed to load gallery items');
        setGalleryItems(sampleGalleryItems);
        setUseApiItems(false);
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchGalleryItems();
  }, []);

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

  if (error && !useApiItems && galleryItems.length === 0) {
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
        {useApiItems ? (
          item.type === 'Image' ? (
            <Image
              src={`data:${item.contentType};base64,${item.contentData}`}
              alt={item.prompt || "Gallery item"}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
              style={{ objectFit: "cover" }}
              className="transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex items-center justify-center h-full bg-gradient-to-r from-indigo-100 to-purple-100 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black opacity-20"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="h-16 w-16 rounded-full bg-white bg-opacity-20 flex items-center justify-center animate-pulse">
                  <div className="h-14 w-14 rounded-full bg-white bg-opacity-30 flex items-center justify-center">
                    <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                </div>
              </div>
              <svg className="w-24 h-24 text-indigo-500 opacity-20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
          )
        ) : (
          <Image
            src={item.imageUrl || ""}
            alt={item.prompt || "Gallery item"}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
            style={{ objectFit: "cover" }}
            className="transition-transform duration-500 group-hover:scale-105"
          />
        )}
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
          {galleryItems.slice(0, 4).map(renderGalleryItem)}
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
