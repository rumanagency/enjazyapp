import React from 'react';

const Button = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  className = '', 
  ...props 
}) => {
  const baseStyles = "inline-flex items-center justify-center font-bold rounded-full transition-all duration-300 ease-bounce active:scale-95 focus:outline-none focus:ring-4 focus:ring-opacity-50 disabled:opacity-50 disabled:pointer-events-none";
  
  const variants = {
    primary: "bg-[#49b5d0] text-white hover:bg-[#3ba2bb] shadow-[0_4px_0_0_#338296] hover:shadow-[0_2px_0_0_#338296] hover:translate-y-[2px] focus:ring-[#49b5d0]",
    secondary: "bg-[#f0a63e] text-white hover:bg-[#e0942c] shadow-[0_4px_0_0_#b57b1f] hover:shadow-[0_2px_0_0_#b57b1f] hover:translate-y-[2px] focus:ring-[#f0a63e]",
    success: "bg-[#488b40] text-white hover:bg-[#3e7837] shadow-[0_4px_0_0_#2b5726] hover:shadow-[0_2px_0_0_#2b5726] hover:translate-y-[2px] focus:ring-[#488b40]",
    danger: "bg-[#c15b40] text-white hover:bg-[#a64e37] shadow-[0_4px_0_0_#7a3826] hover:shadow-[0_2px_0_0_#7a3826] hover:translate-y-[2px] focus:ring-[#c15b40]",
    outline: "border-2 border-[#49b5d0] text-[#49b5d0] hover:bg-[#49b5d0] hover:text-white focus:ring-[#49b5d0]"
  };

  const sizes = {
    sm: "px-4 py-2 text-sm",
    md: "px-6 py-3 text-base",
    lg: "px-8 py-4 text-xl"
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;
