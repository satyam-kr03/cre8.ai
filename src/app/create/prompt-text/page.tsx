"use client";
import React, { useState, useEffect } from 'react';
import Header from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { cleanPromptText } from "@/lib/textUtils";
import AIPromptButton from "@/components/ui/AIPromptButton";
import ImageUploader from "@/components/ui/ImageUploader";
import Image from "next/image";
import { InferenceClient } from "@huggingface/inference";

const API_KEY = process.env.NEXT_PUBLIC_API_KEY;
const HF_API_KEY = process.env.NEXT_PUBLIC_HF_API_KEY;

interface UploadedFile extends File {
    name: string;
    type: string;
    preview?: string;
}

const PromptTextGenerator = () => {
    const [prompt, setPrompt] = useState("");
    const [generatedText, setGeneratedText] = useState("");
    const [isGenerating, setIsGenerating] = useState(false);
    const [isGeneratingImage, setIsGeneratingImage] = useState(false);
    const [uploadedImage, setUploadedImage] = useState<UploadedFile | null>(null);
    const [generatedImage, setGeneratedImage] = useState<string | null>(null);
    const [isMobile, setIsMobile] = useState(false);
    const [showSidebar, setShowSidebar] = useState(true);

    // Handle window resize and set mobile state
    useEffect(() => {
        const checkIsMobile = () => {
            const mobile = window.innerWidth < 768;
            setIsMobile(mobile);
            setShowSidebar(!mobile);
        };
        
        // Set initial value
        checkIsMobile();
        
        // Add event listener
        window.addEventListener('resize', checkIsMobile);
        
        // Cleanup
        return () => window.removeEventListener('resize', checkIsMobile);
    }, []);

    // Cleanup function for the generated image URL to prevent memory leaks
    useEffect(() => {
        return () => {
            if (generatedImage) {
                URL.revokeObjectURL(generatedImage);
            }
        };
    }, [generatedImage]);

    const generateAIText = async () => {
        if (!prompt.trim()) return;
        
        try {
            setIsGenerating(true);
            
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // In a real app, you would make an API call here
            const sampleResponse = "Here's a creative text based on your request: " + 
                                   "The moonlight cascaded through the ancient windows, casting elongated shadows " +
                                   "across the marble floor. As the clock struck midnight, the forgotten manuscripts " +
                                   "began to whisper their secrets.";
            
            // Clean the text using our utility function
            const cleanedText = cleanPromptText(sampleResponse);
            
            setGeneratedText(cleanedText);
        } catch (error) {
            console.error('Error generating text:', error);
            alert("An error occurred while generating text.");
        } finally {
            setIsGenerating(false);
        }
    };

    const generateIdeas = async () => {
        try {
            setIsGenerating(true);
            
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            // In a real app, you would make an API call here
            const samplePrompt = "Create a short story about a time traveler who discovers their actions in the past created the future they were trying to prevent.";
            
            setPrompt(samplePrompt);
        } catch (error) {
            console.error('Error generating ideas:', error);
            alert("An error occurred while generating ideas.");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleImageUpload = (file: UploadedFile) => {
        setUploadedImage(file);
    };

    const generateImage = async () => {
        if (!prompt.trim()) return;
        
        try {
            setIsGeneratingImage(true);
            setGeneratedImage(null);
            
            const client = new InferenceClient(HF_API_KEY);
            
            const image = await client.textToImage({
                provider: "hf-inference",
                model: "black-forest-labs/FLUX.1-dev",
                inputs: prompt,
                parameters: { num_inference_steps: 25 },
            });
            
            // Convert the blob to a data URL for display
            const imageUrl = URL.createObjectURL(image);
            setGeneratedImage(imageUrl);
            
        } catch (error) {
            console.error('Error generating image:', error);
            alert("An error occurred while generating the image.");
        } finally {
            setIsGeneratingImage(false);
        }
    };

    return (
        <div className="flex flex-col min-h-screen bg-white text-gray-800">
            <Header />
            <div className="relative flex flex-col md:flex-row flex-1 overflow-hidden">
                {/* Mobile toggle for sidebar */}
                <button 
                    className="md:hidden flex items-center justify-center p-3 m-2 bg-gray-200 rounded-md hover:bg-gray-300"
                    onClick={() => setShowSidebar(!showSidebar)}
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" fill="currentColor" />
                    </svg>
                    <span className="ml-2">{showSidebar ? 'Hide Options' : 'Show Options'}</span>
                </button>
                
                {/* Sidebar */}
                <div className={`${showSidebar ? 'block' : 'hidden'} w-full md:w-[280px] bg-gray-100 p-4 overflow-y-auto md:block border-r border-gray-200`}>
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="mr-2">
                                <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" fill="currentColor" />
                            </svg>
                            <span>Options</span>
                        </div>
                    </div>
                    
                    {/* Reference Image Section */}
                    <div className="mb-6">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="mr-2">
                                    <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" />
                                    <path d="M9 12H15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                    <path d="M12 9L12 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                </svg>
                                <span>Reference Image</span>
                            </div>
                        </div>

                        <ImageUploader 
                            onImageUpload={handleImageUpload}
                            uploadedImage={uploadedImage}
                            className="mt-2"
                        />
                    </div>
                    
                    <div className="space-y-4">
                        <div className="p-3 bg-white rounded-lg shadow-sm border border-gray-200">
                            <h3 className="font-medium mb-2">Writing Style</h3>
                            <div className="space-y-2">
                                <div className="flex items-center">
                                    <input type="radio" id="creative" name="style" className="mr-2" defaultChecked />
                                    <label htmlFor="creative">Creative</label>
                                </div>
                                <div className="flex items-center">
                                    <input type="radio" id="formal" name="style" className="mr-2" />
                                    <label htmlFor="formal">Formal</label>
                                </div>
                                <div className="flex items-center">
                                    <input type="radio" id="casual" name="style" className="mr-2" />
                                    <label htmlFor="casual">Casual</label>
                                </div>
                            </div>
                        </div>
                        
                        <div className="p-3 bg-white rounded-lg shadow-sm border border-gray-200">
                            <h3 className="font-medium mb-2">Length</h3>
                            <div className="space-y-2">
                                <div className="flex items-center">
                                    <input type="radio" id="short" name="length" className="mr-2" defaultChecked />
                                    <label htmlFor="short">Short</label>
                                </div>
                                <div className="flex items-center">
                                    <input type="radio" id="medium" name="length" className="mr-2" />
                                    <label htmlFor="medium">Medium</label>
                                </div>
                                <div className="flex items-center">
                                    <input type="radio" id="long" name="length" className="mr-2" />
                                    <label htmlFor="long">Long</label>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 flex flex-col p-4 overflow-y-auto bg-gray-50">
                    <h1 className="text-xl sm:text-2xl font-bold mb-4 text-gray-800">Prompt Text Generator</h1>
                    
                    {/* Prompt Input */}
                    <div className="relative mb-4">
                        <div className="relative border border-gray-300 rounded-lg bg-white overflow-hidden shadow-sm">
                            {/* Animated background that shows when generating */}
                            <div className={`absolute inset-0 blur-md ${
                                isGenerating 
                                ? 'bg-gradient-to-r from-blue-100 via-purple-100 to-pink-100 animate-gradient bg-300% shadow-[0_0_30px_rgba(192,132,252,0.3)]' 
                                : ''
                            }`} />
                            
                            <div className="pt-3 px-4 text-xs text-gray-500 relative z-10">Prompt</div>
                            <textarea
                                placeholder="Describe what you want to generate"
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                className={`w-full bg-transparent p-4 outline-none resize-none h-20 relative z-10 ${
                                    isGenerating 
                                    ? 'bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent bg-300% animate-gradient font-bold' 
                                    : 'text-gray-800'
                                }`}
                            />
                        </div>

                        <div className="absolute right-4 bottom-4 flex flex-wrap items-center gap-2 z-20">
                            <AIPromptButton
                                onClick={generateIdeas}
                                disabled={isGenerating || isGeneratingImage}
                                isGenerating={isGenerating}
                                tooltipText="Generate Prompt Ideas"
                                size={isMobile ? 'sm' : 'md'}
                            />
                            <div className="flex flex-wrap gap-2 mt-1 sm:mt-0">
                                <button 
                                    className={`px-2 py-1 sm:px-4 sm:py-2 text-xs sm:text-sm rounded-lg font-medium text-white ${
                                        isGenerating 
                                        ? 'bg-purple-500 animate-pulse' 
                                        : 'bg-blue-600 hover:bg-blue-700 transition-colors'
                                    }`}
                                    onClick={generateAIText}
                                    disabled={isGenerating || isGeneratingImage || !prompt.trim()}
                                >
                                    {isMobile ? 'Text' : isGenerating ? 'Generating...' : 'Generate Text'}
                                </button>
                                <button 
                                    className={`px-2 py-1 sm:px-4 sm:py-2 text-xs sm:text-sm rounded-lg font-medium text-white ${
                                        isGeneratingImage 
                                        ? 'bg-purple-500 animate-pulse' 
                                        : 'bg-green-600 hover:bg-green-700 transition-colors'
                                    }`}
                                    onClick={generateImage}
                                    disabled={isGenerating || isGeneratingImage || !prompt.trim()}
                                >
                                    {isMobile ? 'Image' : isGeneratingImage ? 'Generating...' : 'Generate Image'}
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    {/* Generated Content */}
                    {generatedText && (
                        <div className="border border-gray-300 rounded-lg bg-white p-4 mt-4 shadow-sm">
                            <div className="text-xs text-gray-500 mb-2">Generated Text</div>
                            <div className="whitespace-pre-wrap text-gray-800">
                                {generatedText}
                            </div>
                        </div>
                    )}
                    
                    {/* Generated Image */}
                    {isGeneratingImage ? (
                        <div className="border border-gray-300 rounded-lg bg-white p-4 mt-4 shadow-sm">
                            <div className="text-xs text-gray-500 mb-2">Generated Image</div>
                            <div className="relative w-full h-48 sm:h-64 md:h-80 overflow-hidden rounded bg-gray-200 flex items-center justify-center">
                                <div className="absolute inset-0 bg-gradient-to-r from-blue-100/50 via-purple-100/50 to-pink-100/50 animate-gradient bg-300% shadow-[0_0_30px_rgba(192,132,252,0.3)]"></div>
                                <div className="z-10 text-lg sm:text-xl font-bold text-gray-800 text-center px-4">Generating image...</div>
                            </div>
                        </div>
                    ) : generatedImage && (
                        <div className="border border-gray-300 rounded-lg bg-white p-4 mt-4 shadow-sm">
                            <div className="text-xs text-gray-500 mb-2">Generated Image</div>
                            <div className="relative w-full h-48 sm:h-64 md:h-80 overflow-hidden rounded border border-gray-200">
                                <Image 
                                    src={generatedImage}
                                    alt={prompt}
                                    fill
                                    className="object-contain"
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PromptTextGenerator; 