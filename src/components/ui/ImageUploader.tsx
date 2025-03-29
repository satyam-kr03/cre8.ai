"use client";

import React, { useState, useRef, ChangeEvent, useEffect } from 'react';
import Image from 'next/image';

interface UploadedFile extends File {
    name: string;
    type: string;
    preview?: string;
}

interface ImageUploaderProps {
    onImageUpload: (file: UploadedFile) => void;
    uploadedImage: UploadedFile | null;
    className?: string;
}

export default function ImageUploader({ onImageUpload, uploadedImage, className = "" }: ImageUploaderProps) {
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Cleanup function for object URLs to prevent memory leaks
    useEffect(() => {
        // When component unmounts or previewUrl changes, revoke the old object URL
        return () => {
            if (previewUrl) {
                URL.revokeObjectURL(previewUrl);
            }
        };
    }, [previewUrl]);

    const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const fileWithPreview = file as UploadedFile;
            
            // Create preview URL
            const url = URL.createObjectURL(file);
            fileWithPreview.preview = url;
            setPreviewUrl(url);
            
            // Call the parent's callback
            onImageUpload(fileWithPreview);
        }
    };

    const triggerFileInput = () => {
        fileInputRef.current?.click();
    };

    return (
        <div className={`border border-dashed border-gray-500 rounded-lg p-4 text-center ${className}`}>
            {!uploadedImage ? (
                <div className="flex flex-col items-center mb-2">
                    <button 
                        type="button" 
                        onClick={triggerFileInput} 
                        className="cursor-pointer flex flex-col items-center"
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="mb-2">
                            <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" />
                            <path d="M12 7V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            <path d="M7 12H17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                        <span className="text-sm">Upload image</span>
                    </button>
                    <input 
                        ref={fileInputRef}
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={handleImageUpload}
                    />
                </div>
            ) : (
                <div className="flex flex-col items-center">
                    <div className="relative w-full h-32 mb-2 overflow-hidden rounded">
                        <Image 
                            src={previewUrl || uploadedImage.preview || ''}
                            alt={uploadedImage.name}
                            fill
                            className="object-cover"
                        />
                        <button
                            type="button"
                            onClick={triggerFileInput}
                            className="absolute bottom-2 right-2 bg-black bg-opacity-60 rounded-full p-1"
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                <path d="M3 18H21V16H3V18ZM3 13H21V11H3V13ZM3 6V8H21V6H3Z" fill="white" />
                            </svg>
                        </button>
                    </div>
                    <div className="text-xs text-gray-300 truncate max-w-full">
                        {uploadedImage.name}
                    </div>
                    <input 
                        ref={fileInputRef}
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={handleImageUpload}
                    />
                </div>
            )}
        </div>
    );
} 