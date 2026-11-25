import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Switch } from "~/components/ui/switch";
import { useTheme } from "~/hooks/use-theme";

interface UserPreferencesDialogProps {
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

export function UserPreferencesDialog({
  isOpen,
  onOpenChange,
  children,
}: UserPreferencesDialogProps) {
  const preferences = {
    theme: "light",
    language: "en",
    notifications: true,
    darkMode: false,
    email: true,
    push: true,
  };

  function updatePreference(key: string, value: string | boolean) {}
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-h-[80vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>User Preferences</DialogTitle>
          <DialogDescription>
            Customize your account settings and preferences.
          </DialogDescription>
        </DialogHeader>

        <Card>
          <CardHeader>
            <CardTitle>Appearance Settings</CardTitle>
            <CardDescription>
              Customize how the application looks and feels.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <DarkModeButton />
              <div className="space-y-2">
                <Label htmlFor="language">Language</Label>
                <Select
                  value={preferences.language}
                  onValueChange={(value) => updatePreference("language", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="fr">French</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Email Notifications</Label>
                <p className="text-muted-foreground text-sm">
                  Receive notifications via email
                </p>
              </div>
              <Switch
                checked={preferences.email}
                onCheckedChange={(checked) =>
                  updatePreference("email", checked)
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Push Notifications</Label>
                <p className="text-muted-foreground text-sm">
                  Receive push notifications in your browser
                </p>
              </div>
              <Switch
                checked={preferences.push}
                onCheckedChange={(checked) => updatePreference("push", checked)}
              />
            </div>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
}

export function DarkModeButton() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="space-y-2">
      <Label htmlFor="theme">Theme</Label>
      <Select
        value={theme}
        onValueChange={(value: "light" | "dark" | "system") => setTheme(value)}
      >
        <SelectTrigger>
          <SelectValue placeholder="Select theme" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="light">Light</SelectItem>
          <SelectItem value="dark">Dark</SelectItem>
          <SelectItem value="system">System</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
