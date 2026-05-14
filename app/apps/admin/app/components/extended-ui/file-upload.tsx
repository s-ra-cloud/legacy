import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { CircleIcon, FileIcon, FileTextIcon, Upload, X } from "lucide-react";
import { useDropzone } from "react-dropzone";
import type {
  ControllerRenderProps,
  FieldPath,
  FieldValues,
} from "react-hook-form";
import { toast } from "sonner";

import type { MediaGetOutput, MediaUploadResponse } from "@repo/server/client";
import { getMediaUrl } from "node_modules/@repo/shared/dist/get-media-url";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";
import { Button } from "~/components/ui/button";
import { useFormField } from "~/components/ui/form";
import { Label } from "~/components/ui/label";
import { $api } from "@repo/ui";
import { cn } from "~/lib/utils";

type FieldValue = MediaUploadResponse["id"][] | MediaUploadResponse["id"] | undefined;

function normalizeToArray(value: FieldValue): MediaUploadResponse["id"][] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

interface ValidationProps {
  maxFiles?: number;
  minFiles?: number;
  maxSizePerFile?: number;
  minSizePerFile?: number;
}

interface FileUploadContext {
  files: MediaGetOutput[];
  isLoading: boolean;
  required?: boolean;
  onDrop: (acceptedFiles: File[]) => void;
  onRemove: (index: number, fileId: string) => void;
  getRootProps: () => React.ComponentProps<"div">;
  getInputProps: () => React.ComponentProps<"input">;
  isDragActive: boolean;
  multiple?: boolean;
  classNames?: {
    root?: string;
  };
}

const FileUploadContext = createContext<FileUploadContext | undefined>(
  undefined,
);

function useFileUpload() {
  const context = useContext(FileUploadContext);
  if (!context) {
    throw new Error("useFileUpload must be used within a FileUploadProvider");
  }
  return context;
}

export interface FileUploadProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> {
  field: ControllerRenderProps<TFieldValues, TName>;
  multiple?: boolean;
  validation?: ValidationProps;
  acceptedTypes?: string[];
  onUpload: (files: File[]) => Promise<MediaUploadResponse[]>;
  onRemove?: (fileId: string) => Promise<void>;
  required?: boolean;
  children?: React.ReactNode;
  classNames?: Record<string, string>;
}

