"use client";
import React, { useState, useEffect } from 'react';
import Header from "@/components/layout/Header";
import { cleanPromptText } from "@/lib/textUtils";
import AIPromptButton from "@/components/ui/AIPromptButton";
import ImageUploader from "@/components/ui/ImageUploader";
import Image from "next/image";

const API_KEY = process.env.NEXT_PUBLIC_API_KEY;

interface UploadedFile extends File {
    name: string;
    type: string;
    preview?: string;
}

const TextGenerator = () => {
    const [prompt, setPrompt] = useState("");
    const [generatedText, setGeneratedText] = useState("");
    const [isGeneratingDesc, setIsGeneratingDesc] = useState(false);
    const [isGeneratingText, setIsGeneratingText] = useState(false);
    const [uploadedImage, setUploadedImage] = useState<UploadedFile | null>(null);
    const [isMobile, setIsMobile] = useState(false);
    const [temperature, setTemperature] = useState(0.7);
    const [maxTokens, setMaxTokens] = useState(500);
    const [style, setStyle] = useState("creative");

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
            
            // Mock API call - in a real app, you would call an AI service
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            const generatedPrompt = "Write a detailed analysis of the composition, subject matter, and style of this image, focusing on its artistic elements.";
            
            const cleanedText = cleanPromptText(generatedPrompt);
            setPrompt(cleanedText);
        } catch (error) {
            console.error('Error generating description:', error);
            alert("An error occurred while generating the description.");
        } finally {
            setIsGeneratingDesc(false);
        }
    };

    const generateText = async () => {
        if (!prompt.trim()) return;
        
        try {
            setIsGeneratingText(true);
            setGeneratedText("");
            
            // Mock API call - in a real app, you would call an AI service
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Sample generated text based on style
            let result = "";
            
            if (style === "creative") {
                result = "The moonlight cascaded through the ancient windows, casting elongated shadows across the marble floor. As the clock struck midnight, the forgotten manuscripts began to whisper their secrets. Each page turned by an invisible hand, revealing tales of long-lost civilizations and cosmic mysteries that had remained concealed for centuries. The room seemed to breathe with the ancient wisdom contained within these texts, pulsating with an energy that transcended time itself.\n\nAmidst this ethereal display, a single quill rose from its inkwell, suspended in mid-air as if held by a phantom scholar. It began to dance across a blank parchment, inscribing words in an elegant script that hadn't been used for a millennium. The text spoke of celestial alignments and terrestrial powers, of gateways between dimensions and beings that existed beyond human comprehension.";
            } else if (style === "formal") {
                result = "The aforementioned document presents substantial evidence regarding the matter at hand. Upon careful analysis of the presented data, it becomes apparent that several key factors contribute to the observed phenomenon. Firstly, the longitudinal studies conducted by Henderson et al. (2022) demonstrate a statistically significant correlation between variables A and B, with a p-value of less than 0.001.\n\nFurthermore, when considering the contextual elements outlined in Section 3.2, one must acknowledge the influential role of historical precedents. The methodological approach utilized in this investigation adheres to established protocols within the field, ensuring reliability and reproducibility of results. In conclusion, the findings herein support the initial hypothesis while simultaneously revealing avenues for further inquiry.";
            } else {
                result = "So here's the deal – I was thinking about what you asked, and honestly, it's pretty fascinating stuff! The way these ideas connect is mind-blowing when you really get into it. Like, who would have thought that something so ordinary could have such cool implications?\n\nAnyway, I did some digging online and found that lots of people are talking about this exact thing right now. Some folks are totally on board with the concept, while others are super skeptical – typical internet, right? But what I found most interesting was how this whole thing ties back to everyday experiences we all have but never really think about critically.";
            }
            
            setGeneratedText(result);
        } catch (error) {
            console.error('Error generating text:', error);
            alert("An error occurred while generating the text.");
        } finally {
            setIsGeneratingText(false);
        }
    };

    const copyToClipboard = async () => {
        if (!generatedText) return;
        
        try {
            await navigator.clipboard.writeText(generatedText);
            alert("Text copied to clipboard!");
        } catch (error) {
            console.error('Failed to copy text:', error);
            alert("Failed to copy text to clipboard.");
        }
    };

    return (
        <div className="flex flex-col min-h-screen bg-white text-gray-800">
            <Header />
            <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
                {/* Sidebar */}
                <div className="w-full md:w-[300px] bg-gray-50 p-5 overflow-y-auto border-r border-gray-200">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="mr-2 text-blue-600">
                                <path d="M3 17.25V21H6.75L17.81 9.94L14.06 6.19L3 17.25ZM20.71 7.05C21.1 6.66 21.1 6.02 20.71 5.63L18.37 3.29C17.98 2.9 17.34 2.9 16.95 3.29L15.88 4.36L19.64 8.12L20.71 7.05Z" fill="currentColor"/>
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
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                                Temperature
                            </h3>
                            <div className="flex flex-col space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-gray-500">Precise</span>
                                    <span className="text-xs text-gray-500">Creative</span>
                                </div>
                                <input 
                                    type="range" 
                                    min="0" 
                                    max="1" 
                                    step="0.01" 
                                    value={temperature}
                                    onChange={(e) => setTemperature(parseFloat(e.target.value))}
                                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                />
                                <div className="text-xs font-medium text-blue-600 text-right">
                                    {temperature.toFixed(2)}
                                </div>
                            </div>
                        </div>

                        <div className="p-4 bg-white rounded-xl shadow-sm border border-gray-200">
                            <h3 className="font-medium mb-3 text-gray-800 flex items-center">
                                <svg className="w-4 h-4 mr-2 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Max Tokens
                            </h3>
                            <div className="flex flex-col space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-gray-500">Shorter</span>
                                    <span className="text-xs text-gray-500">Longer</span>
                                </div>
                                <input 
                                    type="range" 
                                    min="100" 
                                    max="1000" 
                                    step="50" 
                                    value={maxTokens}
                                    onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                />
                                <div className="text-xs font-medium text-blue-600 text-right">
                                    {maxTokens} tokens
                                </div>
                            </div>
                        </div>

                        <div className="p-4 bg-white rounded-xl shadow-sm border border-gray-200">
                            <h3 className="font-medium mb-3 text-gray-800 flex items-center">
                                <svg className="w-4 h-4 mr-2 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
                                </svg>
                                Writing Style
                            </h3>
                            <div className="grid grid-cols-1 gap-3">
                                <div className={`relative border rounded-lg p-3 ${style === "creative" ? "border-blue-500 bg-blue-50" : "border-gray-200"} transition-all cursor-pointer`}
                                    onClick={() => setStyle("creative")}>
                                    <input 
                                        type="radio" 
                                        id="creative" 
                                        name="style" 
                                        value="creative"
                                        checked={style === "creative"}
                                        onChange={(e) => setStyle(e.target.value)}
                                        className="sr-only" 
                                    />
                                    <label htmlFor="creative" className="text-sm flex items-center cursor-pointer">
                                        <span className={style === "creative" ? "text-blue-600 font-medium" : "text-gray-600"}>Creative</span>
                                        <span className="text-xs text-gray-500 ml-2">- Imaginative and expressive</span>
                                    </label>
                                    {style === "creative" && (
                                        <div className="absolute top-2 right-2 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                            </svg>
                                        </div>
                                    )}
                                </div>
                                <div className={`relative border rounded-lg p-3 ${style === "formal" ? "border-blue-500 bg-blue-50" : "border-gray-200"} transition-all cursor-pointer`}
                                    onClick={() => setStyle("formal")}>
                                    <input 
                                        type="radio" 
                                        id="formal" 
                                        name="style" 
                                        value="formal"
                                        checked={style === "formal"}
                                        onChange={(e) => setStyle(e.target.value)}
                                        className="sr-only" 
                                    />
                                    <label htmlFor="formal" className="text-sm flex items-center cursor-pointer">
                                        <span className={style === "formal" ? "text-blue-600 font-medium" : "text-gray-600"}>Formal</span>
                                        <span className="text-xs text-gray-500 ml-2">- Professional and structured</span>
                                    </label>
                                    {style === "formal" && (
                                        <div className="absolute top-2 right-2 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                            </svg>
                                        </div>
                                    )}
                                </div>
                                <div className={`relative border rounded-lg p-3 ${style === "casual" ? "border-blue-500 bg-blue-50" : "border-gray-200"} transition-all cursor-pointer`}
                                    onClick={() => setStyle("casual")}>
                                    <input 
                                        type="radio" 
                                        id="casual" 
                                        name="style" 
                                        value="casual"
                                        checked={style === "casual"}
                                        onChange={(e) => setStyle(e.target.value)}
                                        className="sr-only" 
                                    />
                                    <label htmlFor="casual" className="text-sm flex items-center cursor-pointer">
                                        <span className={style === "casual" ? "text-blue-600 font-medium" : "text-gray-600"}>Casual</span>
                                        <span className="text-xs text-gray-500 ml-2">- Conversational and relaxed</span>
                                    </label>
                                    {style === "casual" && (
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
                    {isGeneratingText ? (
                        <div className="flex-1 flex flex-col items-center justify-center">
                            <div className="relative w-full h-[calc(100vh-340px)] min-h-[300px] max-h-[60vh] rounded-xl overflow-hidden shadow-md bg-gray-200 flex items-center justify-center">
                                <div className="absolute inset-0 bg-gradient-to-r from-blue-100/50 via-purple-100/50 to-pink-100/50 animate-gradient bg-300% shadow-[0_0_30px_rgba(192,132,252,0.3)]"></div>
                                <div className="z-10 flex flex-col items-center">
                                    <div className="w-12 h-12 rounded-full border-4 border-t-blue-500 border-r-transparent border-b-purple-500 border-l-transparent animate-spin mb-4"></div>
                                    <div className="text-xl sm:text-2xl font-bold text-gray-800 text-center px-4">Generating text...</div>
                                    <div className="text-sm text-gray-600 mt-2">This may take a few moments</div>
                                </div>
                            </div>
                        </div>
                    ) : !generatedText ? (
                        <div className="flex-1 flex flex-col items-center justify-center">
                            <div className="w-auto h-auto mb-6">
                                {/* SVG icon for text generation */}
                                <svg 
                                    width="150" 
                                    height="150" 
                                    viewBox="0 0 24 24" 
                                    fill="none" 
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="text-blue-600"
                                >
                                    <path d="M3 17.25V21H6.75L17.81 9.94L14.06 6.19L3 17.25ZM20.71 7.05C21.1 6.66 21.1 6.02 20.71 5.63L18.37 3.29C17.98 2.9 17.34 2.9 16.95 3.29L15.88 4.36L19.64 8.12L20.71 7.05Z" fill="currentColor" className="opacity-20"/>
                                    <path d="M4 5h16M4 9h10M4 13h8M4 17h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                                </svg>
                            </div>
                            <h1 className="text-2xl sm:text-3xl font-bold mb-4 text-center text-gray-800">Start generating text</h1>
                            <p className="text-center text-gray-600 max-w-xl mb-8 px-4">
                                Describe what you want to generate in the prompt field, or upload a reference image to enhance your results.
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
                            <div className="relative w-full h-[calc(100vh-340px)] min-h-[300px] max-h-[60vh] rounded-xl overflow-hidden shadow-sm border border-gray-100 bg-white p-6">
                                <div className="overflow-y-auto h-full">
                                    <div className="whitespace-pre-line text-gray-800">
                                        {generatedText}
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-2 mt-2 mb-2">
                                <button 
                                    onClick={copyToClipboard}
                                    className="flex items-center gap-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors font-medium shadow-sm"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                    </svg>
                                    Copy Text
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
                                placeholder="Describe what you want to generate"
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
                                disabled={isGeneratingDesc || isGeneratingText || !uploadedImage}
                                isGenerating={isGeneratingDesc}
                                size={isMobile ? 'sm' : 'md'}
                                tooltipText={!uploadedImage ? "Upload an image first" : "Generate AI description from image"}
                            />
                            <button 
                                className={`px-3 py-1.5 sm:px-4 sm:py-2 text-sm sm:text-base rounded-lg font-medium text-white flex items-center gap-1 ${
                                    isGeneratingText 
                                    ? 'bg-purple-500 animate-pulse' 
                                    : 'bg-blue-600 hover:bg-blue-700 transition-colors'
                                }`}
                                onClick={generateText}
                                disabled={isGeneratingText || !prompt.trim()}
                            >
                                {isGeneratingText ? (
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

export default TextGenerator; 