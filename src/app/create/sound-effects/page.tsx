"use client";

import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import Header from "@/components/layout/Header";
import AudioWaveAnimation from "@/components/ui/AudioWaveAnimation";

const SoundEffects = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [generating, setGenerating] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [duration, setDuration] = useState<number | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    
    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);
    
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => setIsPlaying(false);
    
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);
    
    return () => {
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [audioUrl]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handlePromptChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPrompt(e.target.value);
  };

  const handleDurationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    setDuration(isNaN(value) ? null : value);
  };

  const handleGenerate = async () => {
    if (!selectedFile) return;
    
    setError(null);
    setGenerating(true);
    setAudioUrl(null);
    
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      
      if (prompt) {
        formData.append('prompt', prompt);
      }
      
      if (duration !== null) {
        formData.append('duration', duration.toString());
      }
      
      const response = await fetch('/api/img2sound', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorText = errorData.error || `API error: ${response.status} ${response.statusText}`;
        const details = errorData.details ? `\nDetails: ${errorData.details}` : '';
        throw new Error(`${errorText}${details}`);
      }
      
      // Get audio data as blob
      const audioBlob = await response.blob();
      const url = URL.createObjectURL(audioBlob);
      setAudioUrl(url);
      
      // Play the audio automatically
      if (audioRef.current) {
        audioRef.current.load();
        audioRef.current.play().catch(e => console.error("Audio playback error:", e));
      }
    } catch (error) {
      console.error('Error generating audio:', error);
      
      let errorMessage = 'An error occurred while generating audio';
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        errorMessage = 'Failed to connect to the audio generation service. The server might be down or there may be network issues.';
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!audioUrl) return;
    
    const a = document.createElement('a');
    a.href = audioUrl;
    a.download = `sound-effect-${Date.now()}.wav`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleAddToGallery = async () => {
    if (!audioUrl) {
      console.error("No generated audio to add to gallery");
      return;
    }
    
    try {
      // Show loading state
      setGenerating(true);
      
      // Get the audio content
      const response = await fetch(audioUrl);
      const blob = await response.blob();
      
      // Convert to base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onloadend = () => {
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
        prompt: prompt || 'Image to Sound conversion',
        contentData: base64Content,
        contentType: 'audio/wav',
        settings: {
          isAudio: true,
          audioType: 'SoundEffect',
          imageFileName: selectedFile?.name
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
      setGenerating(false);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="flex flex-col min-h-screen bg-white text-gray-800">
      <Header />
      <div className="flex-1 bg-gray-50">
        <AudioWaveAnimation 
          color="#3b82f6"
        />

        <main className="max-w-4xl mx-auto p-4 pt-6">
          <h1 className="text-2xl font-bold mb-6 text-gray-800">Sound Effects Generation</h1>

          {/* Main Content Area */}
          <div className="bg-white rounded-lg shadow-sm overflow-hidden border">
            <div className="p-6">
              <div className="mb-6">
                <label htmlFor="image-upload" className="block text-sm font-medium text-gray-700 mb-2">
                  Upload Image
                </label>
                <div className="mt-1 flex items-center">
                  <input
                    ref={fileInputRef}
                    type="file"
                    id="image-upload"
                    className="hidden"
                    accept="image/*"
                    onChange={handleFileChange}
                  />
                  <Button 
                    onClick={triggerFileInput}
                    className="bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 rounded-lg"
                  >
                    <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M4 16L8.586 11.414C9.367 10.633 10.632 10.633 11.414 11.414L16 16M14 14L15.586 12.414C16.367 11.633 17.632 11.633 18.414 12.414L20 14M14 8H14.01M6 20H18C19.1 20 20 19.1 20 18V6C20 4.9 19.1 4 18 4H6C4.9 4 4 4.9 4 6V18C4 19.1 4.9 20 6 20Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    {selectedFile ? 'Change Image' : 'Choose Image'}
                  </Button>
                  {selectedFile && (
                    <span className="ml-3 text-sm text-gray-600">
                      {selectedFile.name}
                    </span>
                  )}
                </div>
              </div>

              <div className="mb-6">
                <label htmlFor="prompt" className="block text-sm font-medium text-gray-700 mb-2">
                  Prompt (Optional)
                </label>
                <input
                  type="text"
                  id="prompt"
                  className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Describe how the sound should be generated from the image"
                  value={prompt}
                  onChange={handlePromptChange}
                />
              </div>

              <div className="mb-6">
                <label htmlFor="duration" className="block text-sm font-medium text-gray-700 mb-2">
                  Duration in Seconds (Optional)
                </label>
                <input
                  type="number"
                  id="duration"
                  className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter duration in seconds"
                  value={duration === null ? '' : duration}
                  onChange={handleDurationChange}
                  min="1"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="p-4 border-t flex items-center justify-between bg-gray-50">
              <div className="flex-1"></div>

              {/* Generate button */}
              <div className="flex items-center gap-2">
                <Button 
                  className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white relative group"
                  onClick={handleGenerate}
                  disabled={generating || !selectedFile}
                >
                  {generating ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Generating...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM10 16.5V7.5L16 12L10 16.5Z" fill="currentColor"/>
                      </svg>
                      Generate
                    </>
                  )}
                  {!selectedFile && (
                    <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-white border border-gray-200 text-gray-800 text-xs px-2 py-1 rounded shadow-sm opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                      Please upload an image
                    </div>
                  )}
                </Button>
              </div>
            </div>
            
            {/* Error Message */}
            {error && (
              <div className="p-4 border-t bg-red-50 text-red-700">
                <div className="flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{error}</span>
                </div>
              </div>
            )}
          </div>
          
          {audioUrl && (
          <div className="w-full relative overflow-hidden border-b border-gray-200 mt-4">
            <div className={`absolute inset-0 bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 opacity-70 transition-opacity duration-500 ${
              isPlaying ? 'opacity-70' : 'opacity-0'
            }`} />
            
            <div className="relative z-10 max-w-7xl mx-auto">
              <div className="flex items-center justify-between py-4 px-6">
                <h3 className="font-medium text-gray-800">
                  Generated Sound Effect
                </h3>
                
                {/* Button container */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-lg text-xs flex items-center gap-1 border-blue-600 text-blue-600 hover:bg-blue-50"
                    onClick={handleDownload}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download
                  </Button>
                
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
              
              {/* Audio Controls */}
              <div className="flex justify-center pb-6 px-6">
                <audio 
                  ref={audioRef} 
                  controls 
                  className="w-full max-w-2xl"
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  onEnded={() => setIsPlaying(false)}
                >
                  <source src={audioUrl} type="audio/wav" />
                  Your browser does not support the audio element.
                </audio>
              </div>
            </div>
          </div>
        )}
        </main>
      </div>
    </div>
  );
};

export default SoundEffects;