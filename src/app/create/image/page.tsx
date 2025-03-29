"use client";
import React, { useState, ChangeEvent, useEffect } from 'react';
import Header from "@/components/layout/Header";
import { cleanPromptText } from "@/lib/textUtils";
import AIPromptButton from "@/components/ui/AIPromptButton";
import ImageUploader from "@/components/ui/ImageUploader";
import Image from "next/image";
import { InferenceClient } from "@huggingface/inference";

const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
const HF_API_KEY = process.env.NEXT_PUBLIC_HF_API_KEY;

interface UploadedFile extends File {
    name: string;
    type: string;
    preview?: string;
}

const ImageGenerator = () => {
    const [prompt, setPrompt] = useState("");
    const [isGeneratingDesc, setIsGeneratingDesc] = useState(false);
    const [isGeneratingImage, setIsGeneratingImage] = useState(false);
    const [uploadedImage, setUploadedImage] = useState<UploadedFile | null>(null);
    const [generatedImage, setGeneratedImage] = useState<string | null>(null);
    const [isMobile, setIsMobile] = useState(false);

    // Handle window resize and set mobile state
    useEffect(() => {
        const checkIsMobile = () => {
            setIsMobile(window.innerWidth < 640);
        };
        
        // Set initial value
        checkIsMobile();
        
        // Add event listener
        window.addEventListener('resize', checkIsMobile);
        
        // Cleanup
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
    };

    const generateAIDescription = async () => {
        if (!uploadedImage) return;
        
        try {
            setIsGeneratingDesc(true);
            
            const imageBase64 = await getBase64(uploadedImage);
            const base64Data = imageBase64.split(',')[1]; 
            
            const requestData = {
                contents: [
                    {
                        parts: [
                            { text: `Based on this image and the prompt "${prompt}", generate a detailed and creative prompt for image generation:` },
                            {
                                inline_data: {
                                    mime_type: uploadedImage.type,
                                    data: base64Data
                                }
                            }
                        ]
                    }
                ],
                generation_config: {
                    temperature: 0.8,
                    max_output_tokens: 150
                }
            };
            
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
            console.log("API Response:", data);
            
            if (!data.candidates || !data.candidates[0] || !data.candidates[0].content || !data.candidates[0].content.parts) {
                console.error("Unexpected API response format:", data);
                
                if (data.error) {
                    console.error("API Error:", data.error.message || data.error);
                    alert(`Error: ${data.error.message || "Failed to generate description"}`);
                } else {
                    alert("Failed to generate description. Check console for details.");
                }
                return;
            }
            
            const generatedText = data.candidates[0].content.parts[0].text;
            console.log("Original text:", generatedText);
            
            // Clean the text using our utility function
            const cleanedText = cleanPromptText(generatedText);
            
            console.log("Cleaned text:", cleanedText);
            setPrompt(cleanedText);
        } catch (error) {
            console.error('Error generating description:', error);
            alert("An error occurred while generating the description.");
        } finally {
            setIsGeneratingDesc(false);
        }
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

    // Cleanup function for the generated image URL to prevent memory leaks
    useEffect(() => {
        return () => {
            if (generatedImage) {
                URL.revokeObjectURL(generatedImage);
            }
        };
    }, [generatedImage]);

    return (
        <div className="flex flex-col min-h-screen bg-[#2A2A2A] text-white">
            <Header />
            <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
                {/* Sidebar */}
                <div className="w-full md:w-[280px] bg-[#1D1D1D] p-4 overflow-y-auto">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="mr-2">
                                <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" />
                                <path d="M9 12H15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                <path d="M12 9L12 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            </svg>
                            <span>Reference</span>
                        </div>
                        <div className="flex items-center gap-1">
                        </div>
                    </div>

                    <ImageUploader 
                        onImageUpload={handleImageUpload}
                        uploadedImage={uploadedImage}
                        className="mt-4"
                    />

                </div>

                {/* Main Content */}
                <div className="flex-1 flex flex-col p-4 overflow-y-auto">
                    {isGeneratingImage ? (
                        <div className="flex-1 flex flex-col items-center justify-center mb-4">
                            <div className="relative w-full max-w-2xl h-64 sm:h-80 md:h-[450px] lg:h-[550px] rounded-lg overflow-hidden shadow-xl bg-[#333333] flex items-center justify-center">
                                <div className="absolute inset-0 bg-gradient-to-r from-purple-500/30 via-blue-500/30 to-pink-500/30 animate-gradient bg-300% shadow-[0_0_30px_rgba(192,132,252,0.5)]"></div>
                                <div className="z-10 text-xl sm:text-2xl font-bold text-white text-center px-4">Generating image...</div>
                            </div>
                        </div>
                    ) : !generatedImage ? (
                        <div className="flex-1 flex flex-col items-center justify-center">
                            <div className="w-16 h-16 sm:w-20 sm:h-20 mb-4">
                                <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <rect x="10" y="10" width="80" height="80" rx="10" stroke="#FF6B6B" strokeWidth="4" />
                                    <path d="M30 50L45 65L70 35" stroke="#FF6B6B" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                                    <circle cx="75" cy="25" r="10" fill="#FF6B6B" />
                                </svg>
                            </div>
                            <h1 className="text-2xl sm:text-3xl font-bold mb-4 text-center">Start generating images</h1>
                            <p className="text-center text-gray-300 max-w-xl mb-8 px-4">
                                Describe the image you want to generate in the prompt field, or go to Gallery and select images generated with sample prompts for you to try.
                            </p>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center mb-4">
                            <div className="relative w-full max-w-2xl h-64 sm:h-80 md:h-[450px] lg:h-[550px] rounded-lg overflow-hidden shadow-xl">
                                <Image 
                                    src={generatedImage}
                                    alt={prompt}
                                    fill
                                    className="object-contain"
                                />
                            </div>
                        </div>
                    )}

                    <div className="relative mt-4">
                        <div className="relative border border-gray-700 rounded-lg bg-[#222222] overflow-hidden">
                            <div className={`absolute inset-0 blur-md ${
                                isGeneratingDesc 
                                ? 'bg-gradient-to-r from-purple-500 via-blue-500 to-pink-500 animate-gradient bg-300% shadow-[0_0_30px_rgba(192,132,252,0.5)]' 
                                : ''
                            }`} />
                            
                            <div className="pt-3 px-4 text-xs text-gray-400 relative z-10">Prompt</div>
                            <textarea
                                placeholder="Describe the image you want to generate"
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                className={`w-full bg-transparent p-4 outline-none resize-none h-20 relative z-10 ${
                                    isGeneratingDesc 
                                    ? 'bg-gradient-to-r from-purple-400 via-blue-300 to-pink-300 bg-clip-text text-transparent bg-300% animate-gradient font-bold' 
                                    : 'text-white'
                                }`}
                            />
                        </div>

                        <div className="absolute right-4 bottom-4 flex items-center gap-2 z-20">
                            <AIPromptButton
                                onClick={generateAIDescription}
                                disabled={isGeneratingDesc || isGeneratingImage || !uploadedImage}
                                isGenerating={isGeneratingDesc}
                                size={isMobile ? 'sm' : 'md'}
                            />
                            <button 
                                className={`px-3 py-1.5 sm:px-4 sm:py-2 text-sm sm:text-base rounded-lg font-medium ${
                                    isGeneratingImage 
                                    ? 'bg-purple-600 animate-pulse' 
                                    : 'bg-blue-600 hover:bg-blue-700 transition-colors'
                                }`}
                                onClick={generateImage}
                                disabled={isGeneratingImage || !prompt.trim()}
                            >
                                {isGeneratingImage ? 'Generating...' : 'Generate'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ImageGenerator;