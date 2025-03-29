import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";

export default function Hero() {
  return (
    <section className="relative w-full bg-gradient-to-r from-purple-50 to-blue-50 py-16">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute w-full h-full bg-[url('https://clio-assets.adobe.com/clio-playground/video-cache/homepage/webm/homepage-placeholder.webm')] bg-cover bg-center opacity-30"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-blue-500/5"></div>
      </div>

      <div className="relative max-w-screen-xl mx-auto px-4 text-center">
        <p className="text-blue-600 font-medium mb-2">Generate images, audio, and now video.</p>
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-10">Explore new ways to create</h1>

        <div className="max-w-2xl mx-auto mb-10">
          <Tabs defaultValue="image" className="w-full">
            <TabsList className="absolute -top-10 right-0 grid w-auto grid-cols-2 bg-transparent">
              <TabsTrigger value="image" className="text-sm font-medium">Image</TabsTrigger>
              <TabsTrigger value="video" className="text-sm font-medium">Video</TabsTrigger>
            </TabsList>
            <TabsContent value="image" className="w-full">
              <div className="flex w-full max-w-2xl mx-auto rounded-full bg-white shadow-lg overflow-hidden">
                <div className="hidden sm:flex items-center pl-4">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3ZM19 19H5V5H19V19ZM13.96 12.29L11.21 15.83L9.25 13.47L6.5 17H17.5L13.96 12.29Z" fill="#666666"/>
                  </svg>
                </div>
                <Input
                  type="text"
                  placeholder="Describe the image you want to generate"
                  className="flex-1 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 rounded-l-full"
                />
                <Button className="rounded-r-full bg-blue-600 hover:bg-blue-700 px-6">Generate</Button>
              </div>
            </TabsContent>
            <TabsContent value="video" className="w-full">
              <div className="flex w-full max-w-2xl mx-auto rounded-full bg-white shadow-lg overflow-hidden">
                <div className="hidden sm:flex items-center pl-4">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M17 10.5V7C17 6.45 16.55 6 16 6H4C3.45 6 3 6.45 3 7V17C3 17.55 3.45 18 4 18H16C16.55 18 17 17.55 17 17V13.5L21 17.5V6.5L17 10.5Z" fill="#666666"/>
                  </svg>
                </div>
                <Input
                  type="text"
                  placeholder="Describe the video you want to generate"
                  className="flex-1 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 rounded-l-full"
                />
                <Button className="rounded-r-full bg-blue-600 hover:bg-blue-700 px-6">Generate</Button>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Feature Quick Access Tabs */}
        <div className="flex flex-wrap justify-center gap-2">
          <Link href="/create/text">
            <Button variant="outline" className="rounded-full bg-white shadow-sm" size="sm">
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 17.25V21H6.75L17.81 9.94L14.06 6.19L3 17.25ZM20.71 7.05C21.1 6.66 21.1 6.02 20.71 5.63L18.37 3.29C17.98 2.9 17.34 2.9 16.95 3.29L15.88 4.36L19.64 8.12L20.71 7.05Z" fill="currentColor"/>
            </svg>
            Text
          </Button>
          </Link>
          <Link href="/create/image">
            <Button variant="outline" className="rounded-full bg-white shadow-sm" size="sm">
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3ZM19 19H5V5H19V19ZM13.96 12.29L11.21 15.83L9.25 13.47L6.5 17H17.5L13.96 12.29Z" fill="currentColor"/>
              </svg>
              Image
            </Button>
          </Link>
          <Link href="/create/video"> 
          <Button variant="outline" className="rounded-full bg-white shadow-sm" size="sm">
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M17 10.5V7C17 6.45 16.55 6 16 6H4C3.45 6 3 6.45 3 7V17C3 17.55 3.45 18 4 18H16C16.55 18 17 17.55 17 17V13.5L21 17.5V6.5L17 10.5Z" fill="currentColor"/>
            </svg>
            Video
          </Button>
          </Link>
          <Button variant="outline" className="rounded-full bg-white shadow-sm" size="sm">
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 3V13.55C11.41 13.21 10.73 13 10 13C7.79 13 6 14.79 6 17C6 19.21 7.79 21 10 21C12.21 21 14 19.21 14 17V7H18V3H12Z" fill="currentColor"/>
            </svg>
            Audio
          </Button>
          <Button variant="outline" className="rounded-full bg-white shadow-sm" size="sm">
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M9.4 16.6L4.8 12L9.4 7.4L8 6L2 12L8 18L9.4 16.6ZM14.6 16.6L19.2 12L14.6 7.4L16 6L22 12L16 18L14.6 16.6Z" fill="currentColor"/>
            </svg>
            Vector
          </Button>
        </div>
      </div>
    </section>
  );
}
