import Image from "next/image";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface FeatureCardProps {
  title: string;
  description: string;
  imageSrc: string;
  badge?: string;
  alt: string;
}

export default function FeatureCard({ title, description, imageSrc, badge, alt }: FeatureCardProps) {
  return (
    <Card className="overflow-hidden border-gray-200 transition-shadow hover:shadow-md">
      <div className="relative h-48 w-full overflow-hidden">
        <Image
          src={imageSrc}
          alt={alt}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          style={{ objectFit: "cover" }}
          className="transition-transform duration-300 hover:scale-105"
        />
        {badge && (
          <div className="absolute top-3 right-3 bg-black/80 text-white text-xs px-2 py-1 rounded">
            {badge}
          </div>
        )}
      </div>
      <CardHeader className="pb-2 pt-4">
        <CardTitle className="text-lg font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent className="pb-3">
        <CardDescription className="text-sm text-gray-600">{description}</CardDescription>
      </CardContent>
      <CardFooter className="pt-0">
        <Button variant="ghost" size="sm" className="px-0">
          <span>Try now</span>
          <svg
            className="ml-1 h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M8.59 16.59L13.17 12L8.59 7.41L10 6L16 12L10 18L8.59 16.59Z" fill="currentColor" />
          </svg>
        </Button>
      </CardFooter>
    </Card>
  );
}
