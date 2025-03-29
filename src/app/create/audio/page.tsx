"use client";

import React, { useState, ChangeEvent, useRef } from "react";
import { Button } from "@/components/ui/button";
import Header from "@/components/layout/Header";
import AIPromptButton from "@/components/ui/AIPromptButton";
import { cleanPromptText } from "@/lib/textUtils";

const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
const API_BASE_URL = "/api";

export default function AudioCreation() {
  const [text, setText] = useState("");
  const [musicPrompt, setMusicPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [charCount, setCharCount] = useState(0);
  const [musicCharCount, setMusicCharCount] = useState(0);
  const [isGeneratingPrompt, setIsGeneratingPrompt] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const maxChars = 500;
  const [activeTab, setActiveTab] = useState<"text-to-speech" | "text-to-music">("text-to-speech");
  const audioRef = useRef<HTMLAudioElement>(null);

  React.useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    
    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);
    
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  // Clean up audio URL when component unmounts
  React.useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  const handleTextChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    setText(newText);
    setCharCount(newText.length);
  };

  const handleMusicPromptChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    setMusicPrompt(newText);
    setMusicCharCount(newText.length);
  };

  const handleGenerate = async () => {
    const prompt = activeTab === "text-to-speech" ? text : musicPrompt;
    if (!prompt.trim()) return;
    
    setError(null);
    setGenerating(true);
    setAudioUrl(null);
    
    try {
      const endpoint = activeTab === "text-to-speech" 
        ? "/api/text2speech" 
        : "/api/text2music";
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          prompt: prompt,
        }),
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
  
  const handleTabChange = (tab: "text-to-speech" | "text-to-music") => {
    setActiveTab(tab);
    setAudioUrl(null);
    setError(null);
  };

  const handleDownload = () => {
    if (!audioUrl) return;
    
    const a = document.createElement('a');
    a.href = audioUrl;
    a.download = `${activeTab === "text-to-speech" ? "speech" : "music"}-${Date.now()}.${activeTab === "text-to-speech" ? "mp3" : "wav"}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const generateAIPrompt = async () => {
    const basePrompt = activeTab === "text-to-speech" ? text : musicPrompt;
    if (!basePrompt.trim()) return;
    
    try {
      setIsGeneratingPrompt(true);
      
      const requestData = {
        contents: [
          {
            parts: [
              { 
                text: activeTab === "text-to-speech" 
                  ? `Based on this text: "${basePrompt}", generate an enhanced version that would sound great when spoken. Make it expressive, clear, and suitable for text-to-speech conversion.`
                  : `Based on this description: "${basePrompt}", generate a detailed music prompt that would create an amazing AI-generated music piece. Include mood, instruments, tempo, and style.`
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
      
      if (activeTab === "text-to-speech") {
        setText(cleanedText);
        setCharCount(cleanedText.length);
      } else {
        setMusicPrompt(cleanedText);
        setMusicCharCount(cleanedText.length);
      }
    } catch (error) {
      console.error('Error generating prompt:', error);
      alert("An error occurred while generating the prompt.");
    } finally {
      setIsGeneratingPrompt(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-4xl mx-auto p-4 pt-6">
        <h1 className="text-3xl font-bold mb-6">Audio Generation</h1>

        {/* Option Selection Bar */}
        <div className="flex flex-wrap gap-3 mb-6">
          <Button 
            variant="outline" 
            className={`rounded-full bg-white shadow-sm ${activeTab === "text-to-speech" ? "border-2 border-blue-500 text-blue-600" : ""}`}
            onClick={() => handleTabChange("text-to-speech")}
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M20 2H4C2.9 2 2 2.9 2 4V22L6 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2ZM20 16H5.17L4 17.17V4H20V16Z" fill="currentColor"/>
              <path d="M12 15L17 10L15.59 8.59L13 11.17V6H11V11.17L8.41 8.59L7 10L12 15Z" fill="currentColor"/>
            </svg>
            TEXT TO SPEECH
          </Button>
          <Button 
            variant="outline" 
            className={`rounded-full bg-white shadow-sm ${activeTab === "text-to-music" ? "border-2 border-blue-500 text-blue-600" : ""}`}
            onClick={() => handleTabChange("text-to-music")}
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 3V13.55C11.41 13.21 10.73 13 10 13C7.79 13 6 14.79 6 17C6 19.21 7.79 21 10 21C12.21 21 14 19.21 14 17V7H18V3H12Z" fill="currentColor"/>
            </svg>
            TEXT TO MUSIC
          </Button>
        </div>

        {/* Main Content Area */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden border">
          {activeTab === "text-to-speech" && (
            <div>
              {/* Text Input Area */}
              <div className="p-6">
                <textarea
                  className={`w-full h-40 p-4 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    isGeneratingPrompt && activeTab === "text-to-speech"
                    ? 'bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent bg-300% animate-gradient font-bold' 
                    : 'text-gray-800'
                  }`}
                  placeholder="Enter text to convert to speech. For example: Welcome to our application! We're excited to have you here."
                  value={text}
                  onChange={handleTextChange}
                  maxLength={maxChars}
                />
                <div className="flex justify-end mt-2 text-sm text-gray-500">
                  {charCount}/{maxChars}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="p-4 border-t flex items-center justify-between">
                <div className="flex-1"></div>

                {/* Generate button */}
                <div className="flex items-center gap-2">
                  <AIPromptButton
                    onClick={generateAIPrompt}
                    disabled={isGeneratingPrompt || generating || !text.trim()}
                    isGenerating={isGeneratingPrompt && activeTab === "text-to-speech"}
                    size={isMobile ? 'sm' : 'md'}
                    tooltipText="Enhance text with AI"
                  />
                  
                  <Button 
                    className="rounded-full bg-black hover:bg-gray-800 text-white"
                    onClick={handleGenerate}
                    disabled={generating || text.trim().length === 0}
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
                  </Button>
                </div>
              </div>
            </div>
          )}

          {activeTab === "text-to-music" && (
            <div>
              {/* Text to Music content */}
              <div className="p-6">
                <textarea
                  className={`w-full h-40 p-4 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    isGeneratingPrompt && activeTab === "text-to-music"
                    ? 'bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent bg-300% animate-gradient font-bold' 
                    : 'text-gray-800'
                  }`}
                  placeholder="Describe the music you want to generate. For example: A gentle piano melody with soft strings and a calm atmosphere, perfect for meditation."
                  maxLength={maxChars}
                  value={musicPrompt}
                  onChange={handleMusicPromptChange}
                />
                <div className="flex justify-end mt-2 text-sm text-gray-500">
                  {musicCharCount}/{maxChars}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="p-4 border-t flex items-center justify-between">
                <div className="flex-1"></div>

                <div className="flex items-center gap-2">
                  <AIPromptButton
                    onClick={generateAIPrompt}
                    disabled={isGeneratingPrompt || generating || !musicPrompt.trim()}
                    isGenerating={isGeneratingPrompt && activeTab === "text-to-music"}
                    size={isMobile ? 'sm' : 'md'}
                    tooltipText="Enhance music prompt with AI"
                  />
                  
                  <Button 
                    className="rounded-full bg-black hover:bg-gray-800 text-white"
                    onClick={handleGenerate}
                    disabled={generating || musicPrompt.trim().length === 0}
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
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Audio Player Section */}
          {audioUrl && (
            <div className="p-6 border-t bg-gray-50">
              <h3 className="font-medium text-gray-800 mb-4">
                {activeTab === "text-to-speech" ? "Generated Speech" : "Generated Music"}
              </h3>
              
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <audio ref={audioRef} controls className="w-full">
                  <source src={audioUrl} type={activeTab === "text-to-speech" ? "audio/mpeg" : "audio/wav"} />
                  Your browser does not support the audio element.
                </audio>
                
                <div className="flex justify-end mt-4">
                  <Button
                    variant="outline"
                    className="rounded-full text-sm flex items-center gap-1"
                    onClick={handleDownload}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download
                  </Button>
                </div>
              </div>
            </div>
          )}
          
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
      </main>
    </div>
  );
}
