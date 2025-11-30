import { Metadata } from "next";
import AuthButton from '@/components/AuthButton';
import Image from 'next/image';

export const metadata: Metadata = {
  title: "Login - Naikkelas",
  description: "Sign in to Naikkelas",
};

export default function LoginPage() {
  return (
    <div className="flex min-h-screen w-full relative">
      {/* Left Pane: Image */}
      <div
        className="hidden md:flex md:w-1/2 bg-cover bg-center relative overflow-hidden"
        style={{ backgroundImage: 'url(/images/login.jpg)' }}
      >
        {/* Optional: Overlay for text readability or aesthetic effect */}
        <div className="absolute inset-0 bg-black opacity-20"></div>
      </div>

      {/* Right Pane: Login Form */}
      <div className="flex w-full md:w-1/2 items-center justify-center bg-white p-4 relative">
        <div className="w-full max-w-md p-8 space-y-6 text-center">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-foreground">
              <span className="bg-gradient-to-r from-purple-600 via-blue-500 to-purple-600 bg-clip-text text-transparent">Naikkelas</span>
            </h1>
            <p className="text-muted-foreground text-base">
              Sign in to continue to your AI assistant.
            </p>
          </div>
          <div className="pt-4">
            <AuthButton />
          </div>
        </div>
      </div>
    </div>
  );
}
