import React from 'react';

export function PdfDocumentIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Outer document sheet with folded corner */}
      <path
        d="M14 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V8L14 2Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Folded corner flap */}
      <path
        d="M14 2V8H20"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Vector 'P' */}
      <path
        d="M7 14.5V18M7 14.5H8.6C9.15 14.5 9.6 14.95 9.6 15.5C9.6 16.05 9.15 16.5 8.6 16.5H7"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Vector 'D' */}
      <path
        d="M11.5 14.5V18M11.5 14.5H13C13.8 14.5 14.5 15.17 14.5 16C14.5 16.83 13.8 17.5 13 17.5H11.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Vector 'F' */}
      <path
        d="M16.5 14.5H18.5M16.5 16.2H18M16.5 14.5V18"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
