import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { userRoles, userStatuses } from "@repo/db/client";
import type { UserUpdateInput } from "@repo/server/client";
import { userUpdateInputSchema } from "@repo/server/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { ErrorView } from "~/components/common/error";
import { LoadingView } from "~/components/common/loading";
import { SelectField } from "~/components/form/fields/select";
import { TextField } from "~/components/form/fields/text";
import { SuperForm } from "~/components/form/super";
import { Checkbox } from "~/components/ui/checkbox";
import { Label } from "~/components/ui/label";
import { $api } from "@repo/ui";
import { SAFE_ROUTES } from "~/safe-routes";
import {
  handleCommonErrors,
  toastUnknownError,
} from "~/utils/error-handler/form";

const legacyInputClass =
  "h-11 rounded-none border-white/[0.12] bg-white/[0.04] text-ivory placeholder:text-ivory/25 focus-visible:border-gold/50 focus-visible:ring-gold/15";

interface UserEditProps {
  userId: string;
}

export function UserEditForm({ userId }: UserEditProps) {
  const queryOptions = $api.queryOptions("get", "/users/{id}", {
    params: {
      path: {
        id: userId,
      },
    },
  });

  const userQuery = useQuery(queryOptions);

  switch (userQuery.status) {
    case "pending":
      return <LoadingView />;
    case "error":
      return <ErrorView error={userQuery.error} retry={userQuery.refetch} />;
  }

  const data = userQuery.data;

  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const form = useForm<UserUpdateInput>({
    defaultValues: {
      name: data.name,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      emailVerified: data.emailVerified,
      institution: data.institution,
      role: data.role,
      status: data.status,
    },
    resolver: standardSchemaResolver(userUpdateInputSchema),
  });

  const mutation = $api.useMutation("post", "/users/{id}", {
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryOptions.queryKey });
      await queryClient.invalidateQueries({ queryKey: ["get", "/users"] });
      await queryClient.refetchQueries({ queryKey: queryOptions.queryKey });

      toast.success("Member updated successfully");
      navigate(SAFE_ROUTES.ADMIN_USERS);
    },
    onError: (error) => {
      const handled = handleCommonErrors(form, error);
      if (!handled) toastUnknownError();
    },
    meta: {
      invalidates: [queryOptions.queryKey, ["get", "/users"]],
    },
  });

  return (
    <div className="relative border border-white/10 p-8 sm:p-10">
      <div className="absolute top-2 left-2 h-px w-3 bg-gold/40" />
      <div className="absolute top-2 left-2 h-3 w-px bg-gold/40" />
      <div className="absolute top-2 right-2 h-px w-3 bg-gold/40" />
      <div className="absolute top-2 right-2 h-3 w-px bg-gold/40" />
      <div className="absolute bottom-2 left-2 h-px w-3 bg-gold/40" />
      <div className="absolute bottom-2 left-2 h-3 w-px bg-gold/40" />
      <div className="absolute bottom-2 right-2 h-px w-3 bg-gold/40" />
      <div className="absolute bottom-2 right-2 h-3 w-px bg-gold/40" />

      <div className="mb-8 flex items-center gap-3">
        <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-gold/60">
          01 · Profile
        </span>
        <div className="h-px flex-1 bg-gold/20" />
      </div>

      <SuperForm
        form={form}
        onSubmit={async (body) => {
          await mutation
            .mutateAsync({
              body: {
                name: body.name,
                firstName: body.firstName,
                lastName: body.lastName,
                email: body.email,
                emailVerified: body.emailVerified,
                institution:
                  body.institution === "" || body.institution === null
                    ? undefined
                    : body.institution,
                role: body.role,
                status: body.status,
              },
              params: {
                path: {
                  id: userId,
                },
              },
            })
            .catch(console.error);
        }}
        onError={() => {
          toast.error(
            "Please check the form for validation errors and try again",
          );
        }}
        formProps={{
          className: "grid gap-4",
        }}
      >
        <div className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <TextField
              formName="name"
              label="Name"
              inputProps={{
                placeholder: "Full name",
                className: legacyInputClass,
              }}
            />
            <SelectField
              formName="role"
              label="Role"
              placeholder="Select role"
              options={userRoles.map((role) => ({
                label: role.charAt(0) + role.slice(1).toLowerCase().replace("_", " "),
                value: role,
              }))}
            />
            <TextField
              formName="firstName"
              label="First name"
              inputProps={{
                placeholder: "First name",
                className: legacyInputClass,
              }}
            />
            <TextField
              formName="lastName"
              label="Last name"
              inputProps={{
                placeholder: "Last name",
                className: legacyInputClass,
              }}
            />
            <TextField
              formName="email"
              label="Email"
              inputProps={{
                placeholder: "email@institution.edu",
                className: legacyInputClass,
              }}
            />
            <SelectField
              formName="status"
              label="Status"
              placeholder="Select status"
              options={userStatuses.map((status) => ({
                label: status === "ENABLED" ? "Active" : "Disabled",
                value: status,
              }))}
            />
            <TextField
              formName="institution"
              label="Institution"
              inputProps={{
                placeholder: "Institution",
                className: legacyInputClass,
              }}
            />
            <Controller
              control={form.control}
              name="emailVerified"
              render={({ field }) => (
                <div className="flex items-center gap-3 pt-6">
                  <Checkbox
                    id="emailVerified"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    className="border-white/20 data-[state=checked]:border-gold data-[state=checked]:bg-gold/20"
                  />
                  <Label
                    htmlFor="emailVerified"
                    className="text-[10px] font-bold uppercase tracking-[0.25em] text-ivory/50"
                  >
                    Email verified
                  </Label>
                </div>
              )}
            />

            <div className="flex justify-end gap-4 md:col-span-2">
              <button
                type="button"
                onClick={() => navigate(SAFE_ROUTES.ADMIN_USERS)}
                className="border border-white/10 px-8 py-3 text-[11px] font-bold uppercase tracking-[0.3em] text-ivory/50 transition-colors hover:border-white/20 hover:text-ivory"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={mutation.isPending}
                className="border border-gold/50 px-10 py-3 text-[11px] font-bold uppercase tracking-[0.35em] text-ivory transition-all duration-300 hover:border-gold hover:bg-gold/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {mutation.isPending ? (
                  <Loader2 className="mx-auto h-4 w-4 animate-spin" />
                ) : (
                  "Save changes"
                )}
              </button>
            </div>
          </div>
        </div>
      </SuperForm>
    </div>
  );
}
