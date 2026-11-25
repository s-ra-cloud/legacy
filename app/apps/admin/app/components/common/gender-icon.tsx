import type React from "react";
import { cn } from "~/lib/utils";

interface GenderIconProps {
  className?: string;
}

export function MaleIcon({ className = "w-5 h-5 text-blue-600" }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={cn(className)}
      aria-hidden="true"
    >
      <path d="M12 2C9.519 2 7.5 4.019 7.5 6.5S9.519 11 12 11s4.5-2.019 4.5-4.5S14.481 2 12 2zm0 6a1.5 1.5 0 110-3 1.5 1.5 0 010 3z" />
      <path d="M12 12c-1.425 0-2.775 0.3-4 0.825V16h2v6h4v-6h2v-3.175C14.775 12.3 13.425 12 12 12z" />
    </svg>
  );
}

export function FemaleIcon({ className = "w-5 h-5 text-pink-600" }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={cn(className)}
      aria-hidden="true"
    >
      <path d="M7.5 6.5C7.5 8.981 9.519 11 12 11s4.5-2.019 4.5-4.5S14.481 2 12 2 7.5 4.019 7.5 6.5zM12 8a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" />
      <path d="M14 16.5v6h-4v-6H7l2.5-7h5l2.5 7h-3z" />
    </svg>
  );
}

export const GenderIcon: React.FC<{
  isMale: boolean;
  className?: string;
  maleColor?: string;
  femaleColor?: string;
}> = ({
  isMale,
  className = "w-5 h-5",
  maleColor = "text-blue-600",
  femaleColor = "text-pink-600",
}) => {
  const iconClass = cn(className, isMale ? maleColor : femaleColor);

  return isMale ? (
    <MaleIcon className={iconClass} />
  ) : (
    <FemaleIcon className={iconClass} />
  );
};

export default GenderIcon;
