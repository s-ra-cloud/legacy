import { SettingsForm } from "~/components/pages/settings/settings";

export default function SettingsIndexPage() {
	return (
		<main className="flex flex-col min-h-screen bg-charcoal">
      <div className="mt-20 mb-10">
        <SettingsForm />
      </div>
    </main>
	)
}
