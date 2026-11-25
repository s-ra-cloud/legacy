import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { userRoles } from "@repo/db/client";
import type { UserUpdateInput } from "@repo/server/client";
import { userUpdateInputSchema } from "@repo/server/client";
import { useQuery } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { ErrorView } from "~/components/common/error";
import { LoadingView } from "~/components/common/loading";
import { TextField } from "~/components/form/fields/text";
import { SuperForm } from "~/components/form/super";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Checkbox } from "~/components/ui/checkbox";
import { Label } from "~/components/ui/label";
import { $api } from "@repo/ui";
import { m } from "~/paraglide/messages";
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
  const form = useForm<UserUpdateInput>({
    defaultValues: {
      name: data.name,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      emailVerified: data.emailVerified,
      phoneNumber: data.phoneNumber,
      role: data.role,
    },
    resolver: standardSchemaResolver(userUpdateInputSchema),
  });

  const mutation = $api.useMutation("post", "/users/{id}", {
    onSuccess: () => {
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
              phoneNumber: data.phoneNumber,
              role: data.role,
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
          <TextField
            formName="role"
            label="Role"
            inputProps={{
              placeholder: "Enter role",
            }}
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
          <TextField
            formName="phoneNumber"
            label="Phone Number"
            inputProps={{
              placeholder: "Enter phone Number",
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
            <Button type="submit">{m["common.update"]()}</Button>
          </div>
        </div>
      </div>
    </SuperForm>
  );
}
