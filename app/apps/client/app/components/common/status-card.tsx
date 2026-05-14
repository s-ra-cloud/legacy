import { useState } from "react";

interface BookingStatusCardProps {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  status: "info" | "warn" | "destructive" | "success";
  children: React.ReactNode;
}

export function HousingBookingEditStatusCard({
  title,
  subtitle,
  icon,
  children,
  status,
}: BookingStatusCardProps) {
  const [isHovered, setIsHovered] = useState(false);



  return (
    <div
      className={`
        relative w-full rounded-xl transition-all duration-300 ease-out bg-white overflow-hidden
        border border-secondary-color/30
      `}
    >
      <div className="absolute inset-0 rounded-xl overflow-hidden">
        <img
          src="/images/vector.svg"
          alt="Background pattern"
          className={`
            absolute inset-0 w-full h-full object-cover z-10 transition-all duration-500
            opacity-5
            ${isHovered ? 'scale-110 opacity-15' : 'scale-100'}
          `}
        />
        <div className="absolute inset-0 bg-secondary-color/5 z-10" />
      </div>
      <div className="relative z-20 h-full flex flex-col justify-between ">
        <div className="flex items-start justify-between p-4">
          <div className="flex items-center gap-3 flex-1">
            <div className={`
              flex items-center justify-center w-10 h-10 rounded-lg transition-all duration-300
              bg-white text-secondary-color
              ${isHovered ? 'scale-110 rotate-3' : 'scale-100 rotate-0'}
            `}>
              {icon}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className={`
                text-lg font-semibold capitalize transition-all duration-300 leading-tight text-secondary-color
                ${isHovered ? 'text-shadow-sm' : ''}
              `}>
                {title}
              </h4>
              <p className={`
                text-sm transition-colors duration-300 mt-0.5 truncate
              `}>
                {subtitle}
              </p>
            </div>
          </div>

          {/* Status Indicator Dot */}
          <div className={`
            w-3 h-3 rounded-full bg-white/30 transition-all duration-300
            ${isHovered ? 'animate-pulse scale-125 bg-white/50' : 'scale-100'}
          `} />
        </div>
        <div className={`
          transition-all duration-300 z-20 p-2 mt-4 flex items-center justify-center bg-white 
        `}>
            {children}
        </div>
      </div>

    </div>
  );
}
