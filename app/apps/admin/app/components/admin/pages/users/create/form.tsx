import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { userRoles } from "@repo/db/client";
import {
  type UserCreateInput,
  userCreateInputSchema,
} from "@repo/server/client";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { ComboboxApiFormInput } from "~/components/form/fields/api-combobox";
import { SelectField } from "~/components/form/fields/select";
import { TextField } from "~/components/form/fields/text";
import { SuperForm } from "~/components/form/super";
import { Button } from "~/components/ui/button";
import { $api } from "@repo/ui";
import { m } from "~/paraglide/messages";
import { SAFE_ROUTES } from "~/safe-routes";
import {
  handleCommonErrors,
  toastUnknownError,
} from "~/utils/error-handler/form";

// biome-ignore lint/suspicious/noEmptyInterface: <explanation>
interface UserCreateFormProps { }

export function UserCreateForm(_: UserCreateFormProps) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const form = useForm<UserCreateInput>({
    defaultValues: {
      name: "",
      email: "",
      phoneNumber: "",
      role: "CLIENT",
    },
    resolver: standardSchemaResolver(userCreateInputSchema),
  });

  const mutation = $api.useMutation("post", "/users", {
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: $api.queryOptions("get", "/users").queryKey,
      });
      toast.success("User created successfully");
      navigate(SAFE_ROUTES.ADMIN_USERS);
    },
    onError: (error) => {
      const handled = handleCommonErrors(form, error);
      if (!handled) toastUnknownError();
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
              email: data.email,
              phoneNumber: data.phoneNumber,
              role: data.role,
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
        className: "grid grid-cols-2 gap-4",
      }}
    >
      <TextField
        formName="name"
        label="Name"
        inputProps={{
          placeholder: "Enter name",
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
          placeholder: "Enter phone number",
        }}
      />

      <SelectField
        formName="role"
        label="Role"
        options={userRoles.map((role) => ({
          label: role.charAt(0).toUpperCase() + role.slice(1).toLowerCase(),
          value: role,
        }))}
        placeholder="Select role"
      />


      <div className="col-span-2 flex justify-end">
        <Button type="submit">{m["common.create"]()}</Button>
      </div>
    </SuperForm>
  );
}
