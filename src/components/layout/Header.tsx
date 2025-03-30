import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { SignedIn } from "@clerk/nextjs";
import { SignedOut, SignInButton } from "@clerk/nextjs";
import { UserButton } from "@clerk/nextjs";

export default function Header() {
  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="flex items-center justify-between p-4 max-w-screen-2xl mx-auto">
        <div className="flex items-center gap-4">
          <button className="md:hidden">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 18H21V16H3V18ZM3 13H21V11H3V13ZM3 6V8H21V6H3Z" fill="currentColor" />
            </svg>
          </button>
          <Link href="/" className="text-2xl font-bold bg-gradient-to-r from-purple-600 via-blue-500 to-indigo-500 text-transparent bg-clip-text">
            Cre8Ai
          </Link>
          <nav className="hidden md:flex items-center space-x-6 ml-6">
            <Link href="/" className="text-sm font-medium text-gray-700 hover:text-gray-900">Home</Link>
            <Link href="/about" className="text-sm font-medium text-gray-700 hover:text-gray-900">About</Link>
            <Link href="/help" className="text-sm font-medium text-gray-700 hover:text-gray-900">Help</Link>
            <SignedIn>
              <Link href="/gallery" className="text-sm font-medium text-blue-600 hover:text-blue-800">
                My Gallery
              </Link>
            </SignedIn>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <SignedIn>
          
          <UserButton />
        </SignedIn>
        <SignedOut>
        <SignInButton mode="modal"> 
        <Button variant="outline" className="border-gray-300 hover:bg-gray-100"> Sign in</Button>
        </SignInButton>
        </SignedOut>  
        </div>
      </div>
    </header>
  );
}
