"use client";

import React, { useState, useEffect } from 'react';
import Header from '@/components/layout/Header';
import { useAuth } from '@clerk/nextjs';
import AuthCheck from '@/components/auth/AuthCheck';
import Image from 'next/image';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Define types for gallery items
interface GalleryItem {
  _id: string;
  type: string;
  prompt: string;
  contentData: string;
  contentType: string;
  createdAt: string;
  settings?: Record<string, any>;
  negativePrompt?: string;
}

export default function GalleryPage() {
  const { userId } = useAuth();
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('all');

  // Fetch gallery items when the component mounts
  useEffect(() => {
    const fetchGalleryItems = async () => {
      if (!userId) return;
      
      try {
        setLoading(true);
        const response = await fetch('/api/gallery');
        
        if (!response.ok) {
          throw new Error(`Failed to fetch gallery items: ${response.status}`);
        }
        
        const data = await response.json();
        setItems(data.items || []);
      } catch (err) {
        console.error('Error fetching gallery items:', err);
        setError('Failed to load your gallery items. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchGalleryItems();
  }, [userId]);

  // Filter items based on active tab
  const filteredItems = activeTab === 'all' 
    ? items 
    : items.filter(item => item.type.toLowerCase() === activeTab.toLowerCase());

  // Function to render different content types
  const renderContent = (item: GalleryItem) => {
    const contentUrl = `data:${item.contentType};base64,${item.contentData}`;
    
    if (item.contentType.startsWith('image/')) {
      return (
        <div className="relative w-full h-48 rounded-lg overflow-hidden">
          <Image 
            src={contentUrl}
            alt={item.prompt}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 30vw"
          />
        </div>
      );
    } else if (item.contentType.startsWith('audio/')) {
      return (
        <div className="w-full">
          <audio 
            controls 
            className="w-full"
            src={contentUrl}
          >
            Your browser does not support the audio element.
          </audio>
        </div>
      );
    } else {
      return (
        <div className="bg-gray-100 rounded-lg p-4 flex items-center justify-center h-48">
          <p className="text-gray-500">Unsupported content type</p>
        </div>
      );
    }
  };

  // Function to format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <AuthCheck>
      <div className="min-h-screen bg-gray-50">
        <Header />
        
        <main className="max-w-7xl mx-auto p-4 pt-8">
          <h1 className="text-3xl font-bold mb-6 text-gray-800">Your Gallery</h1>
          
          <Tabs defaultValue="all" onValueChange={setActiveTab}>
            <TabsList className="mb-6">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="image">Images</TabsTrigger>
              <TabsTrigger value="ghibli">Ghibli</TabsTrigger>
              <TabsTrigger value="animation">Animations</TabsTrigger>
              <TabsTrigger value="speech">Audio (Speech)</TabsTrigger>
              <TabsTrigger value="music">Audio (Music)</TabsTrigger>
            </TabsList>
            
            <TabsContent value={activeTab}>
              {loading ? (
                <div className="flex justify-center items-center h-64">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                </div>
              ) : error ? (
                <div className="bg-red-50 p-4 rounded-lg text-red-600">
                  {error}
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="text-center p-10 bg-white rounded-lg shadow-sm">
                  <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-gray-600 mb-2">No items found</p>
                  <p className="text-gray-500 text-sm">
                    {activeTab === 'all' 
                      ? "Your gallery is empty. Start creating and saving your works!"
                      : `You don't have any ${activeTab} items yet. Create some and add them to your gallery!`}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredItems.map((item) => (
                    <div key={item._id} className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200">
                      {renderContent(item)}
                      
                      <div className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                            {item.type}
                          </span>
                          <span className="text-xs text-gray-500">
                            {formatDate(item.createdAt)}
                          </span>
                        </div>
                        
                        <p className="text-sm text-gray-700 line-clamp-3 mb-2">
                          {item.prompt}
                        </p>
                        
                        {item.negativePrompt && (
                          <p className="text-xs text-gray-500 line-clamp-2 mb-1">
                            <span className="font-medium">Negative prompt:</span> {item.negativePrompt}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </AuthCheck>
  );
} 