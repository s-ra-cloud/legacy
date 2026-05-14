import { Link } from "react-router";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";
import { StyledButton } from "~/components/extended-ui/Button";
import { Button } from "~/components/ui/button";
import { SAFE_ROUTES } from "~/safe-routes";
import type { AuthUser } from "@repo/server";
import { CONFIG } from "~/utils/config";

interface HeaderProps {
	user?: AuthUser | null;
}

export default function Header({ user }: HeaderProps) {
	return (
		<header className="fixed top-0 left-0 w-full h-16 pl-4 bg-[#0E0D14] flex justify-between items-center z-50">
			<div className="flex items-center">
				<Link to={SAFE_ROUTES.HOME}>
					<img
						src={CONFIG.logo}
						alt="LEGACY Logo"
						width={45}
						height={45}
					/>
				</Link>
			</div>

			<nav className="flex gap-6 items-center text-lg"
				style={{
					fontFamily: 'Didot, serif',
					fontWeight: 400,
					fontSize: '23px',
				}}
			>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button
							variant="link"
							className="text-white hover:text-gray-200 p-0 h-auto font-normal text-lg"
						>
							Projects
							<ChevronDown className="w-4 h-4 ml-1" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						<DropdownMenuItem asChild>
							<Link to={SAFE_ROUTES.PROJECTS_LIBRARY} className="cursor-pointer">
								Library
							</Link>
						</DropdownMenuItem>
						<DropdownMenuItem asChild>
							<Link to={SAFE_ROUTES.PROJECTS_CONVERSATION} className="cursor-pointer">
								Great Conversation
							</Link>
						</DropdownMenuItem>
						<DropdownMenuItem asChild>
							<Link to={SAFE_ROUTES.PROJECTS_TREE} className="cursor-pointer">
								Knowledge Tree
							</Link>
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>

				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button
							variant="link"
							className="text-white hover:text-gray-200 p-0 h-auto font-normal text-lg"
						>
							About
							<ChevronDown className="w-4 h-4 ml-1" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						<DropdownMenuItem asChild>
							<Link to={SAFE_ROUTES.TEAM} className="cursor-pointer">
								Team
							</Link>
						</DropdownMenuItem>
						<DropdownMenuItem asChild>
							<Link to={SAFE_ROUTES.MANIFESTO} className="cursor-pointer">
								Manifesto
							</Link>
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>

				{user ? (
					<Link to={SAFE_ROUTES.MY_RECORD}>
						<StyledButton text={user.name} className="rounded-none h-16 shadow-none" />
					</Link>
				) : (
				<Link to={SAFE_ROUTES.SIGN_IN}>
					<StyledButton text="Sign in/up" className="rounded-none h-16 shadow-none" />
				</Link>
				)}
			</nav>
		</header>
	);
}
