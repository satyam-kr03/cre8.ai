import Image from "next/image";
import { Button } from "@/components/ui/button";

export default function Gallery() {
  // Sample gallery items - in a real implementation, these would come from an API
  const galleryItems = [
    {
      id: 1,
      imageUrl: "https://cdn.cp.adobe.io/content/2/rendition/4398c8c4-f47b-457e-97b4-a59c383c68f8/artwork/238ee2ad-b95f-4cf2-a1b3-188a449e21d4/version/0/format/jpg/dimension/width/size/350",
      author: "Denise Walentschka",
      prompt: "Butterfly shaped only by a flower meadow, white background",
      isLiked: false,
    },
    {
      id: 2,
      imageUrl: "https://firefly.adobe.com/generated/0B0xEZZrMd-RKA3j0GsZUHA.jpeg",
      author: "Ula Kuma",
      prompt: "Surreal portrait of the girl with wildflowers wreath, simple background, risograph printing",
      isLiked: true,
    },
    {
      id: 3,
      imageUrl: "https://firefly.adobe.com/generated/gqD_6xLxTDSszDGlaqfKIg.jpeg",
      author: "Andrius Cesekas",
      prompt: "Top-down, birds-eye view of a frogs body, fully visible from above. The frogs skin is covered in intricate, psychedelic patterns...",
      isLiked: true,
    },
    {
      id: 4,
      imageUrl: "https://firefly.adobe.com/generated/R1RQFyF7To-lTtOJg9Bdfg.jpeg",
      author: "Barb Bowman",
      prompt: "In the style of mosaic art, create an oil painting depicting two magnolia trees...",
      isLiked: true,
    },
  ];

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
          {galleryItems.map((item) => (
            <div key={item.id} className="group rounded-lg overflow-hidden bg-white shadow-md transition-all duration-300 hover:shadow-lg">
              <div className="relative aspect-square overflow-hidden">
                <Image
                  src={item.imageUrl}
                  alt={item.prompt}
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                  style={{ objectFit: "cover" }}
                  className="transition-transform duration-500 group-hover:scale-105"
                />
              </div>
              <div className="p-4">
                <div className="flex items-center mb-2">
                  <div className="w-6 h-6 rounded-full bg-gray-200 mr-2"></div>
                  <p className="text-sm font-medium text-gray-900">{item.author}</p>
                </div>
                <p className="text-sm text-gray-600 line-clamp-2 mb-3">{item.prompt}</p>
                <div className="flex justify-between items-center">
                  <button className="flex items-center text-gray-500 hover:text-gray-700">
                    {item.isLiked ? (
                      <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                    )}
                    <span className="ml-1 text-sm">Like</span>
                  </button>
                  <button className="text-sm text-blue-600 hover:text-blue-800">View</button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10 text-center">
          <Button variant="outline" className="rounded-full border-gray-300 hover:bg-gray-100">
            View full gallery
          </Button>
        </div>
      </div>
    </section>
  );
}
