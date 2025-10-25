import type { FC } from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
  size?: 'sm' | 'md' | 'lg';
  outline?: boolean;
  icon?: React.ReactNode;
  className?: string;
}

const variantClasses = {
  primary: {
    solid: 'bg-blue-100 text-blue-800',
    outline: 'border border-blue-500 text-blue-700 bg-transparent'
  },
  secondary: {
    solid: 'bg-gray-100 text-gray-800',
    outline: 'border border-gray-500 text-gray-700 bg-transparent'
  },
  success: {
    solid: 'bg-green-100 text-green-800',
    outline: 'border border-green-500 text-green-700 bg-transparent'
  },
  warning: {
    solid: 'bg-yellow-100 text-yellow-800',
    outline: 'border border-yellow-500 text-yellow-700 bg-transparent'
  },
  error: {
    solid: 'bg-red-100 text-red-800',
    outline: 'border border-red-500 text-red-700 bg-transparent'
  },
  info: {
    solid: 'bg-indigo-100 text-indigo-800',
    outline: 'border border-indigo-500 text-indigo-700 bg-transparent'
  }
};

const sizeClasses = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-0.5 text-sm',
  lg: 'px-3 py-1 text-base'
};

export const Badge: FC<BadgeProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  outline = false,
  icon,
  className = '',
}) => {
  return (
    <span
      className={`
        inline-flex
        items-center
        gap-1
        rounded-full
        font-medium
        ${variantClasses[variant][outline ? 'outline' : 'solid']}
        ${sizeClasses[size]}
        ${className}
      `}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      {children}
    </span>
  );
};