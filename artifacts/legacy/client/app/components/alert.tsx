import { TriangleAlert } from "lucide-react";

interface AlertProps {
  title: string;
  link?: string;
}

export default function Alert({ title }: AlertProps) {
  return (
    <div className="rounded-md border border-yellow-500 px-4 py-3 text-yellow-500">
      <div className="flex items-center gap-3">
        <div className="flex grow items-center justify-between gap-3 ">
          <p className="max-w-2xl">{title}</p>
          <TriangleAlert className=" opacity-60" size={30} aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}
