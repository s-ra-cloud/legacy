import type { MediaGetOutput } from "@repo/server/client";
import type { ValidationError } from "@repo/shared/client";
import { getRestApiOrigin } from "@repo/shared/env-client";
import { type UseMutationOptions, useMutation } from "@tanstack/react-query";
import { $api } from "@repo/ui";


interface MediaManagerOptions {
  upload?: Omit<
    UseMutationOptions<MediaGetOutput[], ValidationError, File[]>,
    "mutationFn" | "mutationKey"
  >;
  delete?: Omit<
    UseMutationOptions<void, ValidationError, string>,
    "mutationFn" | "mutationKey"
  >;
}

export function useMediaManager(options: MediaManagerOptions = {}) {
  const uploadMutation = useMutation({
    ...options.upload,
    mutationKey: ["post", "/media/upload-many"],
    mutationFn: async (files: File[]): Promise<MediaGetOutput[]> => {
      try {
        const formData = new FormData();

        for (const file of files) {
          formData.append("files", file);
        }

        const baseURL = new URL("/api/v1/", getRestApiOrigin()).toString();
        const endpoint = new URL("media/upload-many", baseURL);
        const res = await fetch(endpoint, {
          method: "POST",
          body: formData,
          credentials: "include",
        });

        if (!res.ok) {
          const error = await res.json();
          throw new Error("Failed to upload files", {
            cause: error,
          });
        }

        return (await res.json()) as MediaGetOutput[];
      } catch (error) {
        console.error("Upload error:", error);
        throw error;
      }
    },
  });

  const deleteMediaMutation = $api.useMutation("put", "/media/{id}");

  const deleteMutation = useMutation({
    ...options.delete,
    mutationKey: ["put", "/media/{id}/delete"],
    mutationFn: async (id: string): Promise<void> => {
      try {
        await deleteMediaMutation.mutateAsync({
          params: {
            path: { id },
          },
          body: {
            status: "TEMPORARY",
          },
        });
      } catch (error) {
        console.error("Delete error:", error);
        throw error;
      }
    },
  });

  return {
    upload: uploadMutation.mutateAsync,
    uploadSync: uploadMutation.mutate,
    isUploading: uploadMutation.isPending,
    uploadError: uploadMutation.error,
    uploadData: uploadMutation.data,

    delete: deleteMutation.mutateAsync,
    deleteSync: deleteMutation.mutate,
    isDeleting: deleteMutation.isPending,
    deleteError: deleteMutation.error,

    isLoading: uploadMutation.isPending || deleteMutation.isPending,
    hasError: Boolean(uploadMutation.error || deleteMutation.error),
    errors: {
      upload: uploadMutation.error,
      delete: deleteMutation.error,
    },

    reset: () => {
      uploadMutation.reset();
      deleteMutation.reset();
    },
    resetUpload: uploadMutation.reset,
    resetDelete: deleteMutation.reset,
  };
}
