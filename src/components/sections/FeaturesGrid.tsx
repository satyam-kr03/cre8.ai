import FeatureCard from "@/components/cards/FeatureCard";

export default function FeaturesGrid() {
  const features = [
    {
      title: "Image to Anime Character",
      description: "Generate a Anime Character from an image.",
      imageSrc: "/images/template2.png",
      alt: "Text to image feature",
      link: "/create/anime",
    },
    {
      title: "Image to Pixar",
      description: "Generate a Pixar style image from an image.",
      imageSrc: "/images/template1.jpeg",
      alt: "Generative fill feature",
      link: "/create/pixar",
    },
    {
      title: "Image to Sound Effects",
      description: "Create sound effects from images.",
      imageSrc: "/images/template3.jpg",
      badge: "New",
      alt: "Image to sound effects feature",
      link: "/create/sound-effects",
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
