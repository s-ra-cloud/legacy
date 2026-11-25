import type { ButtonHTMLAttributes, ReactNode } from "react";

interface StyledButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  text?: string;
  className?: string;
  children?: ReactNode;
}

export function StyledButton({ text, className = "", children, ...rest }: StyledButtonProps) {
  return (
    <button
      {...rest}
      className={`relative px-8 py-3 rounded-lg text-[#17161F] text-sm sm:text-xl font-bold transition-all duration-300 hover:text-white hover:brightness-75 hover:saturate-150 ${className}`}
      style={{
        background:
          "radial-gradient(ellipse at center, #A9B0C2 50%, #E3CCD2 100%)",
        boxShadow: "0 0 8px rgba(2, 138, 97)",
      }}
    >
      <span
        style={{
          textShadow:
            "0 0 2px rgba(2, 138, 97, 0.1), " +
            "0 0 4px rgba(2, 138, 97, 0.1), " +
            "0 0 6px rgba(2, 138, 97, 0.1), " +
            "0 0 8px rgba(2, 138, 97, 0.1)",
        }}
        className="font-medium"
      >
        {text || children}
      </span>
    </button>
  );
}
