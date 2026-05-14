import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { userRoles, userStatuses } from "@repo/db/client";
import type { UserUpdateInput } from "@repo/server/client";
import { userUpdateInputSchema } from "@repo/server/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { ErrorView } from "~/components/common/error";
import { LoadingView } from "~/components/common/loading";
import { SelectField } from "~/components/form/fields/select";
import { TextField } from "~/components/form/fields/text";
import { SuperForm } from "~/components/form/super";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Checkbox } from "~/components/ui/checkbox";
import { Label } from "~/components/ui/label";
import { $api } from "@repo/ui";
import { SAFE_ROUTES } from "~/safe-routes";
import {
  handleCommonErrors,
  toastUnknownError,
} from "~/utils/error-handler/form";

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
      // Invalidate and refetch user queries
      await queryClient.invalidateQueries({ queryKey: queryOptions.queryKey });
      await queryClient.invalidateQueries({ queryKey: ["get", "/users"] });
      await queryClient.refetchQueries({ queryKey: queryOptions.queryKey });

      toast.success("User updated successfully");
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
    <SuperForm
      form={form}
      onSubmit={async (data) => {
        await mutation
          .mutateAsync({
            body: {
              name: data.name,
              firstName: data.firstName,
              lastName: data.lastName,
              email: data.email,
              emailVerified: data.emailVerified,
              institution: data.institution === "" || data.institution === null ? undefined : data.institution,
              role: data.role,
              status: data.status,
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
        className: "grid gap-4", // control grid cols by form footer bellow
      }}
    >
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <TextField
            formName="name"
            label="Name"
            inputProps={{
              placeholder: "Enter name",
            }}
          />
          <SelectField
            formName="role"
            label="Role"
            placeholder="Select role"
            options={userRoles.map((role) => ({
              label: role.charAt(0) + role.slice(1).toLowerCase(),
              value: role,
            }))}
          />
          <TextField
            formName="firstName"
            label="First Name"
            inputProps={{
              placeholder: "Enter First Name",
            }}
          />
          <TextField
            formName="lastName"
            label="Last Name"
            inputProps={{
              placeholder: "Enter Last Name",
            }}
          />
          <TextField
            formName="email"
            label="Email"
            inputProps={{
              placeholder: "Enter email",
            }}
          />
          <SelectField
            formName="status"
            label="Status"
            placeholder="Select status"
            options={userStatuses.map((status) => ({
              label: status === "ENABLED" ? "Active" : "Banned",
              value: status,
            }))}
          />
          <TextField
            formName="institution"
            label="Institution"
            inputProps={{
              placeholder: "Enter institution",
            }}
          />
          <Controller
            control={form.control}
            name="emailVerified"
            render={({ field }) => (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="emailVerified"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
                <Label htmlFor="emailVerified">Email Verified</Label>
              </div>
            )}
          />



          <div className="flex justify-end md:col-span-2">
            <Button type="submit">Update User</Button>
          </div>
        </div>
      </div>
    </SuperForm>
  );
}
