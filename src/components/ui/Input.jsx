import React from 'react';

const Input = ({ label, id, error, className = '', ...props }) => {
  return (
    <div className="flex flex-col gap-2 w-full">
      {label && (
        <label htmlFor={id} className="text-[#352c3c] font-bold text-lg px-2">
          {label}
        </label>
      )}
      <input
        id={id}
        className={`w-full px-6 py-4 rounded-3xl border-2 border-[#e2d5cc] bg-white text-[#333333] placeholder-[#a99c92] outline-none transition-all duration-300 focus:border-[#49b5d0] focus:ring-4 focus:ring-[#49b5d0]/20 ${
          error ? 'border-[#c15b40] focus:border-[#c15b40] focus:ring-[#c15b40]/20' : ''
        } ${className}`}
        {...props}
      />
      {error && <span className="text-[#c15b40] text-sm px-4 font-bold">{error}</span>}
    </div>
  );
};

export default Input;
