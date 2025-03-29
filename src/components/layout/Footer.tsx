import Link from "next/link";
import Image from "next/image";

export default function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200 pt-12 pb-6">
      <div className="max-w-screen-2xl mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center border-t border-gray-200 pt-6">
          <div className="mb-4 md:mb-0">
            <Link href="/" className="inline-block">
             
            </Link>
          </div>

        </div>

        <div className="text-center mt-6">
          <p className="text-xs text-gray-500">Copyright © 2023-2025 Cre8.ai. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
