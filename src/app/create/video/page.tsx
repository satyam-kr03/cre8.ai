"use client";
import React, { useState, useEffect, useRef } from 'react';
import Header from "@/components/layout/Header";
import { cleanPromptText } from "@/lib/textUtils";
import AIPromptButton from "@/components/ui/AIPromptButton";

const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY;

const VideoGenerator = () => {
    const [prompt, setPrompt] = useState("");
    const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [generatedVideos, setGeneratedVideos] = useState<string[]>([]);
    const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
    const [isGeneratingDesc, setIsGeneratingDesc] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [savingToGallery, setSavingToGallery] = useState(false);
    
    const videoRef = useRef<HTMLVideoElement>(null);

    // Handle window resize and set mobile state
    useEffect(() => {
        const checkIsMobile = () => {
            setIsMobile(window.innerWidth < 640);
        };
        
        checkIsMobile();
        window.addEventListener('resize', checkIsMobile);
        
        return () => window.removeEventListener('resize', checkIsMobile);
    }, []);

    const generateVideo = async () => {
        if (!prompt.trim()) return;
        
        try {
            setIsGeneratingVideo(true);
            setError(null);
            
            // Call the text2video API
            const response = await fetch('/api/text2video', {
                method: 'POST',
                body: JSON.stringify({ prompt }),
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                const errorText = errorData.error || `API error: ${response.status} ${response.statusText}`;
                const details = errorData.details ? `\nDetails: ${errorData.details}` : '';
                throw new Error(`${errorText}${details}`);
            }
            
            // Get video data as blob
            const videoBlob = await response.blob();
            const url = URL.createObjectURL(videoBlob);
            
            // Add the new video to the list
            setGeneratedVideos(prev => [...prev, url]);
            setSelectedVideo(url);
            
            // Play the video automatically
            if (videoRef.current) {
                videoRef.current.load();
                videoRef.current.play().catch(e => console.error("Video playback error:", e));
            }
            
        } catch (error) {
            console.error('Error generating video:', error);
            setError(error instanceof Error ? error.message : 'An unknown error occurred');
        } finally {
            setIsGeneratingVideo(false);
        }
    };

    // Generate example prompt
    const generateAIPrompt = async () => {
        try {
            setIsGeneratingDesc(true);
            
            const requestData = {
                contents: [
                    {
                        parts: [
                            { 
                                text: "Generate a creative, detailed prompt for an AI video generator. Include visual details, mood, scene description, and cinematic style. Make it engaging and specific." 
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
            
            if (!data.candidates || !data.candidates[0] || !data.candidates[0].content || !data.candidates[0].content.parts) {
                console.error("Unexpected API response format:", data);
                
                if (data.error) {
                    console.error("API Error:", data.error.message || data.error);
                    alert(`Error: ${data.error.message || "Failed to generate prompt"}`);
                } else {
                    alert("Failed to generate prompt. Check console for details.");
                }
                return;
            }
            
            const generatedText = data.candidates[0].content.parts[0].text;
            const cleanedText = cleanPromptText(generatedText);
            setPrompt(cleanedText);
            
        } catch (error) {
            console.error('Error generating prompt:', error);
            alert("An error occurred while generating the prompt.");
        } finally {
            setIsGeneratingDesc(false);
        }
    };

    const downloadVideo = (videoUrl: string) => {
        if (!videoUrl) return;
        
        try {
            const link = document.createElement('a');
            link.href = videoUrl;
            link.download = `generated-video-${Date.now()}.mp4`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            console.error('Error downloading video:', error);
            alert('Failed to download the video.');
        }
    };

    const handleAddToGallery = async () => {
        if (!selectedVideo) return;
        
        try {
            // Show loading state specifically for the gallery button
            setSavingToGallery(true);
            
            // Get the video content
            const response = await fetch(selectedVideo);
            const blob = await response.blob();
            
            // Check file size
            const fileSizeMB = blob.size / (1024 * 1024);
            console.log(`Video size: ${fileSizeMB.toFixed(2)} MB`);
            
            // MongoDB has a document size limit of 16MB
            if (fileSizeMB > 15) {
                alert(`Video is too large (${fileSizeMB.toFixed(2)} MB). Maximum size is 15 MB.`);
                setSavingToGallery(false);
                return;
            }
            
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
                type: 'Animation',
                prompt: prompt,
                contentData: base64Content,
                contentType: blob.type || 'video/mp4',
                settings: {
                    isVideo: true,
                    duration: videoRef.current?.duration || 0,
                    size: fileSizeMB.toFixed(2) + 'MB'
                }
            };
            
            console.log('Saving video to gallery with data:', {
                type: galleryData.type,
                prompt: galleryData.prompt.substring(0, 30) + '...',
                contentType: galleryData.contentType,
                contentDataLength: galleryData.contentData.length,
                settings: galleryData.settings
            });
            
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
                console.error('Gallery API error response:', errorData);
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

    // Cleanup function for the generated video URLs to prevent memory leaks
    useEffect(() => {
        return () => {
            generatedVideos.forEach(url => {
                URL.revokeObjectURL(url);
            });
        };
    }, [generatedVideos]);

    return (
        <div className="flex flex-col min-h-screen bg-white text-gray-800">
            <Header />
            <div className="flex-1 flex flex-col p-5 overflow-y-auto bg-gray-50">
                {/* Video Preview Area */}
                {generatedVideos.length === 0 ? (
                    // Empty state - no videos yet
                    isGeneratingVideo ? (
                        <div className="flex-1 flex flex-col items-center justify-center mb-4">
                            <div className="relative w-full aspect-video max-w-2xl rounded-xl overflow-hidden shadow-md bg-gray-200 flex items-center justify-center">
                                <div className="absolute inset-0 bg-gradient-to-r from-blue-100/50 via-purple-100/50 to-pink-100/50 animate-gradient bg-300% shadow-[0_0_30px_rgba(192,132,252,0.3)]"></div>
                                <div className="z-10 flex flex-col items-center">
                                    <div className="w-12 h-12 rounded-full border-4 border-t-blue-500 border-r-transparent border-b-purple-500 border-l-transparent animate-spin mb-4"></div>
                                    <div className="text-xl sm:text-2xl font-bold text-gray-800 text-center px-4">Generating video...</div>
                                    <div className="text-sm text-gray-600 mt-2">This may take a few moments</div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center mb-4">
                            <div className="w-auto h-auto mb-6">
                                <svg 
                                    width="150" 
                                    height="150" 
                                    viewBox="0 0 24 24" 
                                    fill="none" 
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="text-blue-600"
                                >
                                    <rect x="2" y="4" width="20" height="16" rx="2" className="fill-current opacity-20"/>
                                    <path d="M10 8.5V15.5L16 12L10 8.5Z" fill="currentColor"/>
                                    <path d="M2 8H22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                                    <circle cx="5" cy="6" r="1" fill="currentColor"/>
                                    <circle cx="8" cy="6" r="1" fill="currentColor"/>
                                </svg>
                            </div>
                            <h1 className="text-2xl sm:text-3xl font-bold mb-4 text-center text-gray-800">Text to Video Generation</h1>
                            <p className="text-center text-gray-600 max-w-xl mb-8 px-4">
                                Describe the video you want to generate in the prompt field below. Our AI will create a video based on your description.
                            </p>
                        </div>
                    )
                ) : (
                    <div className="flex-1 flex flex-col mb-4">
                        {/* Selected Video Preview or Loading State */}
                        {isGeneratingVideo ? (
                            <div className="mb-6">
                                <div className="relative w-full aspect-video max-w-2xl mx-auto rounded-xl overflow-hidden shadow-md bg-gray-200 flex items-center justify-center">
                                    <div className="absolute inset-0 bg-gradient-to-r from-blue-100/50 via-purple-100/50 to-pink-100/50 animate-gradient bg-300% shadow-[0_0_30px_rgba(192,132,252,0.3)]"></div>
                                    <div className="z-10 flex flex-col items-center">
                                        <div className="w-12 h-12 rounded-full border-4 border-t-blue-500 border-r-transparent border-b-purple-500 border-l-transparent animate-spin mb-4"></div>
                                        <div className="text-xl sm:text-2xl font-bold text-gray-800 text-center px-4">Generating video...</div>
                                        <div className="text-sm text-gray-600 mt-2">This may take a few moments</div>
                                    </div>
                                </div>
                            </div>
                        ) : selectedVideo && (
                            <div className="mb-6">
                                <div className="relative w-full aspect-video max-w-2xl mx-auto rounded-xl overflow-hidden shadow-sm border border-gray-100 bg-transparent">
                                    <video 
                                        ref={videoRef}
                                        src={selectedVideo}
                                        className="w-full h-full object-contain"
                                        controls
                                        autoPlay
                                        loop
                                    ></video>
                                </div>
                                <div className="flex justify-center gap-2 mt-4">
                                    <button 
                                        onClick={() => downloadVideo(selectedVideo)}
                                        className="flex items-center gap-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors font-medium shadow-sm"
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                        </svg>
                                        Download Video
                                    </button>
                                    
                                    <button 
                                        onClick={handleAddToGallery}
                                        className="flex items-center gap-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-100 transition-colors font-medium shadow-sm"
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
                                    </button>
                                </div>
                            </div>
                        )}
                        
                        {/* Generated Videos Gallery - Always visible */}
                        <div className="mt-4">
                            <h3 className="text-lg font-semibold mb-3">Your Generated Videos</h3>
                            <div className="flex flex-wrap gap-4">
                                {generatedVideos.map((videoUrl, index) => (
                                    <div 
                                        key={index} 
                                        className={`cursor-pointer border-2 rounded-lg overflow-hidden ${videoUrl === selectedVideo ? 'border-blue-500' : 'border-gray-200'}`}
                                        onClick={() => setSelectedVideo(videoUrl)}
                                    >
                                        <div className="w-40 aspect-video">
                                            <video 
                                                src={videoUrl}
                                                className="w-full h-full object-cover"
                                                muted
                                            ></video>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Error message */}
                {error && (
                    <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                        <div className="flex items-center">
                            <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>{error}</span>
                        </div>
                    </div>
                )}

                {/* Prompt Input Area */}
                <div className="mt-auto">
                    <div className="bg-white rounded-t-xl border border-b-0 border-gray-200 overflow-hidden shadow-sm">
                        <div className="px-4 py-3 border-b border-gray-200">
                            <h2 className="font-medium text-gray-800">Describe your video</h2>
                        </div>
                        
                        <div className="relative">
                            <textarea
                                placeholder="Describe the video you want to generate in detail. For example: A cinematic scene of a spacecraft landing on a distant planet with swirling dust clouds and dramatic lighting."
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                className="w-full bg-transparent p-4 outline-none resize-none h-32 text-gray-800"
                            />
                            <div className="absolute inset-0 bg-gradient-to-r from-blue-50/30 via-purple-50/30 to-pink-50/30 animate-gradient bg-300% pointer-events-none rounded-b-lg" style={{ backgroundSize: '300% 300%' }}></div>
                        </div>
                    </div>

                    <div className="flex justify-end p-4 bg-white rounded-b-xl border border-t-0 border-gray-200">
                        <div className="flex items-center gap-2">
                            <AIPromptButton 
                                onClick={generateAIPrompt}
                                isGenerating={isGeneratingDesc}
                                size={isMobile ? 'sm' : 'md'}
                                tooltipText="Generate example prompt"
                            />
                            <button 
                                className={`px-4 py-2 rounded-lg font-medium text-white flex items-center gap-1 ${
                                    isGeneratingVideo 
                                    ? 'bg-purple-500 animate-pulse' 
                                    : 'bg-blue-600 hover:bg-blue-700 transition-colors'
                                }`}
                                onClick={generateVideo}
                                disabled={isGeneratingVideo || !prompt.trim()}
                            >
                                {isGeneratingVideo ? (
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
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        Generate
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <style jsx global>{`
                @keyframes gradient {
                    0% {
                        background-position: 0% 50%;
                    }
                    50% {
                        background-position: 100% 50%;
                    }
                    100% {
                        background-position: 0% 50%;
                    }
                }
                .animate-gradient {
                    animation: gradient 8s ease infinite;
                }
                .bg-300\\% {
                    background-size: 300% 300%;
                }
            `}</style>
        </div>
    );
};

export default VideoGenerator;