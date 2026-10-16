'use client';

import React from 'react';
import Link from 'next/link';

interface LogoProps {
  className?: string;
  compact?: boolean;
}

interface MarkProps {
  className?: string;
  size?: number;
}

/**
 * Reusable Minimalist Precision Geometric Invoice & Ledger Emblem
 */
export function InvoiceProMark({ className = '', size = 34 }: MarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 34 34"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 transition-transform duration-200 ${className}`}
      aria-label="InvoicePro Logo"
    >
      {/* Precision Rounded Outer Boundary */}
      <rect
        x="0.75"
        y="0.75"
        width="32.5"
        height="32.5"
        rx="9"
        className="fill-primary stroke-primary/30"
        strokeWidth="1.5"
      />

      {/* Invoice Document Body with Fold Corner */}
      <path
        d="M10 10.5C10 9.67157 10.6716 9 11.5 9H18.5L24 14.5V23.5C24 24.3284 23.3284 25 22.5 25H11.5C10.6716 25 10 24.3284 10 23.5V10.5Z"
        fill="white"
        fillOpacity="0.18"
      />
      <path
        d="M10 10.5C10 9.67157 10.6716 9 11.5 9H18.5L24 14.5V23.5C24 24.3284 23.3284 25 22.5 25H11.5C10.6716 25 10 24.3284 10 23.5V10.5Z"
        stroke="white"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Precision Fold Flap */}
      <path
        d="M18.5 9V14.5H24"
        stroke="white"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Document Ledger Data Lines */}
      <line
        x1="13.5"
        y1="16"
        x2="16.5"
        y2="16"
        stroke="white"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <line
        x1="13.5"
        y1="19.5"
        x2="20.5"
        y2="19.5"
        stroke="white"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Logo({ className, compact = false }: LogoProps) {
  return (
    <Link
      href="/"
      className={`inline-flex items-center gap-3 group focus:outline-hidden select-none ${className || ''}`}
      title="InvoicePro"
    >
      {/* Minimal, Luxury Geometric Vector Mark */}
      <div className="relative shrink-0 flex items-center justify-center">
        <InvoiceProMark size={34} />
      </div>

      {/* Clean, Premium Typography - Minimalist & Confident */}
      {!compact && (
        <span className="text-base font-bold tracking-tight text-foreground font-sans">
          Invoice<span className="text-primary font-black">Pro</span>
        </span>
      )}
    </Link>
  );
}

