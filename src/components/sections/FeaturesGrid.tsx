import FeatureCard from "@/components/cards/FeatureCard";

export default function FeaturesGrid() {
  const features = [
    {
      title: "Text to image",
      description: "Generate high-quality images from a detailed description.",
      imageSrc: "https://ext.same-assets.com/426488002/2216797986.bin",
      alt: "Text to image feature",
    },
    {
      title: "Generative fill",
      description: "Use a brush to remove objects or paint in new ones.",
      imageSrc: "https://ext.same-assets.com/426488002/581310823.bin",
      alt: "Generative fill feature",
    },
    {
      title: "Scene to image (beta)",
      description: "Create captivating images using 3D shapes.",
      imageSrc: "https://ext.same-assets.com/426488002/3214720549.bin",
      badge: "New",
      alt: "Scene to image feature",
    },
    {
      title: "Generative expand",
      description: "Expand images and use a brush to remove objects, or paint in new ones.",
      imageSrc: "https://ext.same-assets.com/426488002/1739378117.bin",
      alt: "Generative expand feature",
    },
    {
      title: "Text effects",
      description: "Apply styles and texture to your text with a short prompt.",
      imageSrc: "https://ext.same-assets.com/426488002/4151473362.bin",
      alt: "Text effects feature",
    },
    {
      title: "Generate template",
      description: "Create editable templates from a text description.",
      imageSrc: "https://ext.same-assets.com/426488002/3453246055.bin",
      alt: "Generate template feature",
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
            />
          ))}
        </div>
      </div>
    </section>
  );
}
