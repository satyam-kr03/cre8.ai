"use client";
import React, { useState, useEffect } from 'react';
import Header from "@/components/layout/Header";
import ImageUploader from "@/components/ui/ImageUploader";
import Image from "next/image";
import { Slider } from '@/components/ui/slider';
import AIPromptButton from "@/components/ui/AIPromptButton";
import { cleanPromptText } from "@/lib/textUtils";
import { Button } from '@/components/ui/button';

// Define interface for uploaded files
interface UploadedFile extends File {
    name: string;
    type: string;
    preview?: string;
}

// Interfaces for Gemini API Request (copied from text/image)
const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
interface TextPart {
    text: string;
}
interface ImagePart {
    inline_data: {
        mime_type: string;
        data: string;
    };
}
type ContentPart = TextPart | ImagePart;
interface GeminiRequestContent {
    parts: ContentPart[];
}
interface GeminiRequest {
    contents: GeminiRequestContent[];
    generation_config: {
        temperature: number;
        max_output_tokens: number;
    };
}

const AnimeGenerator = () => {
    const [prompt, setPrompt] = useState("");
    const [isGenerating, setIsGenerating] = useState(false);
    const [uploadedImage, setUploadedImage] = useState<UploadedFile | null>(null);
    const [generatedImage, setGeneratedImage] = useState<string | null>(null);
    const [isMobile, setIsMobile] = useState(false);
    const [strength, setStrength] = useState(0.8); 
    const [imageDimension, setImageDimension] = useState("LANDSCAPE"); // SQUARE | LANDSCAPE
    const [isGeneratingDesc, setIsGeneratingDesc] = useState(false);

    useEffect(() => {
        const checkIsMobile = () => {
            setIsMobile(window.innerWidth < 640);
        };
        checkIsMobile();
        window.addEventListener('resize', checkIsMobile);
        return () => window.removeEventListener('resize', checkIsMobile);
    }, []);

    const getBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = error => reject(error);
        });
    };

    const handleImageUpload = (file: UploadedFile) => {
        setUploadedImage(file);
        setGeneratedImage(null); // Clear previous result when new image is uploaded
    };

    // Function to generate prompt from image using Gemini
    const generateAIDescription = async () => {
        if (!uploadedImage) return;
        
        try {
            setIsGeneratingDesc(true);
            
            const imageBase64 = await getBase64(uploadedImage);
            const base64Data = imageBase64.split(',')[1];
            
            // Prepare the request for Gemini API
            const requestData: GeminiRequest = {
                contents: [
                    {
                        parts: [
                            { text: "Analyze this image. Describe its key elements, mood, and composition. Generate a short, evocative prompt suitable for transforming this image into a Anime-inspired art style, focusing on atmosphere and charm." } as TextPart,
                            {
                                inline_data: {
                                    mime_type: uploadedImage.type,
                                    data: base64Data
                                }
                            } as ImagePart
                        ]
                    }
                ],
                generation_config: {
                    temperature: 0.7,
                    max_output_tokens: 150 // Shorter prompt for Anime style
                }
            };
            
            console.log("Sending image to Gemini for Anime prompt generation...");
            
            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(requestData),
                }
            );
            
            const data = await response.json();
            console.log("API Response for image analysis:", data);
            
            if (!data.candidates || !data.candidates[0] || !data.candidates[0].content || !data.candidates[0].content.parts) {
                console.error("Unexpected API response format:", data);
                
                if (data.error) {
                    console.error("API Error:", data.error.message || data.error);
                    alert(`Error: ${data.error.message || "Failed to analyze image"}`);
                } else {
                    alert("Failed to analyze image. Check console for details.");
                }
                return;
            }
            
            const generatedPrompt = data.candidates[0].content.parts[0].text;
            console.log("Generated Anime prompt from image:", generatedPrompt);
            
            const cleanedText = cleanPromptText(generatedPrompt);
            setPrompt(cleanedText);
        } catch (error) {
            console.error('Error generating description:', error);
            alert("An error occurred while generating the description.");
        } finally {
            setIsGeneratingDesc(false);
        }
    };

    const generateGhibliImage = async () => {
        // This generation requires an uploaded image
        if (!uploadedImage) {
            alert("Please upload an image first to generate a Anime-style version.");
            return;
        }
        
        try {
            setIsGenerating(true);
            setGeneratedImage(null);
            
            const imageBase64 = await getBase64(uploadedImage);
            const base64Data = imageBase64.split(',')[1];
                
            const requestBody = {
                endpoint: 'img2ghibli', // Specify the correct endpoint
                prompt: prompt, // Optional prompt
                init_image: base64Data, // The uploaded image is required
                strength: strength,
                size: imageDimension
            };
            
            console.log('Sending request to generate Anime image...');
            
            // Call our proxy API route
            const response = await fetch('/api/imageproxy', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody),
            });
            
            console.log('Received response with status:', response.status);
            const contentType = response.headers.get('Content-Type');
            console.log('Response content type:', contentType);
            
            if (!response.ok) {
                let errorMessage = `API returned status: ${response.status}`;
                try {
                    const errorData = await response.json();
                    if (errorData.error) {
                        errorMessage = errorData.error;
                    }
                } catch (e) {
                    console.error('Could not parse error response as JSON');
                }
                throw new Error(errorMessage);
            }
            
            // The proxy returns the image as base64 in a JSON response
            const data = await response.json();
            console.log('Response data keys:', Object.keys(data));
            
            // Expecting image data under 'image' key from the proxy
            if (!data.image) {
                console.error('Missing image data in response:', data);
                throw new Error("No image data returned from API proxy");
            }
            
            // Convert base64 back to blob and create URL
            try {
                // Assume PNG or allow any image type from proxy contentType
                const imageBlob = await fetch(`data:${data.contentType || 'image/png'};base64,${data.image}`).then(r => r.blob());
                const imageUrl = URL.createObjectURL(imageBlob);
                setGeneratedImage(imageUrl);
                console.log('Successfully created Anime image URL');
            } catch (e) {
                console.error('Error creating image from base64:', e);
                throw new Error('Failed to process the generated image');
            }
            
        } catch (error) {
            console.error('Error generating Anime image:', error);
            alert("An error occurred while generating the Anime image: " + (error instanceof Error ? error.message : String(error)));
        } finally {
            setIsGenerating(false);
        }
    };

    const handleAddToGallery = async () => {
        if (!generatedImage) {
            console.error("No generated image to add to gallery");
            return;
        }
        
        try {
            // Show loading state
            setIsGenerating(true);
            
            // Convert blob URL to base64 data
            const response = await fetch(generatedImage);
            const blob = await response.blob();
            
            // Convert blob to base64
            const reader = new FileReader();
            const base64Promise = new Promise<string>((resolve) => {
                reader.onloadend = () => {
                    // Get the base64 data part (remove the data:image/png;base64, prefix)
                    const base64data = reader.result as string;
                    const base64Content = base64data.split(',')[1];
                    resolve(base64Content);
                };
            });
            reader.readAsDataURL(blob);
            
            const base64Content = await base64Promise;
            
            // Prepare the gallery item data
            const galleryData = {
                type: 'Image',
                prompt: prompt,
                contentData: base64Content,
                contentType: blob.type || 'image/png',
                settings: {
                    styleType: 'Anime',
                    strength: strength,
                    imageDimension: imageDimension
                }
            };
            
            // Send to the API
            const saveResponse = await fetch('/api/gallery', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(galleryData)
            });
            
            if (!saveResponse.ok) {
                const errorData = await saveResponse.json();
                throw new Error(errorData.error || 'Failed to save to gallery');
            }
            
            const result = await saveResponse.json();
            console.log('Successfully added to gallery:', result);
            
            // Show success message
            alert('Successfully added to your gallery!');
        } catch (error) {
            console.error('Error adding to gallery:', error);
            alert('Error adding to gallery: ' + (error instanceof Error ? error.message : String(error)));
        } finally {
            setIsGenerating(false);
        }
    };

    const downloadImage = async () => {
        if (!generatedImage) return;
        
        try {
            const response = await fetch(generatedImage);
            const blob = await response.blob();
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            // Try to determine extension from blob type, default to png
            const extension = blob.type.split('/')[1] || 'png';
            link.download = `ghibli-style-${timestamp}.${extension}`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href);
        } catch (error) {
            console.error('Error downloading image:', error);
            alert('Failed to download the image.');
        }
    };

    // Cleanup function for the generated image URL
    useEffect(() => {
        return () => {
            if (generatedImage) {
                URL.revokeObjectURL(generatedImage);
            }
        };
    }, [generatedImage]);

    return (
        <div className="flex flex-col min-h-screen bg-white text-gray-800">
            <Header />
            <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
                {/* Sidebar */}
                <div className="w-full md:w-[300px] bg-gray-50 p-5 overflow-y-auto border-r border-gray-200">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="mr-2 text-blue-600">
                                 {/* Anime-esque icon (simple leaf or tree) */}
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4 11h-3v3a1 1 0 11-2 0v-3H8a1 1 0 110-2h3V8a1 1 0 112 0v3h3a1 1 0 110 2z" fill="currentColor" opacity="0.3" />
                                <path d="M12 4c-4.41 0-8 3.59-8 8s3.59 8 8 8 8-3.59 8-8-3.59-8-8-8zm0 14c-3.31 0-6-2.69-6-6s2.69-6 6-6 6 2.69 6 6-2.69 6-6 6zm-1-7V8a1 1 0 012 0v3h3a1 1 0 010 2h-3v3a1 1 0 01-2 0v-3H8a1 1 0 010-2h3z" fill="currentColor"/>
                            </svg>
                            <span className="font-medium">Input Image</span>
                        </div>
                    </div>

                    <ImageUploader 
                        onImageUpload={handleImageUpload}
                        uploadedImage={uploadedImage}
                        className="rounded-xl overflow-hidden shadow-sm border border-gray-200 mb-4"
                    />
                    
                    {/* Generation Controls */}
                    <div className="space-y-5">
                        <h2 className="text-lg font-semibold text-gray-800 mb-3">Anime Style Settings</h2>
                        
                        {/* Strength Control */}
                        <div className="p-4 bg-white rounded-xl shadow-sm border border-gray-200">
                            <h3 className="font-medium mb-3 text-gray-800 flex items-center">
                                <svg className="w-4 h-4 mr-2 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                Strength
                            </h3>
                            <div className="flex flex-col space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-gray-500">Subtle Change</span>
                                    <span className="text-xs text-gray-500">Strong Effect</span>
                                </div>
                                <Slider 
                                    defaultValue={[strength]} 
                                    min={0.1} 
                                    max={1} 
                                    step={0.05} 
                                    onValueChange={(value: number[]) => setStrength(value[0])}
                                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                />
                                <div className="text-xs font-medium text-blue-600 text-right">
                                    {strength.toFixed(2)}
                                </div>
                            </div>
                        </div>

                        {/* Image Dimensions Control */}
                        <div className="p-4 bg-white rounded-xl shadow-sm border border-gray-200">
                            <h3 className="font-medium mb-3 text-gray-800 flex items-center">
                                <svg className="w-4 h-4 mr-2 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                                </svg>
                                Image Dimensions
                            </h3>
                            <div className="grid grid-cols-2 gap-3">
                                <div className={`relative border rounded-lg p-3 ${imageDimension === "SQUARE" ? "border-blue-500 bg-blue-50" : "border-gray-200"} transition-all cursor-pointer`}
                                    onClick={() => setImageDimension("SQUARE")}>
                                    <input 
                                        type="radio" 
                                        id="square" 
                                        name="dimension" 
                                        value="SQUARE"
                                        checked={imageDimension === "SQUARE"}
                                        onChange={(e) => setImageDimension(e.target.value)}
                                        className="sr-only" 
                                    />
                                    <label htmlFor="square" className="text-sm flex flex-col items-center cursor-pointer">
                                        <div className="w-12 h-12 bg-gray-100 border border-gray-300 mb-1 rounded-md"></div>
                                        <span className={imageDimension === "SQUARE" ? "text-blue-600 font-medium" : "text-gray-600"}>Square</span>
                                        <span className="text-xs text-gray-500">640×640</span>
                                    </label>
                                    {imageDimension === "SQUARE" && (
                                        <div className="absolute top-2 right-2 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                        </div>
                                    )}
                                </div>
                                <div className={`relative border rounded-lg p-3 ${imageDimension === "LANDSCAPE" ? "border-blue-500 bg-blue-50" : "border-gray-200"} transition-all cursor-pointer`}
                                    onClick={() => setImageDimension("LANDSCAPE")}>
                                    <input 
                                        type="radio" 
                                        id="landscape" 
                                        name="dimension" 
                                        value="LANDSCAPE"
                                        checked={imageDimension === "LANDSCAPE"}
                                        onChange={(e) => setImageDimension(e.target.value)}
                                        className="sr-only" 
                                    />
                                    <label htmlFor="landscape" className="text-sm flex flex-col items-center cursor-pointer">
                                        <div className="w-14 h-10 bg-gray-100 border border-gray-300 mb-1 rounded-md"></div>
                                        <span className={imageDimension === "LANDSCAPE" ? "text-blue-600 font-medium" : "text-gray-600"}>Landscape</span>
                                        <span className="text-xs text-gray-500">1280×640</span>
                                    </label>
                                    {imageDimension === "LANDSCAPE" && (
                                        <div className="absolute top-2 right-2 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 flex flex-col p-5 overflow-y-auto bg-gray-50">
                    {isGenerating ? (
                        <div className="flex-1 flex flex-col items-center justify-center">
                            <div className="relative w-full h-[calc(100vh-340px)] min-h-[300px] max-h-[60vh] rounded-xl overflow-hidden shadow-md bg-gray-200 flex items-center justify-center">
                                <div className="absolute inset-0 bg-gradient-to-r from-blue-100/50 via-purple-100/50 to-pink-100/50 animate-gradient bg-300% shadow-[0_0_30px_rgba(192,132,252,0.3)]"></div>
                                <div className="z-10 flex flex-col items-center">
                                    <div className="w-12 h-12 rounded-full border-4 border-t-blue-500 border-r-transparent border-b-purple-500 border-l-transparent animate-spin mb-4"></div>
                                    <div className="text-xl sm:text-2xl font-bold text-gray-800 text-center px-4">Generating Anime style...</div>
                                    <div className="text-sm text-gray-600 mt-2">This may take a moment</div>
                                </div>
                            </div>
                        </div>
                    ) : !generatedImage ? (
                        <div className="flex-1 flex flex-col items-center justify-center">
                            <div className="w-24 h-24 sm:w-28 sm:h-28 opacity-50 mb-4">
                                {/* Anime-esque Placeholder Icon */}
                                <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-blue-400">
                                    <path d="M50 95C74.8528 95 95 74.8528 95 50C95 25.1472 74.8528 5 50 5C25.1472 5 5 25.1472 5 50C5 74.8528 25.1472 95 50 95Z" stroke="currentColor" stroke-width="4"/>
                                    <path d="M50 25V75M25 50H75" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>
                                    <circle cx="50" cy="50" r="10" fill="currentColor" opacity="0.5"/>
                                </svg>
                            </div>
                            <h1 className="text-2xl sm:text-3xl font-bold mb-4 text-center text-gray-800">Anime Style Image Generator</h1>
                            <p className="text-center text-gray-600 max-w-xl mb-8 px-4">
                                Upload an image and transform it into the charming Anime art style.
                            </p>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center">
                            <div className="relative w-full h-[calc(100vh-340px)] min-h-[300px] max-h-[60vh] rounded-xl overflow-hidden shadow-sm border border-gray-100 bg-gray-100 flex items-center justify-center">
                                <Image 
                                    src={generatedImage}
                                    alt={prompt || 'Generated Anime style image'}
                                    fill
                                    className="object-contain"
                                    sizes="(max-width: 768px) 100vw, 80vw"
                                    priority
                                />
                            </div>
                            <div className="flex gap-2 mt-2 mb-2">
                                <button 
                                    onClick={downloadImage}
                                    className="flex items-center gap-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors font-medium shadow-sm"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                                    Save Image
                                </button>
                                {/* Add to Gallery Button */}
                                <Button 
                                    variant="outline"
                                    size="sm"
                                    className="flex items-center gap-1 text-sm border-gray-300 hover:bg-gray-100"
                                    onClick={handleAddToGallery}
                                >
                                     <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                     </svg>
                                    Add to Gallery
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Prompt Input (Optional for Anime) */}
                    <div className="relative mt-auto">
                        <div className="relative border border-gray-300 rounded-xl bg-white overflow-hidden shadow-sm">
                           <div className="pt-3 px-4 text-xs text-gray-500 relative z-10 flex items-center">
                                <svg className="w-3 h-3 mr-1 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                Prompt (Optional)
                            </div>
                            <textarea
                                placeholder="Add an optional prompt to guide the style..."
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                className={`w-full bg-transparent p-4 pt-1 outline-none resize-none h-28 relative z-10 text-gray-800`}
                            />
                        </div>
                        <div className="absolute right-4 bottom-4 flex items-center gap-2 z-20">
                            {/* AI Prompt Button */}
                             <AIPromptButton
                                onClick={generateAIDescription}
                                disabled={isGeneratingDesc || isGenerating || !uploadedImage}
                                isGenerating={isGeneratingDesc}
                                size={isMobile ? 'sm' : 'md'}
                                tooltipText={!uploadedImage ? "Upload an image first" : "Generate prompt from image"}
                            />
                             {/* Generate Button */}
                             <button 
                                className={`px-3 py-1.5 sm:px-4 sm:py-2 text-sm sm:text-base rounded-lg font-medium text-white flex items-center gap-1 ${isGenerating ? 'bg-purple-500 animate-pulse' : 'bg-blue-600 hover:bg-blue-700 transition-colors'} relative group`}
                                onClick={generateGhibliImage}
                                disabled={isGenerating || isGeneratingDesc || !uploadedImage}
                                key={`gen-button-${!uploadedImage ? 'no-img' : 'img'}`}
                            >
                                {isGenerating ? (
                                    <>
                                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                        Generating...
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                             {/* Anime-style icon */}
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 14.828a4 4 0 11-5.656-5.656 4 4 0 015.656 5.656zM14.828 19.428a4 4 0 11-5.656-5.656 4 4 0 015.656 5.656zM9.172 14.828a4 4 0 11-5.657-5.656 4 4 0 015.657 5.656z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 21a9 9 0 110-18 9 9 0 010 18z" opacity="0.5"/>
                                        </svg>
                                        Generate Anime Style
                                    </>
                                )}
                                {!uploadedImage && (
                                    <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-white border border-gray-200 text-gray-800 text-xs px-2 py-1 rounded shadow-sm opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                                        Upload an image first
                                    </div>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AnimeGenerator;