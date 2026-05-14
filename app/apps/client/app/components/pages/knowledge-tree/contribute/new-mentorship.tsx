import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";
import { StyledButton } from "~/components/extended-ui/Button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";

// Schema for mentorship link data
const mentorshipLinkSchema = z.object({
  mentorFirstName: z.string().min(1, "Mentor first name is required"),
  mentorLastName: z.string().min(1, "Mentor last name is required"),
  menteeFirstName: z.string().min(1, "Mentee first name is required"),
  menteeLastName: z.string().min(1, "Mentee last name is required"),
  titleOfWork: z.string().min(1, "Title of the work is required"),
  institution: z.string().min(1, "Institution is required"),
  dateOfDefense: z.string().min(1, "Date of defense is required"),
});

const familySchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Family name is required"),
  links: z.array(mentorshipLinkSchema).min(1, "At least one link is required"),
});

const newMentorshipFormSchema = z.object({
  families: z.array(familySchema).min(1, "At least one family is required"),
});

type FormData = z.infer<typeof newMentorshipFormSchema>;

export function NewMentorshipForm() {
  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<FormData>({
    resolver: zodResolver(newMentorshipFormSchema),
    defaultValues: {
      families: [
        {
          id: "family_1",
          name: "Family 1",
          links: [
            {
              mentorFirstName: "",
              mentorLastName: "",
              menteeFirstName: "",
              menteeLastName: "",
              titleOfWork: "",
              institution: "",
              dateOfDefense: "",
            },
            {
              mentorFirstName: "",
              mentorLastName: "",
              menteeFirstName: "",
              menteeLastName: "",
              titleOfWork: "",
              institution: "",
              dateOfDefense: "",
            },
          ],
        },
      ],
    },
  });

  const { fields: familyFields, append: appendFamily, remove: removeFamily } = useFieldArray({
    control,
    name: "families",
  });

  const onSubmit = (data: FormData) => {
    console.log("Mentorship form data:", data);
    // Here you would typically send the data to your API
  };

  const addNewFamily = () => {
    const newFamilyId = `family_${familyFields.length + 1}`;
    appendFamily({
      id: newFamilyId,
      name: `Family ${familyFields.length + 1}`,
      links: [
        {
          mentorFirstName: "",
          mentorLastName: "",
          menteeFirstName: "",
          menteeLastName: "",
          titleOfWork: "",
          institution: "",
          dateOfDefense: "",
        },
      ],
    });
  };

  return (
    <section className="w-full px-4 text-[#0E0D14]">
      <div className="max-w-6xl mx-auto">
        <h1
          className="text-[27px] sm:text-[35px] font-bold text-[#17161F] mb-12 text-center"
          style={{
            fontFamily: 'Didot, serif',
            fontWeight: 700,
          }}
        >
          Add a new mentorship link
        </h1>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          {familyFields.map((family, familyIndex) => (
            <FamilySection
              key={family.id}
              familyIndex={familyIndex}
              family={family}
              control={control}
              register={register}
              errors={errors}
              onRemoveFamily={() => removeFamily(familyIndex)}
              canRemoveFamily={familyFields.length > 1}
            />
          ))}

          <div className="flex items-center gap-4 mb-8">
            <button
              type="button"
              onClick={addNewFamily}
              className="flex items-center gap-2 text-[#17161F] hover:text-[#0E0D14] transition-colors"
            >
              <Plus className="w-6 h-6" />
              <span className="text-lg underline">New family</span>
            </button>
          </div>

          <div className="text-center mt-12">
            <button
              type="submit"
              className="relative px-8 py-3 rounded-lg text-[#17161F] text-sm sm:text-xl font-bold transition-all duration-300
                hover:text-white hover:brightness-75 hover:saturate-150"
              style={{
                background:
                  "radial-gradient(ellipse at center, #A9B0C2 50%, #E3CCD2 100%)",
                boxShadow: "0 0 8px rgba(2, 138, 97)",
              }}
            >
              <span
                style={{
                  textShadow:
                    "0 0 2px rgba(2, 138, 97, 0.1), " +
                    "0 0 4px rgba(2, 138, 97, 0.1), " +
                    "0 0 6px rgba(2, 138, 97, 0.1), " +
                    "0 0 8px rgba(2, 138, 97, 0.1)",
                }}
                className="font-medium"
              >
                Add
              </span>
            </button>
          </div>
        </form>
      </div>
      <div
				className="h-[2px] max-w-6xl mx-auto mb-12 mt-16"
				style={{
					background:"linear-gradient(to right, #A9B0C200, #17161F, #A9B0C200)",
				}}
			></div>
    </section>
  );
}

