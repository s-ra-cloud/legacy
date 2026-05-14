import { DownloadCloudIcon, UploadCloudIcon } from "lucide-react";
import { useId } from "react";
import type { Accept } from "react-dropzone";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";
import { Badge } from "../ui/badge";

interface DropzoneProps {
  templateUrl?: string;
  disabled?: boolean;
  onDrop: (files: File[]) => void;
  accept?: Accept;
}

export function Dropzone({
  templateUrl,
  onDrop,
  accept,
  disabled,
}: DropzoneProps) {
  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    multiple: false,
    accept,
  });

  const id = useId();

  return (
    <div className="mx-auto w-full" {...getRootProps()}>
      <div className="flex w-full items-center justify-center">
        <div className="flex h-full w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-gray-300 border-dashed bg-gray-50 hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-700 dark:hover:border-gray-500 dark:hover:bg-bray-800 dark:hover:bg-gray-600">
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            <UploadCloudIcon className="mb-3 h-10 w-10 text-gray-400" />
            <p className="mb-2 text-gray-500 text-sm dark:text-gray-400">
              Glisser-déposer ou cliquer pour télécharger
            </p>
            <p className="text-gray-500 text-xs dark:text-gray-400">
              Fichier XLXS
            </p>
          </div>
          <input
            id={id}
            className="hidden"
            {...getInputProps()}
            disabled={disabled}
          />
        </div>
      </div>
      {templateUrl && (
        <div className="flex w-full items-center justify-center">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toast.info("Êtes-vous sûr de vouloir télécharger le fichier ?", {
                // position: 'top-center',
                className: "z-[100]",
                action: (
                  <a
                    onClick={() => toast.dismiss()}
                    href={templateUrl}
                    download
                    className="min-w-24 text-black"
                  >
                    <Badge>Télécharger</Badge>
                  </a>
                ),
              });
            }}
            className="mt-2 w-full rounded p-4 text-center text-gray-500 text-xs hover:bg-stone-100"
          >
            <DownloadCloudIcon className="me-2 inline h-4 w-4" />
            Télécharger le modèle
          </button>
        </div>
      )}
    </div>
  );
}
