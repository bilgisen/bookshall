'use client';

import React from 'react';

import { Logo } from '@/components/navbar-04/logo';
import { NavMenu } from '@/components/navbar-04/nav-menu';

export default function Hero() {
  return (
    <section className="relative w-full h-96 flex flex-col overflow-hidden">
      {/* Navbar */}
      <nav className="fixed top-4 inset-x-6 h-14  backdrop-blur-xl bg-white/40 dark:bg-black/20 border border-white/20 dark:border-white/10 shadow-lg max-w-screen-sm mx-auto rounded-full z-50">
        <div className="h-full flex items-center justify-between mx-auto px-4">
          <Logo />

          {/* Desktop Menu */}
          <NavMenu className="hidden md:block" />


        </div>
      </nav>

      {/* Hero Body */}
      <div className="relative flex-1 flex items-center bg-background justify-center">
        {/* Glitch arka plan */}

        {/* İçerik */}
        <div className="relative z-10 text-center mt-12 px-6 max-w-5xl">
          {/* Badge */}


          {/* Title */}
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-foreground my-4">
            Transparent Simple Pricing
        
          </h1>

          {/* Description */}
          <p className="text-lg md:text-xl text-gray-700 dark:text-gray-300 mb-8">
          Flexible options to fit your publishing needs
          </p>


        </div>

        {/* Gradient Overlay (dark/light uyumlu kontrast için) */}
        <div className="absolute inset-0 bg-gradient-to-t from-white/70 dark:from-black/70 to-transparent" />
      </div>
    </section>
  );
}
