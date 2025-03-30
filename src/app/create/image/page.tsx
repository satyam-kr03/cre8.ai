"use client";
import React, { useState, useEffect } from 'react';
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
    const [variationStrength, setVariationStrength] = useState(0.5);
    const [generationSteps, setGenerationSteps] = useState(25);
    const [imageDimension, setImageDimension] = useState("LANDSCAPE");

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
            
            let requestBody;
            
            // Prepare the request body based on whether we have an uploaded image
            if (uploadedImage) {
                // Convert image to base64
                const imageBase64 = await getBase64(uploadedImage);
                const base64Data = imageBase64.split(',')[1];
                
                requestBody = {
                    endpoint: 'img2img',
                    prompt: prompt,
                    init_image: base64Data,
                    size: imageDimension,
                    steps: generationSteps
                };
            } else {
                requestBody = {
                    endpoint: 'text2img',
                    prompt: prompt,
                    size: imageDimension,
                    steps: generationSteps
                };
            }
            
            console.log('Sending request to generate image...');
            
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
            
            // The API should return the image as base64 in a JSON response
            const data = await response.json();
            console.log('Response data keys:', Object.keys(data));
            
            if (!data.image) {
                console.error('Missing image data in response:', data);
                throw new Error("No image data returned from API");
            }
            
            // Convert base64 back to blob and create URL
            try {
                const imageBlob = await fetch(`data:image/png;base64,${data.image}`).then(r => r.blob());
                const imageUrl = URL.createObjectURL(imageBlob);
                setGeneratedImage(imageUrl);
                console.log('Successfully created image URL');
            } catch (e) {
                console.error('Error creating image from base64:', e);
                throw new Error('Failed to process the generated image');
            }
            
        } catch (error) {
            console.error('Error generating image:', error);
            alert("An error occurred while generating the image: " + (error instanceof Error ? error.message : String(error)));
        } finally {
            setIsGeneratingImage(false);
        }
    };

    const downloadImage = async () => {
        if (!generatedImage) return;
        
        try {
            // Fetch the image as a blob
            const response = await fetch(generatedImage);
            const blob = await response.blob();
            
            // Create a download link
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            
            // Set filename with timestamp to make it unique
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            link.download = `generated-image-${timestamp}.png`;
            
            // Trigger the download
            document.body.appendChild(link);
            link.click();
            
            // Clean up
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href);
        } catch (error) {
            console.error('Error downloading image:', error);
            alert('Failed to download the image.');
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
        <div className="flex flex-col min-h-screen bg-white text-gray-800">
            <Header />
            <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
                {/* Sidebar */}
                <div className="w-full md:w-[300px] bg-gray-50 p-5 overflow-y-auto border-r border-gray-200">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="mr-2 text-blue-600">
                                <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" />
                                <path d="M9 12H15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                <path d="M12 9L12 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            </svg>
                            <span className="font-medium">Reference Image</span>
                        </div>
                    </div>

                    <ImageUploader 
                        onImageUpload={handleImageUpload}
                        uploadedImage={uploadedImage}
                        className="rounded-xl overflow-hidden shadow-sm border border-gray-200"
                    />
                    
                    {/* Generation Controls */}
                    <div className="mt-8 space-y-5">
                        <h2 className="text-lg font-semibold text-gray-800 mb-3">Generation Settings</h2>
                        

                        <div className="p-4 bg-white rounded-xl shadow-sm border border-gray-200">
                            <h3 className="font-medium mb-3 text-gray-800 flex items-center">
                                <svg className="w-4 h-4 mr-2 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Generation Steps
                            </h3>
                            <div className="flex flex-col space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-gray-500">Faster</span>
                                    <span className="text-xs text-gray-500">Higher Quality</span>
                                </div>
                                <input 
                                    type="range" 
                                    min="10" 
                                    max="50" 
                                    step="1" 
                                    value={generationSteps}
                                    onChange={(e) => setGenerationSteps(parseInt(e.target.value))}
                                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                />
                                <div className="text-xs font-medium text-blue-600 text-right">
                                    {generationSteps} steps
                                </div>
                            </div>
                        </div>

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
                                        <span className="text-xs text-gray-500">1280×1280</span>
                                    </label>
                                    {imageDimension === "SQUARE" && (
                                        <div className="absolute top-2 right-2 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                            </svg>
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
                                        <span className="text-xs text-gray-500">2048×1280</span>
                                    </label>
                                    {imageDimension === "LANDSCAPE" && (
                                        <div className="absolute top-2 right-2 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                            </svg>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 flex flex-col p-5 overflow-y-auto bg-gray-50">
                    {isGeneratingImage ? (
                        <div className="flex-1 flex flex-col items-center justify-center">
                            <div className="relative w-full h-[calc(100vh-340px)] min-h-[300px] max-h-[60vh] rounded-xl overflow-hidden shadow-md bg-gray-200 flex items-center justify-center">
                                <div className="absolute inset-0 bg-gradient-to-r from-blue-100/50 via-purple-100/50 to-pink-100/50 animate-gradient bg-300% shadow-[0_0_30px_rgba(192,132,252,0.3)]"></div>
                                <div className="z-10 flex flex-col items-center">
                                    <div className="w-12 h-12 rounded-full border-4 border-t-blue-500 border-r-transparent border-b-purple-500 border-l-transparent animate-spin mb-4"></div>
                                    <div className="text-xl sm:text-2xl font-bold text-gray-800 text-center px-4">Generating image...</div>
                                    <div className="text-sm text-gray-600 mt-2">This may take a few moments</div>
                                </div>
                            </div>
                        </div>
                    ) : !generatedImage ? (
                        <div className="flex-1 flex flex-col items-center justify-center">
                            <div className="w-24 h-24 sm:w-28 sm:h-28">
                                <Image 
                                    src="/images/infi.png"
                                    alt="Enhance image generator"
                                    width={100}
                                    height={100}
                                    priority
                                />
                            </div>
                            <h1 className="text-2xl sm:text-3xl font-bold mb-4 text-center text-gray-800">Start generating images</h1>
                            <p className="text-center text-gray-600 max-w-xl mb-8 px-4">
                                Describe the image you want to generate in the prompt field, or upload a reference image to enhance your results.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                <div className="flex items-center bg-white p-3 rounded-lg shadow-sm border border-gray-200">
                                    <div className="p-2 bg-blue-100 rounded-lg mr-3">
                                        <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h3 className="font-medium">Write a prompt</h3>
                                        <p className="text-xs text-gray-500">Describe what you want to create</p>
                                    </div>
                                </div>
                                <div className="flex items-center bg-white p-3 rounded-lg shadow-sm border border-gray-200">
                                    <div className="p-2 bg-purple-100 rounded-lg mr-3">
                                        <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h3 className="font-medium">Upload reference</h3>
                                        <p className="text-xs text-gray-500">Provide an image for inspiration</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center">
                            <div className="relative w-full h-[calc(100vh-340px)] min-h-[300px] max-h-[60vh] rounded-xl overflow-hidden shadow-sm border border-gray-100 bg-transparent">
                                <Image 
                                    src={generatedImage}
                                    alt={prompt}
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
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                    </svg>
                                    Save Image
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="relative mt-2">
                        <div className="relative border border-gray-300 rounded-xl bg-white overflow-hidden shadow-sm">
                            <div className={`absolute inset-0 blur-md ${
                                isGeneratingDesc 
                                ? 'bg-gradient-to-r from-blue-100 via-purple-100 to-pink-100 animate-gradient bg-300% shadow-[0_0_30px_rgba(192,132,252,0.3)]' 
                                : ''
                            }`} />
                            
                            <div className="pt-3 px-4 text-xs text-gray-500 relative z-10 flex items-center">
                                <svg className="w-3 h-3 mr-1 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                </svg>
                                Prompt
                            </div>
                            <textarea
                                placeholder="Describe the image you want to generate"
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                className={`w-full bg-transparent p-4 outline-none resize-none h-28 relative z-10 ${
                                    isGeneratingDesc
                                    ? 'bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent bg-300% animate-gradient font-bold' 
                                    : 'text-gray-800'
                                }`}
                            />
                        </div>

                        <div className="absolute right-4 bottom-4 flex items-center gap-2 z-20">
                            <AIPromptButton
                                onClick={generateAIDescription}
                                disabled={isGeneratingDesc || isGeneratingImage || !uploadedImage}
                                isGenerating={isGeneratingDesc}
                                size={isMobile ? 'sm' : 'md'}
                                tooltipText={!uploadedImage ? "Upload an image first" : "Generate AI description from image"}
                            />
                            <button 
                                className={`px-3 py-1.5 sm:px-4 sm:py-2 text-sm sm:text-base rounded-lg font-medium text-white flex items-center gap-1 ${
                                    isGeneratingImage 
                                    ? 'bg-purple-500 animate-pulse' 
                                    : 'bg-blue-600 hover:bg-blue-700 transition-colors'
                                }`}
                                onClick={generateImage}
                                disabled={isGeneratingImage || !prompt.trim()}
                            >
                                {isGeneratingImage ? (
                                    <>
                                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Generating...
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                        </svg>
                                        Generate
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ImageGenerator;