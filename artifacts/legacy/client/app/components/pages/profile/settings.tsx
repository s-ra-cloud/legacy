import { useState } from "react";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Label } from "~/components/ui/label";
import { Switch } from "~/components/ui/switch";
import { m } from "~/paraglide/messages";

interface NotificationSettingsState {
  emailNotifications: boolean;
  pushNotifications: boolean;
}

const MOCK_NOTIFICATION_SETTINGS: NotificationSettingsState = {
  emailNotifications: true,
  pushNotifications: false,
};

export function NotificationSettings() {
  const [settings, setSettings] = useState<NotificationSettingsState>(
    MOCK_NOTIFICATION_SETTINGS,
  );

  const handleSettingChange = (
    key: keyof NotificationSettingsState,
    value: boolean,
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSaveChanges = () => {
    // API call to save settings
    alert("Notification settings saved (mock)!");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{m["profile.notificationSettings.title"]()}</CardTitle>
        <CardDescription>
          {m["profile.notificationSettings.description"]()}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between space-x-2 rounded-md border p-3">
          <Label
            htmlFor="email-notifications"
            className="flex flex-col items-start space-y-1"
          >
            <span>
              {m["profile.notificationSettings.emailNotifications.title"]()}
            </span>
            <span className="font-normal text-muted-foreground leading-snug">
              {m[
                "profile.notificationSettings.emailNotifications.description"
              ]()}
            </span>
          </Label>
          <Switch
            id="email-notifications"
            checked={settings.emailNotifications}
            onCheckedChange={(checked) =>
              handleSettingChange("emailNotifications", checked)
            }
          />
        </div>
        <div className="flex items-center justify-between space-x-2 rounded-md border p-3">
          <Label
            htmlFor="push-notifications"
            className="flex flex-col items-start space-y-1"
          >
            <span>
              {m["profile.notificationSettings.pushNotifications.title"]()}
            </span>
            <span className="font-normal text-muted-foreground leading-snug">
              {m[
                "profile.notificationSettings.pushNotifications.description"
              ]()}
            </span>
          </Label>
          <Switch
            id="push-notifications"
            checked={settings.pushNotifications}
            onCheckedChange={(checked) =>
              handleSettingChange("pushNotifications", checked)
            }
            disabled // Push notifications are often more complex to implement
          />
        </div>
        <p className="text-muted-foreground text-xs">
          {m["profile.notificationSettings.pushDisabled"]()}
        </p>
        <div className="flex justify-end">
          <Button onClick={handleSaveChanges}>
            {m["profile.notificationSettings.saveChanges"]()}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
