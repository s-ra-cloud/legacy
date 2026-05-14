// First, create this component in your project (e.g., in components/gender-toggle.tsx)
import React from "react";
import { FemaleIcon, MaleIcon } from "./gender-icon";

type Gender = "MALE" | "FEMALE";

interface GenderToggleProps {
  value?: Gender;
  onChange: (gender: Gender) => void;
  disabled?: boolean;
}

function GenderToggle({ value, onChange, disabled }: GenderToggleProps) {
  const handleToggle = () => {
    const newGender = value === "MALE" ? "FEMALE" : "MALE";
    onChange(newGender);
  };

  const isMale = value === "MALE";
  const bgColor = isMale ? "bg-blue-100" : "bg-pink-100";
  const hoverColor = isMale ? "hover:bg-blue-200" : "hover:bg-pink-200";
  const borderColor = isMale ? "border-blue-500" : "border-pink-500";
  const textColor = isMale ? "text-blue-600" : "text-pink-600";

  return (
    <button
      type="button"
      onClick={handleToggle}
      className={`h-9 w-9 rounded-md border ${borderColor} ${bgColor} ${hoverColor} mx-auto flex flex-col items-center justify-center transition-all`}
      aria-label={`Currently ${isMale ? "male" : "female"}, click to toggle`}
      disabled={disabled}
    >
      <div className="flex items-center justify-center">
        {isMale ? <MaleIcon /> : <FemaleIcon />}
      </div>
    </button>
  );
}

export default GenderToggle;
