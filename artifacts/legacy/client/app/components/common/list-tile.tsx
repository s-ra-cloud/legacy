import { cn } from "~/lib/utils";

interface ListTileProps {
  title: string;
  subTitle: string;
  image?: string;
  icon?: React.ReactNode;
  className?: string;
  onClick?: () => void;
  type?: "button" | "submit" | "reset";
  children?: React.ReactNode;
}

export function ListTile({
  icon,
  title,
  subTitle,
  image,
  className,
  onClick,
  type = "button",
  children,
}: ListTileProps) {
  return (
    <button
      type={type}
      className={cn(
        "mb-1 w-full overflow-hidden rounded-md text-start",
        "flex cursor-pointer items-center gap-3 px-3 py-2 transition-colors hover:bg-gray-50",
        className,
      )}
      onClick={onClick}
    >
      <div
        className={cn(
          "h-12 w-12 overflow-hidden rounded-lg border border-gray-100",
          image && "shadow-sm",
          icon && "bg-gray-100",
        )}
      >
        {image && (
          <img src={image} alt={title} className="h-full w-full object-cover" />
        )}
        {icon && (
          <div className="flex h-full w-full items-center justify-center">
            {icon}
          </div>
        )}
      </div>
      <div className="grow">
        <h3 className="font-medium text-base">{title}</h3>
        <p className="text-gray-400 text-sm">{subTitle}</p>
      </div>
      {children}
    </button>
  );
}
