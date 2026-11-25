import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import type { AuthUser } from "@repo/server";
import { useId, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { SuperForm } from "~/components/form/super";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { $api } from "@repo/ui";
import { m } from "~/paraglide/messages";
import { Button } from "../../ui/button";
import { profileInputSchema, type ProfileUpdateInput } from "@repo/server/client";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "~/components/ui/form";
import { UserAvatar } from "./user-avatar";
import { SAFE_ROUTES } from "~/safe-routes";
import { Link } from "react-router";


interface EditProfileDialogProps {
  user: AuthUser;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: React.ReactNode;
}

export default function EditProfileDialog({
  user,
  open,
  onOpenChange,
  children,
}: EditProfileDialogProps) {
  const id = useId();
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  const form = useForm<ProfileUpdateInput>({
    defaultValues: {
      name: user.name,
      email: user.email,
      imageId: user.imageId ? user.imageId : "https://i.pravatar.cc/150?u=default",
      phoneNumber: user.phoneNumber || "",
    },
    resolver: standardSchemaResolver(profileInputSchema.update),
  });

  const mediaMutation = $api.useMutation("post", "/media/upload", {
    onError: () => {
      toast.error("Failed to upload image");
    },
  });

  const profileMutation = $api.useMutation("post", "/profile", {
    onSuccess: () => {
      toast.success("Profile updated successfully");
      onOpenChange?.(false);
    },
    onError: () => {
      toast.error("Failed to update profile");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="flex flex-col gap-0 overflow-y-visible p-0 sm:max-w-lg [&>button:last-child]:top-3.5">
        <DialogHeader className="contents space-y-0 text-left">
          <DialogTitle className="border-b px-6 py-4 text-base">
            {m["profile.edit.title"]()}
          </DialogTitle>
        </DialogHeader>
        <DialogDescription className="sr-only">
          {m["profile.edit.description"]()}
        </DialogDescription>
        <div className="overflow-y-auto">
          <UserAvatar initialImage={user.imageId} userName={user.name} onFileSelect={setAvatarFile} />
          <div className="px-6 pt-4 pb-6">
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
        </div>
        <DialogFooter className="border-t px-6 py-4">
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </DialogClose>
          <DialogClose asChild>
            <Link to={SAFE_ROUTES.CLIENT_PROFILE} className="min-w-10 flex items-center">
              <Button
                type="button"
                className="flex items-center gap-2"
              >
                Account Settings
              </Button>
            </Link>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
