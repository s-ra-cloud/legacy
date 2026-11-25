import { toast } from "sonner";

interface CopyToClipboardProps {
  onSuccess?: () => void;
  onError?: () => void;
}

export function copyToClipboard(
  text: string,
  { onSuccess, onError }: CopyToClipboardProps = {},
) {
  navigator.clipboard.writeText(text).then(onSuccess).catch(onError);
}

interface CopyToClipboardWithToastProps {
  sucessText: string;
  errorText: string;
}

export function copyToClipboardWithToast(
  text: string,
  { sucessText, errorText }: CopyToClipboardWithToastProps,
) {
  if (!navigator.clipboard) {
    toast.error(errorText);
    return;
  }
  navigator.clipboard
    .writeText(text)
    .then(() => {
      toast.success(sucessText);
    })
    .catch(() => {
      toast.error(errorText);
    });
}
