import { CopyIcon } from "lucide-react";
import { useState } from "react";
import { Badge } from "~/components/ui/badge";
import { copyToClipboardWithToast } from "~/utils/copy";

interface IdColumnProps {
  id: string;
}

export function IdColumn({ id }: IdColumnProps) {
  const [isAnimating, setIsAnimating] = useState(false);

  const handleCopy = () => {
    setIsAnimating(true);
    copyToClipboardWithToast(id, {
      sucessText: "Copied to clipboard",
      errorText: "Failed to copy to clipboard",
    });
    setTimeout(() => setIsAnimating(false), 200);
  };

  return (
    <Badge className="cursor-pointer font-mono" onClick={handleCopy}>
      {id.slice(0, 6)}
      ...
      <CopyIcon
        className={`size-4 transition-transform duration-200 ${isAnimating ? "scale-150" : "scale-100"}`}
      />
    </Badge>
  );
}
