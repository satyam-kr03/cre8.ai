"use client";
import React, { useState, useEffect, useContext } from 'react';
import Header from "@/components/layout/Header";
import { cleanPromptText } from "@/lib/textUtils";
import AIPromptButton from "@/components/ui/AIPromptButton";
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider'; 
import ImageUploader from "@/components/ui/ImageUploader";
import AuthCheck, { AuthContext } from '@/components/auth/AuthCheck';

// Assuming GEMINI_API_KEY is available via environment variables
const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY;

// Interfaces for Gemini API Request (similar to text/image generation)
interface UploadedFile extends File {
    name: string;
    type: string;
    preview?: string;
}
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

const AnimationGenerator = () => {
    // Add auth context
    const { isAuthenticated } = useContext(AuthContext);
    
    const [prompt, setPrompt] = useState("");
    const [negativePrompt, setNegativePrompt] = useState("");
    const [isGeneratingPrompt, setIsGeneratingPrompt] = useState(false);
    const [isGeneratingAnimation, setIsGeneratingAnimation] = useState(false);
    const [savingToGallery, setSavingToGallery] = useState(false);
    const [generatedAnimation, setGeneratedAnimation] = useState<string | null>(null);
    const [isMobile, setIsMobile] = useState(false);
    const [numFrames, setNumFrames] = useState(30);
    const [guidanceScale, setGuidanceScale] = useState(7);
    const [inferenceSteps, setInferenceSteps] = useState(25);
    const [uploadedImage, setUploadedImage] = useState<UploadedFile | null>(null);
    const [isGeneratingDesc, setIsGeneratingDesc] = useState(false);

    useEffect(() => {
        const checkIsMobile = () => {
            setIsMobile(window.innerWidth < 640);
        };
        checkIsMobile();
        window.addEventListener('resize', checkIsMobile);
        return () => window.removeEventListener('resize', checkIsMobile);
    }, []);

    // Helper to convert file to base64
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

    // Function to generate prompt from image using Gemini
    const generateAIDescription = async () => {
        // Check authentication first

        
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
                            { text: "Analyze this image and generate a detailed, descriptive prompt suitable for generating an *animation* based on its content, style, and potential movement." } as TextPart,
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
                    max_output_tokens: 300 // Max tokens for the generated prompt
                }
            };
            
            console.log("Sending image to Gemini for animation prompt generation...");
            
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
            console.log("Generated animation prompt from image:", generatedPrompt);
            
            const cleanedText = cleanPromptText(generatedPrompt);
            setPrompt(cleanedText);
        } catch (error) {
            console.error('Error generating description:', error);
            alert("An error occurred while generating the description.");
        } finally {
            setIsGeneratingDesc(false);
        }
    };

    const generateAnimation = async () => {

        if (!prompt.trim()) return;
        
        try {
            setIsGeneratingAnimation(true);
            setGeneratedAnimation(null);
            
            const requestBody = {
                prompt: prompt,
                negative_prompt: negativePrompt || null, // Send null if empty
                num_frames: numFrames,
                guidance_scale: guidanceScale,
                num_inference_steps: inferenceSteps
            };

            console.log('Sending request to generate animation:', requestBody);

            // Call our proxy API route
            const response = await fetch('/api/animationproxy', {
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

            // Assuming the proxy returns JSON with base64 video data
            const data = await response.json();
            console.log('Response data keys:', Object.keys(data));

            if (!data.animation) { // Expecting 'animation' key
                console.error('Missing animation data in response:', data);
                throw new Error("No animation data returned from API");
            }

            // Convert base64 back to blob and create URL (expecting image/gif)
            try {
                const gifBlob = await fetch(`data:image/gif;base64,${data.animation}`).then(r => r.blob());
                const gifUrl = URL.createObjectURL(gifBlob);
                setGeneratedAnimation(gifUrl);
                console.log('Successfully created GIF URL');
            } catch (e) {
                console.error('Error creating animation from base64:', e);
                throw new Error('Failed to process the generated animation');
            }

        } catch (error) {
            console.error('Error generating animation:', error);
            alert("An error occurred while generating the animation: " + (error instanceof Error ? error.message : String(error)));
        } finally {
            setIsGeneratingAnimation(false);
        }
    };

    const handleAddToGallery = async () => {
        if (!generatedAnimation) return;
        
        try {
            // Show loading state specifically for the gallery button
            setSavingToGallery(true);
            
            // Get the video content
            const response = await fetch(generatedAnimation);
            const blob = await response.blob();
            
            // Convert blob to base64
            const reader = new FileReader();
            const base64Promise = new Promise<string>((resolve) => {
                reader.onloadend = () => {
                    // Get the base64 data part (remove the data:image/gif;base64, prefix)
                    const base64data = reader.result as string;
                    const base64Content = base64data.split(',')[1];
                    resolve(base64Content);
                };
            });
            reader.readAsDataURL(blob);
            
            const base64Content = await base64Promise;
            
            // Prepare the gallery item data
            const galleryData = {
                type: 'Animation',
                prompt: prompt,
                contentData: base64Content,
                contentType: blob.type || 'image/gif',
                negativePrompt: negativePrompt,
                settings: {
                    numFrames: numFrames,
                    guidanceScale: guidanceScale,
                    inferenceSteps: inferenceSteps
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
            setSavingToGallery(false);
        }
    };

    const downloadAnimation = async () => {
        if (!generatedAnimation) return;
        
        try {
            const response = await fetch(generatedAnimation);
            const blob = await response.blob();
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            link.download = `generated-animation-${timestamp}.gif`; // Change to .gif
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href);
        } catch (error) {
            console.error('Error downloading animation:', error);
            alert('Failed to download the animation.');
        }
    };

    // Cleanup generated URL
    useEffect(() => {
        return () => {
            if (generatedAnimation) {
                URL.revokeObjectURL(generatedAnimation);
            }
        };
    }, [generatedAnimation]);

    return (
        <AuthCheck>
            <div className="flex flex-col min-h-screen bg-white text-gray-800">
                <Header />
                <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
                    {/* Sidebar */}
                    <div className="w-full md:w-[300px] bg-gray-50 p-5 overflow-y-auto border-r border-gray-200">
                        {/* Image Uploader Section */}
                        <div className="mb-6">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="mr-2 text-blue-600"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                    <span className="font-medium">Reference Image (Optional)</span>
                                </div>
                            </div>
                            <ImageUploader 
                                onImageUpload={handleImageUpload}
                                uploadedImage={uploadedImage}
                                className="rounded-xl overflow-hidden shadow-sm border border-gray-200"
                            />
                            <p className="text-xs text-gray-500 mt-2">Upload an image to generate a prompt based on it.</p>
                        </div>

                        {/* Generation Settings Section */}
                        <h2 className="text-lg font-semibold text-gray-800 mb-4">Generation Settings</h2>
                        
                        <div className="space-y-5">
                            {/* Negative Prompt */}
                            <div className="p-4 bg-white rounded-xl shadow-sm border border-gray-200">
                                <h3 className="font-medium mb-2 text-gray-800 flex items-center">
                                    <svg className="w-4 h-4 mr-2 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                                    Negative Prompt
                                </h3>
                                <Input
                                    placeholder="Describe what to avoid..."
                                    value={negativePrompt}
                                    onChange={(e) => setNegativePrompt(e.target.value)}
                                    className="text-sm"
                                />
                            </div>

                            {/* Number of Frames */}
                            <div className="p-4 bg-white rounded-xl shadow-sm border border-gray-200">
                                <h3 className="font-medium mb-2 text-gray-800 flex items-center">
                                    <svg className="w-4 h-4 mr-2 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4" /></svg>
                                    Number of Frames
                                </h3>
                                <Slider 
                                    defaultValue={[numFrames]} 
                                    min={10} 
                                    max={30} 
                                    step={1} 
                                    onValueChange={(value: number[]) => setNumFrames(value[0])}
                                />
                                <div className="text-xs font-medium text-blue-600 text-right mt-1">
                                    {numFrames} frames
                                </div>
                            </div>

                            {/* Guidance Scale */}
                            <div className="p-4 bg-white rounded-xl shadow-sm border border-gray-200">
                                <h3 className="font-medium mb-2 text-gray-800 flex items-center">
                                    <svg className="w-4 h-4 mr-2 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 16v-2m8-8h2M4 12H2m15.364 6.364l1.414 1.414M4.222 19.778l1.414-1.414M19.778 4.222l-1.414 1.414M6.343 6.343l-1.414-1.414M12 18a6 6 0 100-12 6 6 0 000 12z" /></svg>
                                    Guidance Scale
                                </h3>
                                <Slider 
                                    defaultValue={[guidanceScale]} 
                                    min={1} 
                                    max={20} 
                                    step={0.5} 
                                    onValueChange={(value: number[]) => setGuidanceScale(value[0])}
                                />
                                <div className="text-xs font-medium text-blue-600 text-right mt-1">
                                    {guidanceScale.toFixed(1)}
                                </div>
                            </div>

                            {/* Inference Steps */}
                            <div className="p-4 bg-white rounded-xl shadow-sm border border-gray-200">
                                <h3 className="font-medium mb-2 text-gray-800 flex items-center">
                                    <svg className="w-4 h-4 mr-2 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    Inference Steps
                                </h3>
                                <Slider 
                                    defaultValue={[inferenceSteps]} 
                                    min={10} 
                                    max={50} 
                                    step={1} 
                                    onValueChange={(value: number[]) => setInferenceSteps(value[0])}
                                />
                                <div className="text-xs font-medium text-blue-600 text-right mt-1">
                                    {inferenceSteps} steps
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className="flex-1 flex flex-col p-5 overflow-y-auto bg-gray-50">
                        {isGeneratingAnimation ? (
                            <div className="flex-1 flex flex-col items-center justify-center">
                                <div className="relative w-full h-[calc(100vh-340px)] min-h-[300px] max-h-[60vh] rounded-xl overflow-hidden shadow-md bg-gray-200 flex items-center justify-center">
                                    <div className="absolute inset-0 bg-gradient-to-r from-blue-100/50 via-purple-100/50 to-pink-100/50 animate-gradient bg-300% shadow-[0_0_30px_rgba(192,132,252,0.3)]"></div>
                                    <div className="z-10 flex flex-col items-center">
                                        <div className="w-12 h-12 rounded-full border-4 border-t-blue-500 border-r-transparent border-b-purple-500 border-l-transparent animate-spin mb-4"></div>
                                        <div className="text-xl sm:text-2xl font-bold text-gray-800 text-center px-4">Generating animation...</div>
                                        <div className="text-sm text-gray-600 mt-2">This may take a few moments</div>
                                    </div>
                                </div>
                            </div>
                        ) : !generatedAnimation ? (
                            <div className="flex-1 flex flex-col items-center justify-center">
                                 <svg className="w-24 h-24 text-blue-300 mb-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M15 20v-4h-6v4M15 4V8H9V4" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                 </svg>
                                <h1 className="text-2xl sm:text-3xl font-bold mb-4 text-center text-gray-800">Start generating animations</h1>
                                <p className="text-center text-gray-600 max-w-xl mb-8 px-4">
                                    Describe the animation you want to generate in the prompt field below.
                                </p>
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center">
                                <div className="relative w-full h-[calc(100vh-340px)] min-h-[300px] max-h-[60vh] rounded-xl overflow-hidden shadow-sm border border-gray-100 bg-gray-100 flex items-center justify-center">
                                    <img 
                                        src={generatedAnimation} 
                                        alt={prompt} 
                                        className="max-w-full max-h-full object-contain"
                                    />
                                </div>
                                <div className="flex gap-2 mt-2 mb-2">
                                    <button 
                                        onClick={downloadAnimation}
                                        className="flex items-center gap-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors font-medium shadow-sm"
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                                        Save Animation
                                    </button>
                                    {/* Add to Gallery Button */}
                                    <Button 
                                        variant="outline"
                                        size="sm"
                                        className="flex items-center gap-1 text-sm border-gray-300 hover:bg-gray-100"
                                        onClick={handleAddToGallery}
                                        disabled={savingToGallery}
                                    >
                                        {savingToGallery ? (
                                            <>
                                                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                </svg>
                                                <span className="ml-1">Saving...</span>
                                            </>
                                        ) : (
                                            <>
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                </svg>
                                                Add to Gallery
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* Prompt Input */}
                        <div className="relative mt-auto">
                            <div className="relative border border-gray-300 rounded-xl bg-white overflow-hidden shadow-sm">
                               <div className="pt-3 px-4 text-xs text-gray-500 relative z-10 flex items-center">
                                    <svg className="w-3 h-3 mr-1 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                    Prompt
                                </div>
                                <textarea
                                    placeholder="Describe the animation you want to generate"
                                    value={prompt}
                                    onChange={(e) => setPrompt(e.target.value)}
                                    className={`w-full bg-transparent p-4 pt-1 outline-none resize-none h-28 relative z-10 text-gray-800`}
                                />
                            </div>
                            <div className="absolute right-4 bottom-4 flex items-center gap-2 z-20">
                                 {/* AI Prompt Button */}
                                <AIPromptButton
                                    onClick={generateAIDescription}
                                    isGenerating={isGeneratingDesc}
                                    size={isMobile ? 'sm' : 'md'}
                                />
                                 {/* Generate Button */}
                                 <button 
                                    className={`px-3 py-1.5 sm:px-4 sm:py-2 text-sm sm:text-base rounded-lg font-medium text-white flex items-center gap-1 ${isGeneratingAnimation ? 'bg-purple-500 animate-pulse' : 'bg-blue-600 hover:bg-blue-700 transition-colors'} relative group`}
                                    onClick={generateAnimation}
                                >
                                    {isGeneratingAnimation ? (
                                        <>
                                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                            Generating...
                                        </>
                                    ) : (
                                        <>
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                            Generate
                                        </>
                                    )}
                                   
                                    {isAuthenticated && !prompt.trim() && (
                                        <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-white border border-gray-200 text-gray-800 text-xs px-2 py-1 rounded shadow-sm opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                                            Please enter a prompt
                                        </div>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AuthCheck>
    );
};

export default AnimationGenerator;