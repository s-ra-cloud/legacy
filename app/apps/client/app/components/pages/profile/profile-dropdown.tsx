import type { AuthUser } from "@repo/server";
import { ChevronDownIcon, LogOutIcon, UserPen } from "lucide-react";

import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Logout } from "../../logout";
import EditProfileDialog from "./edit-profile";
import { mediaIdToImageUrl } from "~/lib/api/client";

interface ProfileDropdownProps {
  user: AuthUser;
}

export default function ProfileDropdown({ user }: ProfileDropdownProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const image = user.imageId ? `${mediaIdToImageUrl(user.imageId)}` : "/avatar.jpg";
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-auto p-0 hover:bg-transparent">
            <Avatar>
              <AvatarImage src={image} alt="Profile image" />
              <AvatarFallback>
                {user.name?.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <ChevronDownIcon
              size={16}
              className="opacity-60"
              aria-hidden="true"
            />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="max-w-64">
          <DropdownMenuLabel className="flex min-w-0 flex-col">
            <span className="truncate font-medium text-foreground text-sm">
              {user.name}
            </span>
            <span className="truncate font-normal text-muted-foreground text-xs">
              {user.email}
            </span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={() => setIsDialogOpen(true)}>
              <UserPen size={16} className="opacity-60" aria-hidden="true" />
              <span>Edit profile</span>
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem>
            <Logout>
              <span className="flex items-center gap-2">
                <LogOutIcon
                  size={16}
                  className="opacity-60"
                  aria-hidden="true"
                />
                Logout
              </span>
            </Logout>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <EditProfileDialog
        user={user}
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
      />
    </>
  );
}
