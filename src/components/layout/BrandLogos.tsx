'use client';

import React from 'react';

interface LogoProps {
  className?: string;
  size?: number;
}

// 1. TATA Official Brandmark
export function TataBrandLogo({ className = 'h-5 w-auto', size }: LogoProps) {
  return (
    <svg
      viewBox="0 0 120 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={size ? { height: size, width: 'auto' } : undefined}
    >
      {/* TATA Blue Oval with Stylized T */}
      <circle cx="20" cy="20" r="18" fill="#005B94" />
      <path
        d="M12 12H28M20 12V28M15 17H25"
        stroke="#ffffff"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* TATA Bold Typography */}
      <text
        x="44"
        y="26"
        fill="#005B94"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontSize="17"
        fontWeight="800"
        letterSpacing="2.5"
      >
        TATA
      </text>
    </svg>
  );
}

// 2. AMAZON Official Brandmark with Orange Smile
export function AmazonBrandLogo({ className = 'h-5 w-auto', size }: LogoProps) {
  return (
    <svg
      viewBox="0 0 120 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={size ? { height: size, width: 'auto' } : undefined}
    >
      {/* amazon wordmark */}
      <text
        x="6"
        y="23"
        fill="currentColor"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontSize="20"
        fontWeight="800"
        letterSpacing="-0.5"
      >
        amazon
      </text>
      {/* Iconic Orange Smile Curve with Arrow */}
      <path
        d="M15 28C38 36 68 36 88 27"
        stroke="#FF9900"
        strokeWidth="3.2"
        strokeLinecap="round"
      />
      <path
        d="M84 24L91 27L86 32"
        fill="#FF9900"
        stroke="#FF9900"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// 3. BIG BAZAAR Official Brandmark
export function BigBazaarBrandLogo({ className = 'h-5 w-auto', size }: LogoProps) {
  return (
    <svg
      viewBox="0 0 140 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={size ? { height: size, width: 'auto' } : undefined}
    >
      {/* Orange Circle Badge */}
      <circle cx="18" cy="20" r="16" fill="#F37021" />
      {/* Stylized Sunburst / Shopping Bag in White */}
      <path
        d="M12 18H24V26C24 27.1 23.1 28 22 28H14C12.9 28 12 27.1 12 26V18Z"
        fill="#ffffff"
      />
      <path
        d="M15 18V15C15 13.3 16.3 12 18 12C19.7 12 21 13.3 21 15V18"
        stroke="#ffffff"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* BIG BAZAAR Typography */}
      <text
        x="38"
        y="19"
        fill="#002D62"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontSize="13"
        fontWeight="900"
        letterSpacing="0.5"
      >
        BIG BAZAAR
      </text>
      <text
        x="38"
        y="30"
        fill="#F37021"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontSize="8"
        fontWeight="800"
        letterSpacing="1.2"
      >
        INDIA KI ASLI DUKAAN
      </text>
    </svg>
  );
}

// 4. LTIMINDTREE Official Brandmark
export function LTIMindtreeBrandLogo({ className = 'h-5 w-auto', size }: LogoProps) {
  return (
    <svg
      viewBox="0 0 140 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={size ? { height: size, width: 'auto' } : undefined}
    >
      {/* Geometric Modern Hexagon Node Symbol */}
      <path
        d="M18 7L28 13V25L18 31L8 25V13L18 7Z"
        fill="#0072CE"
        opacity="0.15"
      />
      <path
        d="M18 7L28 13M28 13V25M28 25L18 31M18 31L8 25M8 25V13M8 13L18 7"
        stroke="#0072CE"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="18" cy="19" r="3" fill="#00A3E0" />
      {/* LTIMindtree Typography */}
      <text
        x="36"
        y="25"
        fill="#0B2341"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontSize="15"
        fontWeight="800"
        letterSpacing="0.2"
      >
        LTIMindtree
      </text>
    </svg>
  );
}

// 5. UNILEVER Official Royal Blue 'U' Brandmark
export function UnileverBrandLogo({ className = 'h-5 w-auto', size }: LogoProps) {
  return (
    <svg
      viewBox="0 0 130 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={size ? { height: size, width: 'auto' } : undefined}
    >
      {/* The Unilever Famous Decorative U */}
      <g fill="#1F36C7">
        <path d="M10 9C10 7.3 11.3 6 13 6C14.7 6 16 7.3 16 9V23C16 26.3 18.7 29 22 29C25.3 29 28 26.3 28 23V9C28 7.3 29.3 6 31 6C32.7 6 34 7.3 34 9V23C34 29.6 28.6 35 22 35C15.4 35 10 29.6 10 23V9Z" />
        <circle cx="13" cy="9" r="2" fill="#ffffff" />
        <circle cx="31" cy="9" r="2" fill="#ffffff" />
        <circle cx="22" cy="27" r="2.5" fill="#ffffff" />
      </g>
      {/* Unilever Typography */}
      <text
        x="42"
        y="25"
        fill="#1F36C7"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontSize="16"
        fontWeight="700"
        letterSpacing="0.8"
      >
        Unilever
      </text>
    </svg>
  );
}

// 6. ITC Official Brandmark
export function ItcBrandLogo({ className = 'h-5 w-auto', size }: LogoProps) {
  return (
    <svg
      viewBox="0 0 120 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={size ? { height: size, width: 'auto' } : undefined}
    >
      {/* ITC Triangular Shield / Diamond Emblem */}
      <polygon
        points="18,6 32,20 18,34 4,20"
        fill="#005A36"
      />
      <polygon
        points="18,10 28,20 18,30 8,20"
        fill="#C5A059"
      />
      <polygon
        points="18,13 25,20 18,27 11,20"
        fill="#ffffff"
      />
      {/* ITC Bold Typography */}
      <text
        x="40"
        y="25"
        fill="#005A36"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontSize="17"
        fontWeight="900"
        letterSpacing="2.5"
      >
        ITC
      </text>
      <text
        x="80"
        y="25"
        fill="#C5A059"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontSize="11"
        fontWeight="700"
      >
        Ltd.
      </text>
    </svg>
  );
}

// 7. Premium Executive Luxury Brandmark
export function PremiumExecutiveBrandLogo({ className = 'h-5 w-auto', size }: LogoProps) {
  return (
    <svg
      viewBox="0 0 130 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={size ? { height: size, width: 'auto' } : undefined}
    >
      {/* Luxury Royal Star / Shield */}
      <circle cx="18" cy="20" r="16" fill="#4F46E5" />
      <path
        d="M18 10L20.5 16.5L27 18L20.5 21.5L18 28L15.5 21.5L9 18L15.5 16.5L18 10Z"
        fill="#FBBF24"
      />
      {/* Executive Typography */}
      <text
        x="40"
        y="21"
        fill="currentColor"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontSize="13"
        fontWeight="800"
        letterSpacing="1"
      >
        PREMIUM
      </text>
      <text
        x="40"
        y="31"
        fill="#4F46E5"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontSize="8.5"
        fontWeight="800"
        letterSpacing="2"
      >
        EXECUTIVE
      </text>
    </svg>
  );
}

// Universal Brand Logo Selector by ID
export function BrandTemplateLogo({
  templateId,
  className = 'h-5.5 w-auto',
}: {
  templateId: string;
  className?: string;
}) {
  switch (templateId) {
    case 'tata':
      return <TataBrandLogo className={className} />;
    case 'amazon':
      return <AmazonBrandLogo className={className} />;
    case 'bigbazaar':
      return <BigBazaarBrandLogo className={className} />;
    case 'ltim':
      return <LTIMindtreeBrandLogo className={className} />;
    case 'unilever':
      return <UnileverBrandLogo className={className} />;
    case 'itc':
      return <ItcBrandLogo className={className} />;
    case 'premium':
    default:
      return <PremiumExecutiveBrandLogo className={className} />;
  }
}