export function FileUpload<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
>(props: FileUploadProps<TFieldValues, TName>) {
  const [files, setFiles] = useState<MediaGetOutput[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const mediaIds = useMemo(() => {
    const fieldValue = props.field?.value as FieldValue;
    return normalizeToArray(fieldValue);
  }, [props.field?.value]);

  const existingMediaQuery = $api.useQuery(
    "get",
    "/media",
    {
      params: {
        query: {
          limit: 100,
          "filter[id][in]": mediaIds,
        },
      },
    },
    {
      enabled: mediaIds.length > 0,
    },
  );

  useEffect(() => {
    if (existingMediaQuery.isSuccess) {
      setFiles(existingMediaQuery.data.items);
    } else if (mediaIds.length === 0) {
      setFiles([]);
    }
  }, [existingMediaQuery.isSuccess, existingMediaQuery.data, mediaIds.length]);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      setIsLoading(true);
      try {
        const uploadedFiles = await props.onUpload(acceptedFiles);

        const currentFieldValue = props.field?.value as FieldValue;

        if (props.multiple) {
          const currentFiles = normalizeToArray(currentFieldValue);
          const newFiles = [...currentFiles, ...uploadedFiles.map((item) => item.id)];
          props.field?.onChange(newFiles);
        } else {
          props.field?.onChange(uploadedFiles[0]?.id);
        }

        await existingMediaQuery.refetch();
      } catch {
        toast.error(`Failed to upload ${props.multiple ? "files" : "file"}`);
      } finally {
        setIsLoading(false);
      }
    },
    [props.onUpload, props.field, props.multiple, existingMediaQuery],
  );

  const onRemove = useCallback(
    async (index: number, fileId: string) => {
      if (props.onRemove) {
        await props.onRemove(fileId);
      }

      const currentFieldValue = props.field?.value as FieldValue;
      const currentFiles = normalizeToArray(currentFieldValue);

      const updatedFiles = currentFiles.filter((id) => id !== fileId);

      if (props.multiple) {
        props.field.onChange(updatedFiles);
      } else {
        props.field.onChange(updatedFiles.length > 0 ? updatedFiles[0] : null);
      }

      await existingMediaQuery.refetch();
    },
    [props.onRemove, props.field, props.multiple, existingMediaQuery],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles: File[]) => {
      void onDrop(acceptedFiles);
    },
    onDropRejected: (rejectedFiles) => {
      const errors = rejectedFiles.flatMap((item) => item.errors);

      if (errors.some((err) => err.code === "file-invalid-type")) {
        toast.error(
          `File type not supported. Please upload ${props.acceptedTypes?.join(", ")} files.`,
        );
      }

      if (errors.some((err) => err.code === "too-many-files")) {
        toast.error(
          `You can only upload up to ${props.validation?.maxFiles} files`,
        );
      }

      if (errors.some((err) => err.code === "file-too-large")) {
        toast.error(
          `Files must be less than ${formatFileSize(props.validation?.maxSizePerFile ?? 0)} each`,
        );
      }

      if (errors.some((err) => err.code === "file-too-small")) {
        toast.error(
          `Files must be at least ${formatFileSize(props.validation?.minSizePerFile ?? 0)} each`,
        );
      }

      if (
        errors.some((err) => err.code === "too-few-files") &&
        props.validation?.minFiles
      ) {
        toast.error(
          `You must upload at least ${props.validation.minFiles} files`,
        );
      }
    },
    multiple: props.multiple,
    accept: props.acceptedTypes?.reduce(
      (acc, type) => {
        acc[type] = [];
        return acc;
      },
      {} as Record<string, never[]>,
    ),
    maxFiles: props.validation?.maxFiles,
    maxSize: props.validation?.maxSizePerFile,
    minSize: props.validation?.minSizePerFile,
    validator: props.validation?.minFiles
      ? (file) => {
        if (
          !props.multiple &&
          props.validation?.minFiles &&
          props.validation.minFiles > 0 &&
          files.length === 0 &&
          !file
        ) {
          return {
            code: "too-few-files",
            message: `You must upload at least ${props.validation.minFiles} files`,
          };
        }
        return null;
      }
      : undefined,
  });

  const contextValue = useMemo(
    () => ({
      files,
      isLoading,
      required: props.required,
      onDrop,
      onRemove,
      getRootProps,
      getInputProps,
      isDragActive,
      multiple: props.multiple,
      classNames: props.classNames,
    }),
    [
      files,
      isLoading,
      props.required,
      onDrop,
      onRemove,
      getRootProps,
      getInputProps,
      isDragActive,
      props.multiple,
      props.classNames,
    ],
  );

  return (
    <FileUploadContext.Provider value={contextValue}>
      <div className={cn("max-w-full space-y-4", props.classNames?.root)}>
        {props.children}
      </div>
    </FileUploadContext.Provider>
  );
}

export function FileUploadLabel({
  className,
  children,
  ...props
}: {
  className?: string;
  children?: React.ReactNode;
  htmlFor?: string;
}) {
  const { required } = useFileUpload();

  return (
    <Label className={cn("mb-2 block", className)} {...props}>
      {children}
      {required && <span className="ml-1 text-destructive">*</span>}
    </Label>
  );
}

