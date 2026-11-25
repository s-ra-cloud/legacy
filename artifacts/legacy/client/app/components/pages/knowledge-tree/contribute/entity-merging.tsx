import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";

// Schema for institution merging
const institutionMergingSchema = z.object({
  id: z.string(),
  institution1: z.string().min(1, "Institution 1 is required"),
  institution2: z.string().min(1, "Institution 2 is required"),
});

// Schema for scholar merging
const scholarMergingSchema = z.object({
  id: z.string(),
  scholar1: z.string().min(1, "Scholar name 1 is required"),
  scholar2: z.string().min(1, "Scholar name 2 is required"),
});

const entityMergingFormSchema = z.object({
  institutions: z.array(institutionMergingSchema).min(1, "At least one institution merging is required"),
  scholars: z.array(scholarMergingSchema).min(1, "At least one scholar merging is required"),
});

type FormData = z.infer<typeof entityMergingFormSchema>;

export function EntityMergingForm() {
  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(entityMergingFormSchema),
    defaultValues: {
      institutions: [
        {
          id: "institution_merging_1",
          institution1: "",
          institution2: "",
        },
      ],
      scholars: [
        {
          id: "scholar_merging_1",
          scholar1: "",
          scholar2: "",
        },
      ],
    },
  });

  const {
    fields: institutionFields,
    append: appendInstitution,
    remove: removeInstitution
  } = useFieldArray({
    control,
    name: "institutions",
  });

  const {
    fields: scholarFields,
    append: appendScholar,
    remove: removeScholar
  } = useFieldArray({
    control,
    name: "scholars",
  });

  const onSubmit = (data: FormData) => {
    console.log("Entity merging form data:", data);
    // Here you would typically send the data to your API
  };

  const addNewInstitutionMerging = () => {
    const newId = `institution_merging_${institutionFields.length + 1}`;
    appendInstitution({
      id: newId,
      institution1: "",
      institution2: "",
    });
  };

  const addNewScholarMerging = () => {
    const newId = `scholar_merging_${scholarFields.length + 1}`;
    appendScholar({
      id: newId,
      scholar1: "",
      scholar2: "",
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
          Entity merging
        </h1>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-12">
          {/* Institutions Section */}
          <div>
            <h2
              className="text-[24px] font-bold text-[#17161F] mb-8 underline"
              style={{
                fontFamily: 'Didot, serif',
              }}
            >
              Institutions
            </h2>

            {institutionFields.map((institution, index) => (
              <div key={institution.id} className="mb-8">
                <div className="flex items-center gap-4 mb-6">
                  <h3 className="text-[20px] font-medium text-[#17161F]">
                    Institution merging {index + 1}
                  </h3>
                  <button
                    type="button"
                    onClick={addNewInstitutionMerging}
                    className="flex items-center gap-2 text-[#17161F] hover:text-[#0E0D14] transition-colors"
                  >
                    <Plus className="w-5 h-5" />
                    <span className="text-sm underline">New institution merging</span>
                  </button>
                </div>

                <div className="space-y-4 mb-6">
                  <div>
                    <Label className="text-lg font-medium mb-2 block">Institution 1:</Label>
                    <Input
                      type="text"
                      placeholder="Institution"
                      className="w-full p-3 border border-gray-400 rounded-md text-[#17161F] placeholder:text-gray-600 bg-gray-100"
                      {...register(`institutions.${index}.institution1`)}
                    />
                    {errors?.institutions?.[index]?.institution1 && (
                      <p className="text-red-600 text-sm mt-1">
                        {errors.institutions[index]?.institution1?.message}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <Label className="text-lg font-medium mb-2 block">Institution 2:</Label>
                      <Input
                        type="text"
                        placeholder="Institution"
                        className="w-full p-3 border border-gray-400 rounded-md text-[#17161F] placeholder:text-gray-600 bg-gray-100"
                        {...register(`institutions.${index}.institution2`)}
                      />
                      {errors?.institutions?.[index]?.institution2 && (
                        <p className="text-red-600 text-sm mt-1">
                          {errors.institutions[index]?.institution2?.message}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      className="flex items-center gap-2 text-[#17161F] hover:text-[#0E0D14] transition-colors mt-6"
                    >
                      <Plus className="w-5 h-5" />
                      <span className="text-sm underline">New institution</span>
                    </button>
                  </div>
                </div>

                <div className="text-center">
                  <button
                    type="button"
                    className="px-8 py-3 rounded-lg text-[#17161F] text-lg font-bold transition-all duration-300
                      hover:text-white hover:brightness-75 hover:saturate-150"
                    style={{
                      background: "radial-gradient(ellipse at center, #A9B0C2 50%, #E3CCD2 100%)",
                      boxShadow: "0 0 8px rgba(2, 138, 97, 0.3)",
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
                    >
                      Merge
                    </span>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Scholars Section */}
          <div>
            <h2
              className="text-[24px] font-bold text-[#17161F] mb-8 underline"
              style={{
                fontFamily: 'Didot, serif',
              }}
            >
              Scholars
            </h2>

            {scholarFields.map((scholar, index) => (
              <div key={scholar.id} className="mb-8">
                <div className="flex items-center gap-4 mb-6">
                  <h3 className="text-[20px] font-medium text-[#17161F]">
                    Scholar merging {index + 1}
                  </h3>
                  <button
                    type="button"
                    onClick={addNewScholarMerging}
                    className="flex items-center gap-2 text-[#17161F] hover:text-[#0E0D14] transition-colors"
                  >
                    <Plus className="w-5 h-5" />
                    <span className="text-sm underline">New scholar merging</span>
                  </button>
                </div>

                <div className="space-y-4 mb-6">
                  <div>
                    <Label className="text-lg font-medium mb-2 block">Scholar name 1:</Label>
                    <div className="text-gray-600 text-sm mb-2">First name, Last name, institution, date of defense</div>
                    <Input
                      type="text"
                      value="First name, Last name, institution, date of defense"
                      readOnly
                      className="w-full p-3 border border-gray-400 rounded-md text-[#17161F] bg-gray-50"
                    />
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <Label className="text-lg font-medium mb-2 block">Scholar name 2:</Label>
                      <Input
                        type="text"
                        placeholder="Search"
                        className="w-full p-3 border border-gray-400 rounded-md text-[#17161F] placeholder:text-gray-600 bg-gray-100"
                        {...register(`scholars.${index}.scholar2`)}
                      />
                      {errors?.scholars?.[index]?.scholar2 && (
                        <p className="text-red-600 text-sm mt-1">
                          {errors.scholars[index]?.scholar2?.message}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      className="flex items-center gap-2 text-[#17161F] hover:text-[#0E0D14] transition-colors mt-6"
                    >
                      <Plus className="w-5 h-5" />
                      <span className="text-sm underline">Add new</span>
                    </button>
                  </div>
                </div>

                <div className="text-center">
                  <button
                    type="button"
                    className="px-8 py-3 rounded-lg text-[#17161F] text-lg font-bold transition-all duration-300
                      hover:text-white hover:brightness-75 hover:saturate-150"
                    style={{
                      background: "radial-gradient(ellipse at center, #A9B0C2 50%, #E3CCD2 100%)",
                      boxShadow: "0 0 8px rgba(2, 138, 97, 0.3)",
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
                    >
                      Merge
                    </span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </form>
      </div>

      <div
        className="h-[2px] max-w-6xl mx-auto mb-12 mt-16"
        style={{
          background: "linear-gradient(to right, #A9B0C200, #17161F, #A9B0C200)",
        }}
      />
    </section>
  );
}
