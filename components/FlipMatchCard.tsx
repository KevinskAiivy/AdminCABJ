import React from 'react';

interface FlipMatchCardProps {
  isFlipped: boolean;
  frontContent: React.ReactNode;
  backContent: React.ReactNode;
  className?: string;
}

export const FlipMatchCard: React.FC<FlipMatchCardProps> = ({
  isFlipped,
  frontContent,
  backContent,
  className = '',
}) => {
  return (
    <div className={`group [perspective:1000px] w-full h-full ${className}`}>
      {/* Conteneur interne avec transformation 3D */}
      <div 
        className={`relative w-full h-full transition-all duration-500 [transform-style:preserve-3d] ${
          isFlipped ? '[rotate-y:180deg]' : ''
        }`}
      >
        {/* Face Avant */}
        <div 
          className="absolute inset-0 w-full h-full [backface-visibility:hidden] [transform:rotateY(0deg)]"
        >
          {frontContent}
        </div>

        {/* Face Arrière */}
        <div 
          className="absolute inset-0 w-full h-full [backface-visibility:hidden] [transform:rotateY(180deg)]"
        >
          {backContent}
        </div>
      </div>
    </div>
  );
};
