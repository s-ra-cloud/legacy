import {
  FilePreviewItems,
  FileUpload,
  FileUploadDropzone,
  FileUploadError,
  FileUploadLabel,
} from "~/components/extended-ui/file-upload";
import { FormItem } from "~/components/ui/form";
import { useMediaManager } from "~/hooks/use-upload-file";
import { useFormField } from "../hook";

interface OneFileFieldProps {
  formName: string;
  maxFileSize?: number;
  label?: string;
}

export function OneFileField({
  formName,
  label,
  maxFileSize = 1024 * 1024 * 10,
}: OneFileFieldProps) {
  maxFileSize;
  const control = useFormField<string>(formName);
  const field = control.field;

  const mediaManager = useMediaManager();

  return (
    <FormItem className="md:col-span-2">
      <FileUpload
        field={field}
        validation={{
          minFiles: 1,
          maxFiles: 1,
          maxSizePerFile: maxFileSize,
        }}
        onRemove={mediaManager.delete}
        multiple={false}
        acceptedTypes={[
          "image/jpeg",
          "image/png",
          "image/gif",
          "application/pdf",
        ]}
        onUpload={mediaManager.upload}
      >
        <FileUploadLabel>{label}</FileUploadLabel>
        <FileUploadDropzone />
        <FileUploadError />
        <FilePreviewItems />
      </FileUpload>
    </FormItem>
  );
}