export function FileUploadDropzone({
  classNames = {},
}: React.HTMLAttributes<HTMLDivElement> & {
  classNames?: {
    root?: string;
    content?: string;
    uploadIcon?: string;
    uploadText?: string;
    loadingSpinner?: string;
    loadingText?: string;
  };
}) {
  const { getRootProps, getInputProps, isDragActive, isLoading } =
    useFileUpload();

  return (
    <div
      {...getRootProps()}
      className={cn(
        "group relative flex h-28 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed",
        isDragActive
          ? "border-primary bg-muted/40"
          : "border-muted-foreground/25",
        "transition-colors hover:bg-muted/30",
        classNames.root,
      )}
    >
      <input {...getInputProps()} />
      <div
        className={cn(
          "flex flex-col items-center justify-center space-y-2 text-muted-foreground",
          classNames.content,
        )}
      >
        {isLoading ? (
          <>
            <div
              className={cn(
                "h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent",
                classNames.loadingSpinner,
              )}
            />
            <p className={cn("font-medium text-sm", classNames.loadingText)}>
              Uploading...
            </p>
          </>
        ) : (
          <>
            <Upload className={cn("size-8", classNames.uploadIcon)} />
            <p className={cn("font-medium text-sm", classNames.uploadText)}>
              {isDragActive
                ? "Drop files here"
                : "Drag & drop your files here or click to browse"}
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export function FilePreviewItems({
  className,
  classNames,
}: {
  className?: string;
  classNames?: {
    root?: string;
    imageWrapper?: string;
    image?: string;
    content?: string;
    fileName?: string;
    fileSize?: string;
    removeButton?: string;
  };
}) {
  const { files, onRemove } = useFileUpload();

  if (!files.length) return null;

  return (
    <div className={cn("mt-4 space-y-4", className)}>
      {files.map((file, index) => (
        <FilePreviewItem
          key={file.id}
          file={file}
          classNames={classNames}
          onRemove={() => onRemove(index, file.id)}
        />
      ))}
    </div>
  );
}

export function FilePreviewItem({
  file,
  onRemove,
  classNames = {},
}: {
  file: MediaGetOutput;
  onRemove?: () => void;
  classNames?: {
    root?: string;
    imageWrapper?: string;
    image?: string;
    content?: string;
    fileName?: string;
    fileSize?: string;
    removeButton?: string;
  };
}) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const previewUrl = getMediaUrl(file.id);

  const fileDetails = {
    name: file.fileName || "File",
    type: file.type || "application/octet-stream",
    size: file.size || 0,
  };

  return (
    <>
      <div
        className={cn(
          "group flex w-full items-center gap-3 rounded-lg border border-border/40 bg-card/30 p-3",
          "transition-all duration-200 hover:bg-card/50",
          "sm:gap-4 sm:p-4",
          classNames.root,
        )}
      >
        {fileDetails.type?.startsWith("image/") ? (
          <div
            className={cn(
              "relative aspect-square w-12 shrink-0 overflow-hidden rounded-md border border-border/50 bg-muted/30",
              "sm:w-14",
              classNames.imageWrapper,
            )}
          >
            <img
              src={previewUrl}
              alt={fileDetails.name}
              className={cn(
                "object-cover transition-all duration-200",
                classNames.image,
              )}
            />
          </div>
        ) : (
          <div
            className={cn(
              "flex aspect-square w-12 shrink-0 items-center justify-center rounded-md border border-border/50 bg-muted/30",
              "sm:w-14",
              classNames.imageWrapper,
            )}
          >
            <FileIcon className="h-6 w-6 text-muted-foreground/70" />
          </div>
        )}
        <div className={cn("min-w-0 flex-1 space-y-1", classNames.content)}>
          <span
            className={cn(
              "block max-w-[20ch] truncate whitespace-nowrap font-medium text-foreground/90 text-sm",
              "sm:text-base",
              classNames.fileName,
            )}
            title={fileDetails.name}
          >
            {fileDetails.name}
          </span>
          <span
            className={cn(
              "flex items-center gap-2 text-muted-foreground text-xs",
              classNames.fileSize,
            )}
          >
            <span className="inline-flex items-center gap-1">
              <FileTextIcon className="h-3 w-3" />
              {fileDetails.type?.split("/")[1]?.toUpperCase() || "FILE"}
            </span>
            <span className="inline-flex items-center gap-1">
              <CircleIcon className="h-1 w-1" />
              {formatFileSize(fileDetails.size ?? 0)}
            </span>
          </span>
        </div>
        {onRemove && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setShowDeleteDialog(true)}
            className={cn(
              "h-8 w-8 shrink-0 opacity-0 transition-opacity",
              "group-hover:opacity-100 sm:h-9 sm:w-9",
              "hover:bg-destructive/10 hover:text-destructive",
              classNames.removeButton,
            )}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete File</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this file?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onRemove?.();
                setShowDeleteDialog(false);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function FileUploadError({ className }: { className?: string }) {
  const { error } = useFormField();

  if (!error) return null;

  return (
    <p className={cn("font-medium text-destructive text-sm", className)}>
      {error.message}
    </p>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Number.parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
}
