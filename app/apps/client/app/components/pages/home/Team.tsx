import { StyledButton } from "~/components/extended-ui/Button";
import { Link } from 'react-router';
import { $api } from "@repo/ui";
import type { Team } from "@repo/server";
import { SAFE_ROUTES } from "~/safe-routes";


export default function Team() {
	const { data, isLoading, error } = $api.useQuery("get", "/teams");

	if (isLoading)
		return <div className="text-center p-8">Loading team members...</div>;
	if (error)
		return (<div className="text-center p-8 text-red-500">Error: {error.code}</div>);

	const teamMembers = data?.data;

	const categorizedMembers = (teamMembers || []).reduce(
		(acc: Record<string, Team[]>, member) => {
			const category = member.category || "Uncategorized";
			if (!acc[category]) acc[category] = [];
			acc[category].push(member);
			return acc;
		},
		{
			"Direction & Design": [],
			"Scientific advisors": [],
			"Research & development team": []
		}
	);

	return (
		<section className="py-10 px-4 text-white">
			<h2
				className="text-[31px] 2xl:text-[35px] text-center text-4xl text-black font-extralight font-serif mb-10 uppercase tracking-wide"
				style={{
					fontFamily: 'Didot, serif',
					fontWeight: 700,
					textShadow: '2px 4px 4px rgba(2, 138, 97, 0.9)',
				}}
			>
				Meet the Core Team Behind LEGACY
			</h2>

			<div
				className="h-[2px] max-w-3xl mx-auto mb-8"
				style={{
					background:
						"linear-gradient(to right, transparent, rgba(227, 219, 220, 0.5) 50%, transparent)",
				}}
			></div>

			<p className="text-[20px] 2xl:text-[22px] text-center text-black max-w-5xl mx-auto mb-8"
				style={{
					fontWeight: 400,
					lineHeight: "1.3",
				}}
			>
				LEGACY is led by a team of academics at the IAS UM6P and is supported by
				an international network of scholars. Research done with the LEGACY
				tools is published in the{" "}
				<span className="italic" style={{ fontWeight: 500, color: "#028A61", }}>
					Global Identity Studies Journal
				</span>
				, an open-access publication fostering interdisciplinary research on
				classical texts and digital humanities.
			</p>

			<div
				className="h-[2px] max-w-3xl mx-auto mb-16"
				style={{
					background:
						"linear-gradient(to right, transparent, rgba(227, 219, 220, 0.5) 50%, transparent)",
				}}
			></div>

			{Object.entries(categorizedMembers).map(([category, members]) => (
				<Category key={category} members={members} />
			))}

			<div className="text-center max-w-60 mx-auto">
				<Link to={SAFE_ROUTES.TEAM}>
					<StyledButton text="Learn about our team and experts" />
				</Link>
			</div>
		</section>
	);
}

const Category = ({
	members,
}: {
	members: Team[];
}) => {
	if (!members || members.length === 0) return null;

	return (
		<div className="mb-8">
			<div className="flex flex-wrap justify-center gap-x-30 lg:gap-x-40">
				{members.map((member) => (
					<MemberCard key={member.id} member={member} />
				))}
			</div>
		</div>
	);
};

const MemberCard = ({ member }: { member: Team }) => {

	return (
		<div className="flex flex-col items-center text-center">
			<div className="w-36 h-48 rounded-3xl overflow-hidden mb-3"
				style={{
					boxShadow: "4px 4px 4px rgba(45, 43, 61, 0.5)", // shadow with your color and 50% opacity
				}}>
				{member.picture.url ? (
					<img
						src={member.picture.url}
						alt={member.name || "Team member"}
						width={400}
						height={320}
						className="object-cover h-full"
					/>
				) : (
					<div className="w-full h-full bg-gray-700 flex items-center justify-center">
						<span className="text-gray-400">Photo</span>
					</div>
				)}
			</div>
			<h3
				className="text-lg text-black font-serif mb-0"
				style={{
					fontFamily: 'Didot, serif',
					fontWeight: 700,
					fontSize: '17px',
					textShadow: '2px 4px 4px rgba(227, 123, 91, 0.9)',
				}}
			>
				{member.name}
			</h3>
			<p
				className="text-black text-sm max-w-40 m-0"
				style={{
					fontWeight: 300,
					fontSize: '15px',
				}}
			>
				{member.role}
			</p>
		</div>
	);
}
