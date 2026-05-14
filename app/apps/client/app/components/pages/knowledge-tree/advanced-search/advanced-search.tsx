import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Undo2, Triangle } from "lucide-react";
import { StyledButton } from "~/components/extended-ui/Button";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "~/components/ui/collapsible";
import { cn } from "~/lib/utils";

const advancedSearchSchema = z.object({
  // Researcher fields
  researcherFirstName: z.string().optional(),
  researcherLastName: z.string().optional(),
  researcherDiscipline: z.string().optional(),
  researcherInstitution: z.string().optional(),

  // Work fields
  workTitle: z.string().optional(),
  workInstitution: z.string().optional(),
  workDefenseYear: z.string().optional(),

  // Institution fields
  institutionName: z.string().optional(),
});

type AdvancedSearchFormData = z.infer<typeof advancedSearchSchema>;

export default function AdvancedSearch() {
  const [isResearcherOpen, setIsResearcherOpen] = useState(false);
  const [isWorkOpen, setIsWorkOpen] = useState(false);
  const [isInstitutionOpen, setIsInstitutionOpen] = useState(false);

  const handleResearcherToggle = (open: boolean) => {
    setIsResearcherOpen(open);
    if (open) {
      setIsWorkOpen(false);
      setIsInstitutionOpen(false);
    }
  };

  const handleWorkToggle = (open: boolean) => {
    setIsWorkOpen(open);
    if (open) {
      setIsResearcherOpen(false);
      setIsInstitutionOpen(false);
    }
  };

  const handleInstitutionToggle = (open: boolean) => {
    setIsInstitutionOpen(open);
    if (open) {
      setIsResearcherOpen(false);
      setIsWorkOpen(false);
    }
  };

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AdvancedSearchFormData>({
    resolver: zodResolver(advancedSearchSchema),
  });

  const onSubmit = (data: AdvancedSearchFormData) => {
    console.log("Advanced search data:", data);
    // Handle form submission
  };

  const onSubmitResearcher = (data: AdvancedSearchFormData) => {
    const researcherData = {
      researcherFirstName: data.researcherFirstName,
      researcherLastName: data.researcherLastName,
      researcherDiscipline: data.researcherDiscipline,
      researcherInstitution: data.researcherInstitution,
    };
    console.log("Researcher search data:", researcherData);
    // Handle researcher search submission
  };

  const onSubmitWork = (data: AdvancedSearchFormData) => {
    const workData = {
      workTitle: data.workTitle,
      workInstitution: data.workInstitution,
      workDefenseYear: data.workDefenseYear,
    };
    console.log("Work search data:", workData);
    // Handle work search submission
  };

  const onSubmitInstitution = (data: AdvancedSearchFormData) => {
    const institutionData = {
      institutionName: data.institutionName,
    };
    console.log("Institution search data:", institutionData);
    // Handle institution search submission
  };

  return (
    <div className="p-6">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="relative mb-8">
          <h1 className="text-center text-[25px] md:text-[35px] font-serif text-[#17161F]"
            style={{
              fontFamily: 'Didot, serif',
              fontWeight: 700,
            }}
          >
            Advanced search
          </h1>
          <Undo2
            className="absolute right-0 top-0 h-8 w-8 cursor-pointer hover:opacity-70 transition-opacity"
            onClick={() => window.history.back()}
          />
        </div>

        <div className="max-w-4xl mx-auto">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Researcher Section */}
          <div>
            <Collapsible open={isResearcherOpen} onOpenChange={handleResearcherToggle}>
              <CollapsibleTrigger asChild>
                <div className="flex items-center justify-between cursor-pointer">
                  <h2 className="md:text-[35px] text-[25px] text-[#17161F]" style={{
                    fontFamily: 'Didot, serif',
                    fontWeight: 400,
                  }}>Researcher</h2>
                  <Triangle
                    className={cn(
                      "h-4 w-4 text-black transition-transform fill-current",
                      isResearcherOpen && "rotate-180"
                    )}
                    style={{ transform: 'rotate(180deg)' }}
                    fill="currentColor"
                  />
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 mt-4">
                {/* Name fields */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="researcherFirstName" className="text-sm font-serif text-gray-700">
                      Name:
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        id="researcherFirstName"
                        placeholder="First name"
                        className="h-8 p-4 border border-black rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        {...register("researcherFirstName")}
                      />
                      <Input
                        placeholder="Last name"
                        className="h-8 p-4 border border-black rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        {...register("researcherLastName")}
                      />
                    </div>
                  </div>
                </div>

                {/* Discipline field */}
                <div>
                  <Label htmlFor="researcherDiscipline" className="text-sm font-serif text-gray-700">
                    Discipline:
                  </Label>
                  <Input
                    id="researcherDiscipline"
                    placeholder="Discipline"
                    className="h-8 p-4 border border-black rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    {...register("researcherDiscipline")}
                  />
                </div>

                {/* Institution field */}
                <div>
                  <Label htmlFor="researcherInstitution" className="text-sm font-serif text-gray-700">
                    Institution:
                  </Label>
                  <Input
                    id="researcherInstitution"
                    placeholder="Institution"
                    className="h-8 p-4 border border-black rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    {...register("researcherInstitution")}
                  />
                </div>

                <div className="flex justify-center pt-4 mb-10">
                  <div onClick={handleSubmit(onSubmitResearcher)}>
                    <StyledButton text="Submit" />
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>

          {/* Gradient Border */}
          <div
            className="h-[2px] max-w-6xl mx-auto my-3"
            style={{
              background: "linear-gradient(to right, #A9B0C200, #17161F, #A9B0C200)",
            }}
          ></div>

          {/* Work Section */}
          <div className="pt-6">
            <Collapsible open={isWorkOpen} onOpenChange={handleWorkToggle}>
              <CollapsibleTrigger asChild>
                <div className="flex items-center justify-between cursor-pointer">
                  <h2 className="md:text-[35px] text-[25px] text-[#17161F]" style={{
                    fontFamily: 'Didot, serif',
                    fontWeight: 400,
                  }}>Work</h2>
                  <Triangle
                    className={cn(
                      "h-4 w-4 text-black transition-transform fill-current",
                      isWorkOpen && "rotate-180"
                    )}
                    style={{ transform: 'rotate(180deg)' }}
                    fill="currentColor"
                  />
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 mt-4">
                <div>
                  <Label htmlFor="workTitle" className="text-sm font-serif text-gray-700">
                    Title:
                  </Label>
                  <Input
                    id="workTitle"
                    placeholder="Title"
                    className="h-8 p-4 border border-black rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    {...register("workTitle")}
                  />
                </div>
                <div>
                  <Label htmlFor="workInstitution" className="text-sm font-serif text-gray-700">
                    Institution:
                  </Label>
                  <Input
                    id="workInstitution"
                    placeholder="Institution"
                    className="h-8 p-4 border border-black rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    {...register("workInstitution")}
                  />
                </div>
                <div>
                  <Label htmlFor="workDefenseYear" className="text-sm font-serif text-gray-700">
                    Defense year:
                  </Label>
                  <Input
                    id="workDefenseYear"
                    placeholder="Year"
                    className="h-8 p-4 border border-black rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    {...register("workDefenseYear")}
                  />
                </div>

                <div className="flex justify-center pt-4 mb-10">
                  <div onClick={handleSubmit(onSubmitWork)}>
                    <StyledButton text="Submit" />
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>

          {/* Gradient Border */}
          <div
            className="h-[2px] max-w-6xl mx-auto my-3"
            style={{
              background: "linear-gradient(to right, #A9B0C200, #17161F, #A9B0C200)",
            }}
          ></div>

          {/* Institution Section */}
          <div className="pt-6">
            <Collapsible open={isInstitutionOpen} onOpenChange={handleInstitutionToggle}>
              <CollapsibleTrigger asChild>
                <div className="flex items-center justify-between cursor-pointer">
                  <h2 className="md:text-[35px] text-[25px] text-[#17161F]" style={{
                    fontFamily: 'Didot, serif',
                    fontWeight: 400,
                  }}>Institution</h2>
                  <Triangle
                    className={cn(
                      "h-4 w-4 text-black transition-transform fill-current",
                      isInstitutionOpen && "rotate-180"
                    )}
                    style={{ transform: 'rotate(180deg)' }}
                    fill="currentColor"
                  />
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 mt-4">
                <div>
                  <Label htmlFor="institutionName" className="text-sm font-serif text-gray-700">
                    Name:
                  </Label>
                  <Input
                    id="institutionName"
                    placeholder="Institution"
                    className="h-8 p-4 border border-black rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    {...register("institutionName")}
                  />
                </div>

                <div className="flex justify-center pt-4 mb-10">
                  <div onClick={handleSubmit(onSubmitInstitution)}>
                    <StyledButton text="Submit" />
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        </form>
        </div>
      </div>
    </div>
  );
}
