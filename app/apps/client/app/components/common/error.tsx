import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { Button } from "../ui/button";

interface ErrorProps {
  message?: string;
  title?: string;
  error?: unknown;
  retry?: () => void;
}

export function ErrorView({
  message = "Something went wrong",
  title = "Error",
  retry,
}: ErrorProps) {
  return (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
      {retry && (
        <AlertDescription>
          <Button onClick={retry}>Retry</Button>
        </AlertDescription>
      )}
    </Alert>
  );
}
