"use client";

import { useAuth, useUser } from '@clerk/nextjs';
import React, { useEffect, useState, useCallback } from 'react';

interface AuthCheckProps {
  children: React.ReactNode;
}

// This context will be used to provide authentication status to child components
export const AuthContext = React.createContext<{
  isAuthenticated: boolean;
  forceRefresh: () => void;
}>({ 
  isAuthenticated: false,
  forceRefresh: () => {}
});

export default function AuthCheck({ children }: AuthCheckProps) {
  const { isLoaded, userId, isSignedIn } = useAuth();
  const { user } = useUser();
  
  // Use state to track authentication status
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [initComplete, setInitComplete] = useState(false);
  
  // Force refresh function that can be called from any component
  const forceRefresh = useCallback(() => {
    if (isLoaded) {
      console.log("Force refresh called, checking Clerk auth state");
      
      // DIRECT CHECK: Always get the latest from Clerk
      const clerkAuthState = !!userId || !!user || !!isSignedIn;
      console.log("Clerk auth direct check:", {
        userId,
        user: !!user,
        isSignedIn,
        clerkAuthState
      });
      
      // If Clerk says authenticated, always trust it
      if (clerkAuthState) {
        console.log("Force refresh: Setting authenticated from Clerk state");
        setIsAuthenticated(true);
        window.sessionStorage.setItem('userAuthenticated', 'true');
        return;
      }
      
      // Only if Clerk says not authenticated, check session storage
      console.log("Force refresh: No Clerk auth found, checking sessionStorage");
      const storedAuth = window.sessionStorage.getItem('userAuthenticated');
      if (storedAuth === 'true') {
        console.log("Force refresh: Setting authenticated from sessionStorage");
        setIsAuthenticated(true);
      } else {
        console.log("Force refresh: No auth found, setting unauthenticated");
        setIsAuthenticated(false);
        window.sessionStorage.removeItem('userAuthenticated');
      }
    }
  }, [isLoaded, userId, user, isSignedIn]);
  
  // Initial load - only run once
  useEffect(() => {
    if (isLoaded && !initComplete) {
      console.log("Initial auth check on load");
      
      // First check Clerk state
      if (!!userId || !!user || !!isSignedIn) {
        console.log("Setting authenticated from Clerk on initial load");
        setIsAuthenticated(true);
        window.sessionStorage.setItem('userAuthenticated', 'true');
      } else {
        // Then check sessionStorage as fallback
        const storedAuth = window.sessionStorage.getItem('userAuthenticated');
        if (storedAuth === 'true') {
          console.log("Setting authenticated from sessionStorage on initial load");
          setIsAuthenticated(true);
        }
      }
      
      setInitComplete(true);
    }
  }, [isLoaded, userId, user, isSignedIn, initComplete]);
  
  // This effect updates auth state and runs when Clerk auth state changes
  useEffect(() => {
    function updateAuthState() {
      if (isLoaded && initComplete) {
        // Always check direct Clerk state
        const clerkAuthState = !!userId || !!user || !!isSignedIn;
        
        console.log("Clerk Auth State:", { 
          userId, 
          hasUser: !!user,
          isSignedIn,
          clerkAuth: clerkAuthState,
          contextAuth: isAuthenticated,
          timestamp: new Date().toISOString()
        });
        
        // Always trust Clerk if it says authenticated
        if (clerkAuthState && !isAuthenticated) {
          console.log("Clerk says authenticated, updating state");
          setIsAuthenticated(true);
          window.sessionStorage.setItem('userAuthenticated', 'true');
        }
        // Only clear if Clerk says not authenticated AND our context still says authenticated
        else if (!clerkAuthState && isAuthenticated) {
          // Double-check Clerk directly through functions
          // But don't clear right away - wait a moment to see if it's just a temporary glitch
          console.log("Warning: Clerk says not authenticated but context says authenticated");
          
          const storedAuth = window.sessionStorage.getItem('userAuthenticated');
          // If we don't have session storage auth, clear immediately
          if (storedAuth !== 'true') {
            console.log("No sessionStorage auth found, clearing auth state");
            setIsAuthenticated(false);
            window.sessionStorage.removeItem('userAuthenticated');
          }
        }
      }
    }

    // Update auth state when auth state changes
    updateAuthState();
    
    // Set up a listener for auth state changes
    if (typeof window !== 'undefined' && initComplete) {
      // Listen for Clerk's auth events
      window.addEventListener('clerk-auth-state-change', updateAuthState);
      
      // Poll for auth status every second as a fallback for quicker response
      const intervalId = setInterval(updateAuthState, 1000);
      
      return () => {
        window.removeEventListener('clerk-auth-state-change', updateAuthState);
        clearInterval(intervalId);
      };
    }
  }, [isLoaded, userId, isSignedIn, user, isAuthenticated, initComplete]);
  
  // Manual sign-out handler - if we detect localStorage sign-out but not caught by events
  useEffect(() => {
    function checkStorageChange(e: StorageEvent) {
      if (e.key === 'clerk-db' && e.newValue === null && isAuthenticated) {
        console.log("Storage event: clerk-db removed, handling sign-out");
        setIsAuthenticated(false);
        window.sessionStorage.removeItem('userAuthenticated');
      }
    }
    
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', checkStorageChange);
      return () => window.removeEventListener('storage', checkStorageChange);
    }
  }, [isAuthenticated]);
  
  // Show loading state until auth is loaded
  if (!isLoaded || !initComplete) {
    return (
      <div className="flex items-center justify-center h-16">
        <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  // Render children but provide auth context to control functionality
  return (
    <AuthContext.Provider value={{ isAuthenticated, forceRefresh }}>
      <div className="relative">
        {/* Debug indicator for dev only */}
        {process.env.NODE_ENV !== 'production' && (
          <div 
            className="fixed top-4 right-4 z-50 px-2 py-1 rounded text-xs font-mono cursor-pointer"
            style={{ 
              backgroundColor: isAuthenticated ? 'rgba(0, 255, 0, 0.2)' : 'rgba(255, 0, 0, 0.2)',
              color: isAuthenticated ? 'darkgreen' : 'darkred',
              border: `1px solid ${isAuthenticated ? 'green' : 'red'}`
            }}
            onClick={forceRefresh}
            title="Click to force auth refresh"
          >
            Auth: {isAuthenticated ? 'YES' : 'NO'} | Clerk: {!!userId ? 'YES' : 'NO'}
          </div>
        )}
        {children}
      </div>
    </AuthContext.Provider>
  );
}
