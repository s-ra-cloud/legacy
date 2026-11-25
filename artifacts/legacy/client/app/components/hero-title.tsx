import { cn } from "~/lib/utils";

interface HeroTitleProps {
  title: string;
  description: string;
  titleClassName?: string;
}

export default function HeroTitle({
  title,
  description,
  titleClassName,
}: HeroTitleProps) {
  return (
    <div className="absolute top-1/3 right-0 left-0 text-center">
      <h1
        className={cn(
          " mb-4 font-bold text-5xl text-primary-color uppercase",
          titleClassName,
        )}
      >
        {title}
      </h1>
      <p className="mx-auto max-w-lg font-light text-normal text-white">
        {description}
      </p>
    </div>
  );
}
