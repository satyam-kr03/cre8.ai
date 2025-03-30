import FeatureCard from "@/components/cards/FeatureCard";

export default function FeaturesGrid() {
  const features = [
    {
      title: "Image to Ghibli",
      description: "Generate a Ghibli-style animation from an image.",
      imageSrc: "https://ext.same-assets.com/426488002/2216797986.bin",
      alt: "Text to image feature",
      link: "/create/ghibli",
    },
    {
      title: "Generative fill",
      description: "Use a brush to remove objects or paint in new ones.",
      imageSrc: "https://ext.same-assets.com/426488002/581310823.bin",
      alt: "Generative fill feature",
      link: "/",
    },
    {
      title: "Scene to image (beta)",
      description: "Create captivating images using 3D shapes.",
      imageSrc: "https://ext.same-assets.com/426488002/3214720549.bin",
      badge: "New",
      alt: "Scene to image feature",
      link: "/",
    },
  ];

  return (
    <section className="bg-gray-50 py-16">
      <div className="max-w-screen-xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <FeatureCard
              key={index}
              title={feature.title}
              description={feature.description}
              imageSrc={feature.imageSrc}
              badge={feature.badge}
              alt={feature.alt}
              link={feature.link}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
