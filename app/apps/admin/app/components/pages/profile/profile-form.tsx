import { Button } from "~/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import { Input } from "~/components/ui/input";

import { useForm } from "react-hook-form";
import { m } from "~/paraglide/messages";
import { UserAvatar } from "./user-avatar";
import { profileInputSchema, type ProfileUpdateInput } from "@repo/server/client";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import type { AuthUser } from "@repo/server";
import { $api } from "@repo/ui";
import { toast } from "sonner";
import { SuperForm } from "~/components/form/super";
import { useState } from "react";


export function ProfileForm({ user }: { user: AuthUser }) {
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  const mediaMutation = $api.useMutation("post", "/media/upload", {
    onError: () => {
      toast.error("Failed to upload image");
    },
  });

  const profileMutation = $api.useMutation("post", "/profile", {
    onSuccess: () => {
      toast.success("Profile updated successfully");
    },
    onError: () => {
      toast.error("Failed to update profile");
    },
  });

  const form = useForm<ProfileUpdateInput>({
    resolver: standardSchemaResolver(profileInputSchema.update),
    defaultValues: {
      name: user.name,
      email: user.email,
      imageId: user.imageId ? user.imageId : "https://i.pravatar.cc/150?u=default",
      phoneNumber: user.phoneNumber || "",
    },
    mode: "onChange",
  });

  return (
    <div className="space-y-8">
      <UserAvatar initialImage={user.imageId} userName={user.name} onFileSelect={setAvatarFile} />
      <SuperForm
        form={form}
        onSubmit={async (data) => {
          try {
            let imageId = user.imageId;

            if (avatarFile) {
              const formData = new FormData();
              formData.append("file", avatarFile);
              const mediaResponse = await mediaMutation.mutateAsync({
                body: formData as unknown as undefined,
              });
              imageId = mediaResponse.id;
            }

            await profileMutation.mutateAsync({
              body: {
                name: data.name ?? user.name,
                imageId: imageId ?? undefined,
                email: data.email ?? user.email,
                phoneNumber: data.phoneNumber ?? undefined,
              },
            });
          } catch (error) {
            console.error("Error updating profile:", error);
          }
        }}
        onError={() => {
          toast.error(
            "Please check the form for validation errors and try again",
          );
        }}
      >
        <div className="space-y-6">
          <FormField
            control={form.control}
            name="name"
            render={({ field, fieldState }) => (
              <FormItem>
                <FormLabel>{m["profile.profileForm.name"]()}</FormLabel>
                <FormControl>
                  <Input
                    placeholder={m["profile.profileForm.namePlaceholder"]()}
                    {...field}
                  />
                </FormControl>
                <FormMessage fieldState={fieldState} />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="email"
            render={({ field, fieldState }) => (
              <FormItem>
                <FormLabel>{m["profile.profileForm.email"]()}</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder={m["profile.profileForm.emailPlaceholder"]()}
                    {...field}
                  />
                </FormControl>
                <FormMessage fieldState={fieldState} />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="phoneNumber"
            render={({ field, fieldState }) => (
              <FormItem>
                <FormLabel>{m["profile.profileForm.phoneNumber"]()}</FormLabel>
                <FormControl>
                  <Input
                    placeholder={m["profile.profileForm.phoneNumber"]()}
                    {...field}
                  />
                </FormControl>
                <FormMessage fieldState={fieldState} />
              </FormItem>
            )}
          />
          <Button type="submit" disabled={profileMutation.isPending || mediaMutation.isPending}>
            {m["profile.profileForm.updateProfile"]()}
          </Button>
        </div>
      </SuperForm>
    </div>
  );
}
