import React from 'react';

const Card = ({ children, className = '', ...props }) => {
  return (
    <div 
      className={`bg-white rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-[#f0e6de] ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export default Card;
