import React from 'react';

interface AvatarProps {
  name: string;
  size?: 'sm' | 'md' | 'lg';
  borderColor?: string;
  bgColor?: string;
}

export const Avatar: React.FC<AvatarProps> = ({ 
  name, 
  size = 'md', 
  borderColor = '#C9A87C',
  bgColor = '#E8DDD0'
}) => {
  const sizeMap = {
    sm: 'w-12 h-12 text-lg',
    md: 'w-16 h-16 text-2xl',
    lg: 'w-24 h-24 text-4xl',
  };

  return (
    <div
      className={`${sizeMap[size]} rounded-full flex items-center justify-center font-serif font-medium text-text-primary border-2`}
      style={{ 
        backgroundColor: bgColor,
        borderColor: borderColor,
        boxShadow: '0 4px 12px rgba(74, 63, 53, 0.1)'
      }}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
};