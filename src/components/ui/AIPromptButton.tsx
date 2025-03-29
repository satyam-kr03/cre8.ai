"use client";

import React from 'react';
import { Button } from "@/components/ui/button";

interface AIPromptButtonProps {
  isGenerating: boolean;
  onClick: () => void;
  disabled?: boolean;
  tooltipText?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  position?: 'inline' | 'absolute';
}

export default function AIPromptButton({
  isGenerating,
  onClick,
  disabled = false,
  tooltipText = "Auto Generate Prompt",
  className = "",
  size = 'md',
  position = 'inline'
}: AIPromptButtonProps) {
  // Determine button size based on the size prop
  const buttonSize = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-10 h-10'
  }[size];

  return (
    <button 
      onClick={onClick}
      disabled={isGenerating || disabled}
      className={`
        ${buttonSize} 
        flex items-center justify-center 
        rounded-lg bg-[#333333] 
        group relative 
        ${position === 'absolute' ? 'absolute top-2 right-2' : ''}
        ${disabled && !isGenerating ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        transition-all duration-300
        ${className}
      `}
      title={tooltipText}
    >
      <span className={`material-icons ${
        isGenerating 
          ? 'bg-gradient-to-r from-purple-200 via-blue-200 to-white bg-clip-text text-transparent bg-300% animate-gradient' 
          : 'text-blue-400 hover:text-blue-300 transition-colors'
      }`}>
        auto_awesome
      </span>
      {tooltipText && (
        <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
          {tooltipText}
        </div>
      )}
    </button>
  );
} 