// Family section component
function FamilySection({
  familyIndex,
  family,
  control,
  register,
  errors,
  onRemoveFamily,
  canRemoveFamily,
}: {
  familyIndex: number;
  family: any;
  control: any;
  register: any;
  errors: any;
  onRemoveFamily: () => void;
  canRemoveFamily: boolean;
}) {
  const { fields: linkFields, append: appendLink, remove: removeLink } = useFieldArray({
    control,
    name: `families.${familyIndex}.links`,
  });

  const addNewLink = () => {
    appendLink({
      mentorFirstName: "",
      mentorLastName: "",
      menteeFirstName: "",
      menteeLastName: "",
      titleOfWork: "",
      institution: "",
      dateOfDefense: "",
    });
  };

  return (
    <div className="border-b border-gray-200 pb-8 mb-8">
      <div className="flex items-center gap-4 mb-6">
        <h2 className="text-2xl font-bold text-[#17161F] underline">
          {family.name}
        </h2>
        <button
          type="button"
          onClick={addNewLink}
          className="flex items-center gap-2 text-[#17161F] hover:text-[#0E0D14] transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span className="text-sm underline">New link</span>
        </button>
      </div>

      {linkFields.map((link, linkIndex) => (
        <LinkSection
          key={link.id}
          familyIndex={familyIndex}
          linkIndex={linkIndex}
          register={register}
          errors={errors}
          onRemoveLink={() => removeLink(linkIndex)}
          canRemoveLink={linkFields.length > 1}
        />
      ))}
    </div>
  );
}

// Link section component
function LinkSection({
  familyIndex,
  linkIndex,
  register,
  errors,
  onRemoveLink,
  canRemoveLink,
}: {
  familyIndex: number;
  linkIndex: number;
  register: any;
  errors: any;
  onRemoveLink: () => void;
  canRemoveLink: boolean;
}) {
  const linkErrors = errors?.families?.[familyIndex]?.links?.[linkIndex];

  return (
    <div className="mb-8 p-6 rounded-lg">
      <div className="mb-6">
        <h3 className="text-xl font-bold text-[#17161F] underline">
          Link {linkIndex + 1}
        </h3>
      </div>

      <div className="grid gap-6">
        {/* Mentor Section */}
        <div>
          <Label className="text-lg font-medium mb-3 block">Mentor:</Label>
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                type="text"
                placeholder="First name"
                className="w-full p-3 border border-gray-400 rounded-md text-[#17161F] placeholder:text-gray-600"
                {...register(`families.${familyIndex}.links.${linkIndex}.mentorFirstName`)}
              />
              {linkErrors?.mentorFirstName && (
                <p className="text-red-600 text-sm mt-1">
                  {linkErrors.mentorFirstName.message}
                </p>
              )}
            </div>
            <div className="flex-1">
              <Input
                type="text"
                placeholder="Last name"
                className="w-full p-3 border border-gray-400 rounded-md text-[#17161F] placeholder:text-gray-600"
                {...register(`families.${familyIndex}.links.${linkIndex}.mentorLastName`)}
              />
              {linkErrors?.mentorLastName && (
                <p className="text-red-600 text-sm mt-1">
                  {linkErrors.mentorLastName.message}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Mentee Section */}
        <div>
          <Label className="text-lg font-medium mb-3 block">Mentee:</Label>
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                type="text"
                placeholder="First name"
                className="w-full p-3 border border-gray-400 rounded-md text-[#17161F] placeholder:text-gray-600"
                {...register(`families.${familyIndex}.links.${linkIndex}.menteeFirstName`)}
              />
              {linkErrors?.menteeFirstName && (
                <p className="text-red-600 text-sm mt-1">
                  {linkErrors.menteeFirstName.message}
                </p>
              )}
            </div>
            <div className="flex-1">
              <Input
                type="text"
                placeholder="Last name"
                className="w-full p-3 border border-gray-400 rounded-md text-[#17161F] placeholder:text-gray-600"
                {...register(`families.${familyIndex}.links.${linkIndex}.menteeLastName`)}
              />
              {linkErrors?.menteeLastName && (
                <p className="text-red-600 text-sm mt-1">
                  {linkErrors.menteeLastName.message}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Title of Work */}
        <div>
          <Label className="text-lg font-medium mb-3 block">Title of the work:</Label>
          <Input
            type="text"
            placeholder="Title"
            className="w-full p-3 border border-gray-400 rounded-md text-[#17161F] placeholder:text-gray-600"
            {...register(`families.${familyIndex}.links.${linkIndex}.titleOfWork`)}
          />
          {linkErrors?.titleOfWork && (
            <p className="text-red-600 text-sm mt-1">
              {linkErrors.titleOfWork.message}
            </p>
          )}
        </div>

        {/* Institution and Date */}
        <div className="flex gap-6">
          <div className="flex-1">
            <Label className="text-lg font-medium mb-3 block">Institution:</Label>
            <Input
              type="text"
              placeholder="Institution"
              className="w-full p-3 border border-gray-400 rounded-md text-[#17161F] placeholder:text-gray-600"
              {...register(`families.${familyIndex}.links.${linkIndex}.institution`)}
            />
            {linkErrors?.institution && (
              <p className="text-red-600 text-sm mt-1">
                {linkErrors.institution.message}
              </p>
            )}
          </div>
          <div className="w-48">
            <Label className="text-lg font-medium mb-3 block">Date of defense:</Label>
            <Input
              type="text"
              placeholder="Year"
              className="w-full p-3 border border-gray-400 rounded-md text-[#17161F] placeholder:text-gray-600"
              {...register(`families.${familyIndex}.links.${linkIndex}.dateOfDefense`)}
            />
            {linkErrors?.dateOfDefense && (
              <p className="text-red-600 text-sm mt-1">
                {linkErrors.dateOfDefense.message}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
