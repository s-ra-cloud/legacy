import { useEffect, useState } from "react";

/**
 * True once `active` has stayed true for `delayMs` — used to surface a
 * "taking longer than expected" state during slow loads.
 */
export function useSlowLoading(active: boolean, delayMs = 8000): boolean {
	const [slow, setSlow] = useState(false);

	useEffect(() => {
		if (!active) {
			setSlow(false);
			return;
		}
		const id = window.setTimeout(() => setSlow(true), delayMs);
		return () => window.clearTimeout(id);
	}, [active, delayMs]);

	return slow;
}

/**
 * Derive a human-readable message from the various error shapes the API can
 * produce ({error}, {message}, Error instances, or nothing at all).
 */
export function readableErrorMessage(error: unknown): string {
	if (error && typeof error === "object") {
		const e = error as Record<string, unknown>;
		if (typeof e.error === "string" && e.error.trim()) return e.error;
		if (typeof e.message === "string" && e.message.trim()) return e.message;
	}
	if (typeof error === "string" && error.trim()) return error;
	return "Something went wrong while loading. Please try again.";
}
