import { Image as ImageIcon, User } from "lucide-react"; // Renamed Image to avoid conflict
import type { ChangeEvent } from "react";
import React, { useRef, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import { mediaIdToImageUrl } from "~/lib/api/client";
import { m } from "~/paraglide/messages";

interface UserAvatarProps {
	initialImage?: string | null;
	userName?: string;
	onFileSelect?: (file: File | null) => void;
}

export function UserAvatar({
	initialImage,
	userName = "User",
	onFileSelect,
}: UserAvatarProps) {
	const currentImage =  initialImage
		? `${mediaIdToImageUrl(initialImage)}`
		: null;
	const [imagePreview, setImagePreview] = useState<string | null>(
		currentImage || null,
	);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		if (file) {
			const reader = new FileReader();
			reader.onloadend = () => {
				setImagePreview(reader.result as string);
			};
			reader.readAsDataURL(file);
			onFileSelect?.(file);
		}
	};

	const triggerFileSelect = () => fileInputRef.current?.click();

	const getInitials = (name: string) => {
		const names = name.split(" ");
		if (names.length === 1) return names.at(0)?.substring(0, 2)?.toUpperCase();
		return `${names.at(0)?.at(0)?.toUpperCase()} ${names
			.at(names.length - 1)
			?.at(0)
			?.toUpperCase()}`;
	};

	return (
		<div className="flex flex-col items-center space-y-4">
			<Avatar className="h-32 w-32">
				<AvatarImage src={imagePreview || undefined} alt={userName} />
				<AvatarFallback>
					{imagePreview ? (
						<User className="h-16 w-16" />
					) : (
						getInitials(userName)
					)}
				</AvatarFallback>
			</Avatar>
			<input
				type="file"
				ref={fileInputRef}
				onChange={handleImageChange}
				accept="image/*"
				className="hidden"
			/>
			<Button variant="outline" onClick={triggerFileSelect}>
				<ImageIcon className="mr-2 h-4 w-4" />{" "}
				{m["profile.avatar.changePhoto"]()}
			</Button>
			{imagePreview && (
				<Button
					variant="ghost"
					size="sm"
					onClick={() => {
						setImagePreview(null);
						if (fileInputRef.current) fileInputRef.current.value = ""; // Reset file input
						onFileSelect?.(null);
					}}
				>
					{m["profile.avatar.removePhoto"]()}
				</Button>
			)}
		</div>
	);
}
