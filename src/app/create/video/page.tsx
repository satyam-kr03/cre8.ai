"use client";
import React, { useState, useEffect, useRef } from 'react';
import Header from "@/components/layout/Header";
import { cleanPromptText } from "@/lib/textUtils";
import AIPromptButton from "@/components/ui/AIPromptButton";
import Image from "next/image";
import { useRouter } from 'next/navigation';

const API_KEY = process.env.NEXT_PUBLIC_API_KEY;
const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY;

const VideoGenerator = () => {
    const router = useRouter();
    const [prompt, setPrompt] = useState("");
    const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [generatedVideos, setGeneratedVideos] = useState<string[]>([]);
    const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [isGeneratingDesc, setIsGeneratingDesc] = useState(false);
    const [uploadedImage, setUploadedImage] = useState<string | null>(null);
    
    // Video settings
    const [aspectRatio, setAspectRatio] = useState("16:9");
    const [framesPerSecond, setFramesPerSecond] = useState(24);
    const [shotSize, setShotSize] = useState("none");
    const [cameraAngle, setCameraAngle] = useState("none");
    const [motionType, setMotionType] = useState("none");
    const [isGeneralSettingsOpen, setIsGeneralSettingsOpen] = useState(true);
    const [isCameraSettingsOpen, setIsCameraSettingsOpen] = useState(true);
    
    const videoRef = useRef<HTMLVideoElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Handle window resize and set mobile state
    useEffect(() => {
        const checkIsMobile = () => {
            setIsMobile(window.innerWidth < 640);
        };
        
        checkIsMobile();
        window.addEventListener('resize', checkIsMobile);
        
        return () => window.removeEventListener('resize', checkIsMobile);
    }, []);

    // Handle file upload
    const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const imageUrl = URL.createObjectURL(file);
            setUploadedImage(imageUrl);
        }
    };

    const triggerFileInput = () => {
        fileInputRef.current?.click();
    };

    // Mock video generation function
    const generateVideo = async () => {
        if (!prompt.trim()) return;
        
        try {
            setIsGeneratingVideo(true);
            
            // Simulate API call with delay
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            // Mock result - in a real app this would come from an API
            const demoVideoUrl = 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4';
            
            // Add the new video to the list
            setGeneratedVideos(prev => [...prev, demoVideoUrl]);
            setSelectedVideo(demoVideoUrl);
            
        } catch (error) {
            console.error('Error generating video:', error);
            alert("An error occurred while generating the video.");
        } finally {
            setIsGeneratingVideo(false);
        }
    };

    // Helper function to convert file to base64
    const getBase64 = (file: Blob): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = error => reject(error);
        });
    };

    // Generate AI description
    const generateAIDescription = async () => {
        // Don't proceed if no image is uploaded
        if (!uploadedImage) {
            alert("Please upload a reference image first to generate a video prompt.");
            return;
        }
        
        try {
            setIsGeneratingDesc(true);
            
            // Convert the uploaded image to a base64 string for the API
            const response = await fetch(uploadedImage);
            const blob = await response.blob();
            const imageBase64 = await getBase64(blob);
            const base64Data = imageBase64.split(',')[1]; 
            
            const requestData = {
                contents: [
                    {
                        parts: [
                            { text: "Generate a detailed, creative prompt to create a video based on this image. Describe camera movements, lighting, and cinematic style. Focus on how this static image could be transformed into a dynamic video scene." },
                            {
                                inline_data: {
                                    mime_type: blob.type,
                                    data: base64Data
                                }
                            }
                        ]
                    }
                ],
                generation_config: {
                    temperature: 0.8,
                    max_output_tokens: 250
                }
            };
            
            const apiResponse = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(requestData),
                }
            );
            
            if (!apiResponse.ok) {
                throw new Error(`API error: ${apiResponse.status}`);
            }
            
            const data = await apiResponse.json();
            console.log("API Response:", data);
            
            if (!data.candidates || !data.candidates[0] || !data.candidates[0].content || !data.candidates[0].content.parts) {
                console.error("Unexpected API response format:", data);
                
                if (data.error) {
                    console.error("API Error:", data.error.message || data.error);
                    alert(`Error: ${data.error.message || "Failed to generate description"}`);
                } else {
                    alert("Failed to generate description. Check console for details.");
                }
                
                // Fallback to random prompt if API fails
                fallbackToRandomPrompt();
                return;
            }
            
            const generatedText = data.candidates[0].content.parts[0].text;
            console.log("Original text:", generatedText);
            
            const cleanedText = cleanPromptText(generatedText);
            console.log("Cleaned text:", cleanedText);
            
            setPrompt(cleanedText);
            
        } catch (error) {
            console.error('Error generating video description:', error);
            alert("An error occurred while generating the video description.");
            
            // Fallback to random prompt if the overall process fails
            fallbackToRandomPrompt();
        } finally {
            setIsGeneratingDesc(false);
        }
    };
    
    // Fallback function to use if the API call fails
    const fallbackToRandomPrompt = () => {
        const imagePrompts = [
            "A cinematic video sequence of a luxury sports car driving along a coastal road at sunset. The car moves from left to right with dynamic camera tracking, showcasing gleaming metallic finish reflecting the golden hour light.",
            
            "An aerial drone video of a dense forest with morning mist rising between the trees. Starting with a wide establishing shot, the camera slowly descends through the canopy, revealing the textured forest floor with dappled light.",
            
            "A detailed macro video of flowing water over smooth river stones. Shallow depth of field creates a dreamy atmosphere with bokeh highlights, while slow motion captures the intricate patterns of ripples and splashes.",
            
            "A time-lapse video of a bustling city skyline transitioning from day to night. Buildings illuminate, traffic flows through streets creating light trails, and clouds drift across the changing sky.",
            
            "A portrait-style video of a character with expressive features under dramatic lighting. Starting with a medium shot, the camera slowly pushes in toward the subject while subtle environmental elements pass between camera and subject."
        ];
        
        const randomIndex = Math.floor(Math.random() * imagePrompts.length);
        setPrompt(imagePrompts[randomIndex]);
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

    // Cleanup function for the generated video URLs to prevent memory leaks
    useEffect(() => {
        return () => {
            generatedVideos.forEach(url => {
                URL.revokeObjectURL(url);
            });
            if (uploadedImage) {
                URL.revokeObjectURL(uploadedImage);
            }
        };
    }, [generatedVideos, uploadedImage]);

    const handleEditClick = () => {
        // Store the current video data in localStorage or state management
        const videoData = {
            clips: generatedVideos.map((url, index) => ({
                id: `clip-${index}`,
                url,
                startTime: 0,
                duration: 5, // Default duration, you might want to get actual video duration
                thumbnail: url // Using video URL as thumbnail for now
            })),
            prompt,
            settings: {
                aspectRatio,
                framesPerSecond,
                shotSize,
                cameraAngle,
                motionType
            }
        };
        
        localStorage.setItem('videoEditorData', JSON.stringify(videoData));
        router.push('/create/video/editor');
    };

  return (
        <div className="flex flex-col min-h-screen bg-white text-gray-800">
            <Header />
            <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
                {/* Sidebar */}
                <div className="w-full md:w-[300px] bg-gray-50 p-5 overflow-y-auto border-r border-gray-200">
                    {/* General Settings Section */}
                    <div className="mb-6">
                        <button 
                            onClick={() => setIsGeneralSettingsOpen(!isGeneralSettingsOpen)}
                            className="w-full flex items-center justify-between mb-4"
                        >
                            <div className="flex items-center">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="mr-2 text-blue-600">
                                    <path d="M12 15.5C14.21 15.5 16 13.71 16 11.5C16 9.29 14.21 7.5 12 7.5C9.79 7.5 8 9.29 8 11.5C8 13.71 9.79 15.5 12 15.5Z" stroke="currentColor" strokeWidth="1.5"/>
                                    <path d="M3 11.5C3 14.1 4 16.1 6 18.1L4.5 20.5H9V16L7.5 17.5C6 16 5 14.5 5 11.5C5 6.3 8.8 2 12 2C14.3 2 16.4 3.3 18 5.3" stroke="currentColor" strokeWidth="1.5"/>
                                    <path d="M19 8V11H16" stroke="currentColor" strokeWidth="1.5"/>
                                    <path d="M17 16.5V18.5C17 19.6 17.9 20.5 19 20.5H21" stroke="currentColor" strokeWidth="1.5"/>
                                </svg>
                                <span className="font-semibold">General settings</span>
                            </div>
                            <svg className={`w-5 h-5 transform transition-transform ${isGeneralSettingsOpen ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none">
                                <path d="M6 9L12 15L18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                        </button>
                        
                        {isGeneralSettingsOpen && (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm mb-2">Reference Image</label>
                                    <div className="relative">
                                        <input 
                                            type="file" 
                                            ref={fileInputRef}
                                            onChange={handleImageUpload}
                                            accept="image/*"
                                            className="hidden"
                                        />
                                        <button
                                            onClick={triggerFileInput}
                                            className="w-full flex items-center justify-center p-3 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                            {uploadedImage ? (
                                                <div className="relative w-full aspect-video rounded-md overflow-hidden border border-gray-200">
                                                    <Image 
                                                        src={uploadedImage} 
                                                        alt="Uploaded reference image" 
                                                        layout="fill" 
                                                        objectFit="cover"
                                                    />
                                                </div>
                                            ) : (
                                                <div className="flex flex-col items-center">
                                                    <svg className="w-8 h-8 mb-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                    </svg>
                                                    <span className="text-sm text-gray-500">Upload reference image</span>
                                                </div>
                                            )}
                                        </button>
                                        {uploadedImage && (
                                            <button
                                                onClick={() => setUploadedImage(null)}
                                                className="absolute top-2 right-2 bg-white rounded-full p-1 shadow hover:bg-gray-100"
                                            >
                                                <svg className="w-4 h-4 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </button>
                                        )}
                                    </div>
                                </div>
                                
                                <div>
                                    <label className="block text-sm mb-2">Aspect ratio</label>
                                    <div className="relative">
                                        <select
                                            value={aspectRatio}
                                            onChange={(e) => setAspectRatio(e.target.value)}
                                            className="w-full p-2 pr-10 bg-white border border-gray-300 rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value="16:9">Widescreen (16:9)</option>
                                            <option value="4:3">Standard (4:3)</option>
                                            <option value="1:1">Square (1:1)</option>
                                            <option value="9:16">Portrait (9:16)</option>
                                        </select>
                                        <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                                            <svg className="w-5 h-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                            </svg>
                                        </div>
                                    </div>
                                </div>
                                
                                <div>
                                    <label className="block text-sm mb-2">Frames per second</label>
                                    <div className="relative">
                                        <select
                                            value={framesPerSecond}
                                            onChange={(e) => setFramesPerSecond(parseInt(e.target.value))}
                                            className="w-full p-2 pr-10 bg-white border border-gray-300 rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value="24">24 FPS (Default)</option>
                                            <option value="30">30 FPS</option>
                                            <option value="60">60 FPS</option>
                                        </select>
                                        <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                                            <svg className="w-5 h-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                            </svg>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                    
                    {/* Camera Settings Section */}
                    <div className="mb-6">
                        <button 
                            onClick={() => setIsCameraSettingsOpen(!isCameraSettingsOpen)}
                            className="w-full flex items-center justify-between mb-4"
                        >
                            <div className="flex items-center">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="mr-2 text-blue-600">
                                    <path d="M6 6H2V10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    <path d="M18 6H22V10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    <path d="M6 18H2V14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    <path d="M18 18H22V14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    <rect x="6" y="6" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="2"/>
                                </svg>
                                <span className="font-semibold">Camera</span>
                            </div>
                            <svg className={`w-5 h-5 transform transition-transform ${isCameraSettingsOpen ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none">
                                <path d="M6 9L12 15L18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                        </button>
                        
                        {isCameraSettingsOpen && (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm mb-2">Shot size</label>
                                    <div className="relative">
                                        <select
                                            value={shotSize}
                                            onChange={(e) => setShotSize(e.target.value)}
                                            className="w-full p-2 pr-10 bg-white border border-gray-300 rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value="none">None</option>
                                            <option value="extreme-close-up">Extreme Close-up</option>
                                            <option value="close-up">Close-up</option>
                                            <option value="medium">Medium Shot</option>
                                            <option value="long">Long Shot</option>
                                            <option value="extreme-long">Extreme Long Shot</option>
                                        </select>
                                        <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                                            <svg className="w-5 h-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                            </svg>
                                        </div>
                                    </div>
                                </div>
                                
                                <div>
                                    <label className="block text-sm mb-2">Camera angle</label>
                                    <div className="relative">
                                        <select
                                            value={cameraAngle}
                                            onChange={(e) => setCameraAngle(e.target.value)}
                                            className="w-full p-2 pr-10 bg-white border border-gray-300 rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value="none">None</option>
                                            <option value="eye-level">Eye Level</option>
                                            <option value="high-angle">High Angle</option>
                                            <option value="low-angle">Low Angle</option>
                                            <option value="dutch-angle">Dutch Angle</option>
                                            <option value="aerial-view">Aerial View</option>
                                        </select>
                                        <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                                            <svg className="w-5 h-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                            </svg>
                                        </div>
                                    </div>
                                </div>
                                
                                <div>
                                    <label className="block text-sm mb-2">Motion</label>
                                    <div className="grid grid-cols-2 gap-2 mb-1">
                                        <div 
                                            className={`cursor-pointer p-2 rounded-lg border ${motionType === 'zoom-in' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}
                                            onClick={() => setMotionType('zoom-in')}
                                        >
                                            <div className="flex flex-col items-center">
                                                <div className="w-16 h-12 bg-gray-200 rounded-md mb-1 flex items-center justify-center">
                                                    <svg className="w-8 h-8 text-gray-500" viewBox="0 0 24 24" fill="none">
                                                        <path d="M15 3H9M12 3V21M21 12L3 12" stroke="currentColor" strokeWidth="2"/>
                                                    </svg>
                                                </div>
                                                <span className="text-xs">Zoom in</span>
                                            </div>
                                        </div>
                                        
                                        <div 
                                            className={`cursor-pointer p-2 rounded-lg border ${motionType === 'zoom-out' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}
                                            onClick={() => setMotionType('zoom-out')}
                                        >
                                            <div className="flex flex-col items-center">
                                                <div className="w-16 h-12 bg-gray-200 rounded-md mb-1 flex items-center justify-center">
                                                    <svg className="w-8 h-8 text-gray-500" viewBox="0 0 24 24" fill="none">
                                                        <path d="M3 12H21" stroke="currentColor" strokeWidth="2"/>
                                                    </svg>
                                                </div>
                                                <span className="text-xs">Zoom out</span>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-2">
                                        <div 
                                            className={`cursor-pointer p-2 rounded-lg border ${motionType === 'move-left' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}
                                            onClick={() => setMotionType('move-left')}
                                        >
                                            <div className="flex flex-col items-center">
                                                <div className="w-16 h-12 bg-gray-200 rounded-md mb-1 flex items-center justify-center">
                                                    <svg className="w-8 h-8 text-gray-500" viewBox="0 0 24 24" fill="none">
                                                        <path d="M19 12H5M5 12L12 19M5 12L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                                    </svg>
                                                </div>
                                                <span className="text-xs">Move left</span>
                                            </div>
                                        </div>
                                        
                                        <div 
                                            className={`cursor-pointer p-2 rounded-lg border ${motionType === 'move-right' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}
                                            onClick={() => setMotionType('move-right')}
                                        >
                                            <div className="flex flex-col items-center">
                                                <div className="w-16 h-12 bg-gray-200 rounded-md mb-1 flex items-center justify-center">
                                                    <svg className="w-8 h-8 text-gray-500" viewBox="0 0 24 24" fill="none">
                                                        <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                                    </svg>
                                                </div>
                                                <span className="text-xs">Move right</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 flex flex-col p-5 overflow-y-auto bg-gray-50">
                    {/* Video Preview Area */}
                    {generatedVideos.length === 0 ? (
                        // Empty state - no videos yet
                        isGeneratingVideo ? (
                            <div className="flex-1 flex flex-col items-center justify-center mb-4">
                                <div className={`relative w-full ${aspectRatio === '16:9' ? 'aspect-video' : aspectRatio === '1:1' ? 'aspect-square' : aspectRatio === '9:16' ? 'aspect-[9/16]' : 'aspect-[4/3]'} max-w-2xl rounded-xl overflow-hidden shadow-md bg-gray-200 flex items-center justify-center`}>
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
                                <h1 className="text-2xl sm:text-3xl font-bold mb-4 text-center text-gray-800">Start generating videos</h1>
                                <p className="text-center text-gray-600 max-w-xl mb-8 px-4">
                                    Describe the video you want to generate in the prompt field below. Adjust camera and motion settings from the sidebar.
                                </p>
                            </div>
                        )
                    ) : (
                        <div className="flex-1 flex flex-col mb-4">
                            {/* Selected Video Preview or Loading State */}
                            {isGeneratingVideo ? (
                                <div className="mb-6">
                                    <div className={`relative w-full ${aspectRatio === '16:9' ? 'aspect-video' : aspectRatio === '1:1' ? 'aspect-square' : aspectRatio === '9:16' ? 'aspect-[9/16]' : 'aspect-[4/3]'} max-w-2xl mx-auto rounded-xl overflow-hidden shadow-md bg-gray-200 flex items-center justify-center`}>
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
                                    <div className={`relative w-full ${aspectRatio === '16:9' ? 'aspect-video' : aspectRatio === '1:1' ? 'aspect-square' : aspectRatio === '9:16' ? 'aspect-[9/16]' : 'aspect-[4/3]'} max-w-2xl mx-auto rounded-xl overflow-hidden shadow-sm border border-gray-100 bg-transparent`}>
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
                                    </div>
                                </div>
                            )}
                            
                            {/* Generated Videos Gallery - Always visible */}
                            <div className="mt-4 " >
                                <h3 className="text-lg font-semibold mb-3">Your Generated Videos</h3>
                                <div className="flex flex-wrap gap-4">
                                    {generatedVideos.map((videoUrl, index) => (
                                        <div 
                                            key={index} 
                                            className={`cursor-pointer border-2 rounded-lg overflow-hidden ${videoUrl === selectedVideo ? 'border-blue-500' : 'border-gray-200'}`}
                                            onClick={() => setSelectedVideo(videoUrl)}
                                        >
                                            <div className={`w-40 ${aspectRatio === '16:9' ? 'aspect-video' : aspectRatio === '1:1' ? 'aspect-square' : aspectRatio === '9:16' ? 'aspect-[9/16]' : 'aspect-[4/3]'}`}>
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

                    {/* Prompt Input Area */}
                    <div className="mt-auto">
                        <div className="bg-white rounded-t-xl border border-b-0 border-gray-200 overflow-hidden shadow-sm">
                            <div className="flex items-center border-b border-gray-200 px-4">
                                <div className="flex items-center mr-4">
                                    <button className="py-3 px-2 font-medium border-b-2 border-blue-600 text-blue-600">
                                        Prompt
                                    </button>
                                </div>
                                <div className="ml-auto">
                                    <button
                                        onClick={handleEditClick}
                                        className="flex items-center px-3 py-1.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg shadow-sm hover:from-indigo-600 hover:to-purple-700 transition-all"
                                        title="Edit video"
                                    >
                                        <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                        </svg>
                                        Edit
                                    </button>
                                </div>
                            </div>
                            
                            <div className="relative">
                                <textarea
                                    placeholder="Describe the video you want to generate"
                                    value={prompt}
                                    onChange={(e) => setPrompt(e.target.value)}
                                    className="w-full bg-transparent p-4 outline-none resize-none h-24 text-gray-800"
                                />
                                <div className="absolute inset-0 bg-gradient-to-r from-blue-50/30 via-purple-50/30 to-pink-50/30 animate-gradient bg-300% pointer-events-none rounded-b-lg" style={{ backgroundSize: '300% 300%' }}></div>
                            </div>
                        </div>

                        <div className="flex justify-end p-4 bg-white rounded-b-xl border border-t-0 border-gray-200">
                            <div className="flex items-center gap-2">
                                <AIPromptButton 
                                    onClick={generateAIDescription}
                                    isGenerating={isGeneratingDesc}
                                    size={isMobile ? 'sm' : 'md'}
                                    disabled={!uploadedImage}
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