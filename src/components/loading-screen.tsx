
"use client"

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LoadingScreen() {
  const [displayedText, setDisplayedText] = useState('');
  const [currentLetterIndex, setCurrentLetterIndex] = useState(-1);
  const [fadeOut, setFadeOut] = useState(false);
  const router = useRouter();

  const fullText = 'CollaBoard';

  useEffect(() => {
    let currentIndex = 0;
    const typingInterval = setInterval(() => {
      if (currentIndex <= fullText.length) {
        setDisplayedText(fullText.slice(0, currentIndex));
        setCurrentLetterIndex(currentIndex - 1);
        currentIndex++;
      } else {
        clearInterval(typingInterval);
        setCurrentLetterIndex(-1);
        // Start fade out after a brief pause
        setTimeout(() => {
          setFadeOut(true);
          // Redirect after fade completes
          setTimeout(() => {
            router.push('/');
          }, 800);
        }, 500);
      }
    }, 2500 / fullText.length);

    return () => clearInterval(typingInterval);
  }, [router]);

  return (
    <div className={`fixed inset-0 overflow-hidden transition-all duration-800 ${fadeOut ? 'opacity-0 scale-110' : 'opacity-100 scale-100'}`}>
      {/* Animated background */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-black to-gray-800">
        {/* Floating particles */}
        <div className="absolute inset-0">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-primary/70 rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animation: `float ${3 + Math.random() * 4}s ease-in-out infinite`,
                animationDelay: `${Math.random() * 2}s`
              }}
            />
          ))}
        </div>
        
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="w-full h-full" style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)',
            backgroundSize: '50px 50px'
          }} />
        </div>
      </div>

      {/* Main text container */}
      <div className="absolute inset-0 flex items-center justify-center px-4">
        <div className="text-center relative max-w-full">
          {/* Glow effect behind text */}
          <div className="absolute inset-0 blur-xl">
            <h1 className="text-8xl sm:text-9xl md:text-10xl lg:text-11xl xl:text-12xl font-bold text-primary tracking-wider opacity-50 whitespace-nowrap" 
                style={{ fontSize: 'clamp(4rem, 15vw, 12rem)' }}>
              {displayedText}
            </h1>
          </div>
          
          {/* Main text with individual letter animations */}
          <h1 className="relative font-bold tracking-wider whitespace-nowrap" 
              style={{ fontSize: 'clamp(4rem, 15vw, 12rem)' }}>
            {displayedText.split('').map((letter, index) => (
              <span
                key={index}
                className={`inline-block transition-all duration-500 ${
                  index === currentLetterIndex 
                    ? 'text-primary scale-125 animate-pulse drop-shadow-lg' 
                    : 'text-white'
                }`}
                style={{
                  textShadow: index === currentLetterIndex 
                    ? '0 0 30px hsl(var(--primary)), 0 0 60px hsl(var(--primary)), 0 0 90px hsl(var(--primary) / 0.5)'
                    : '0 0 20px rgba(255,255,255,0.3)',
                  animation: index < currentLetterIndex 
                    ? `letterFloat ${2 + (index * 0.1)}s ease-in-out infinite` 
                    : undefined,
                  animationDelay: `${index * 0.1}s`
                }}
              >
                {letter === ' ' ? '\u00A0' : letter}
              </span>
            ))}
            
            {/* Animated cursor */}
            {displayedText.length < fullText.length && (
              <span className="inline-block bg-primary ml-2 animate-pulse" 
                    style={{
                      width: 'clamp(0.25rem, 1vw, 0.75rem)',
                      height: 'clamp(3rem, 12vw, 9rem)',
                      boxShadow: '0 0 20px hsl(var(--primary)), 0 0 40px hsl(var(--primary) / 0.7)',
                      animation: 'cursor 1s ease-in-out infinite'
                    }} />
            )}
          </h1>
          
          {/* Progress bar */}
          <div className="mt-8 sm:mt-12 w-80 md:w-96 mx-auto">
            <div className="h-1 bg-gray-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-primary/80 to-primary transition-all duration-300"
                style={{ 
                  width: `${(displayedText.length / fullText.length) * 100}%`,
                  boxShadow: '0 0 10px hsl(var(--primary) / 0.5)'
                }} 
              />
            </div>
            <p className="text-gray-400 text-sm mt-3 tracking-wide">
              Loading your experience...
            </p>
          </div>
        </div>
      </div>

      {/* Corner accent effects */}
      <div className="absolute top-0 left-0 w-32 h-32 border-t-2 border-l-2 border-primary/60" />
      <div className="absolute top-0 right-0 w-32 h-32 border-t-2 border-r-2 border-primary/60" />
      <div className="absolute bottom-0 left-0 w-32 h-32 border-b-2 border-l-2 border-primary/60" />
      <div className="absolute bottom-0 right-0 w-32 h-32 border-b-2 border-r-2 border-primary/60" />
    </div>
  );
}
