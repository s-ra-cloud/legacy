import { Bell, ShieldCheck, User } from "lucide-react"; // Icons for tabs
import { useLoaderData } from "react-router";
import { LinkedAccountsSection } from "~/components/pages/profile/linked-account";
import { PasswordChangeDialog } from "~/components/pages/profile/password-change";
import { ProfileForm } from "~/components/pages/profile/profile-form";
import { NotificationSettings } from "~/components/pages/profile/settings";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "~/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { m } from "~/paraglide/messages";
import { getUserOrRedirect } from "~/utils/auth";

interface LoaderArgs {
    request: Request;
}
export async function loader({ request }: LoaderArgs) {
  const user = await getUserOrRedirect(request);
  return { user };
}

export default function ProfilePage() {
    const { user } = useLoaderData<typeof loader>();
    return (
        <div className="container mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
            <h1 className="mb-2 font-bold text-3xl">{m["profile.title"]()}</h1>
            <p className="mb-8 text-muted-foreground">{m["profile.description"]()}</p>

            <Tabs defaultValue="profile" className="w-full">
                <TabsList className="mb-6 grid w-full grid-cols-2 md:grid-cols-4">
                    <TabsTrigger value="profile">
                        <User className="me-2 h-4 w-4" />
                        {m["profile.tabs.profile"]()}
                    </TabsTrigger>
                    <TabsTrigger value="security">
                        <ShieldCheck className="me-2 h-4 w-4" />
                        {m["profile.tabs.security"]()}
                    </TabsTrigger>
                    <TabsTrigger value="connections">
                        <svg
                            role="graphics-symbol"
                            xmlns="http://www.w3.org/2000/svg"
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="lucide lucide-link me-2 h-4 w-4"
                        >
                            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                        </svg>
                        {m["profile.tabs.connections"]()}
                    </TabsTrigger>
                    <TabsTrigger value="notifications">
                        <Bell className="me-2 h-4 w-4" />
                        {m["profile.tabs.notifications"]()}
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="profile">
                    <Card>
                        <CardHeader>
                            <CardTitle>{m["profile.publicProfile.title"]()}</CardTitle>
                            <CardDescription>
                                {m["profile.publicProfile.description"]()}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ProfileForm user={user}/>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="security">
                    <Card>
                        <CardHeader>
                            <CardTitle>{m["profile.security.title"]()}</CardTitle>
                            <CardDescription>
                                {m["profile.security.description"]()}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div>
                                <h3 className="mb-2 font-medium text-lg">
                                    {m["profile.security.password.title"]()}
                                </h3>
                                <p className="mb-4 text-muted-foreground text-sm">
                                    {m["profile.security.password.description"]()}
                                </p>
                                <PasswordChangeDialog />
                            </div>
                            {/* Add 2FA settings here if needed in the future */}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="connections">
                    <LinkedAccountsSection />
                </TabsContent>

                <TabsContent value="notifications">
                    <NotificationSettings />
                </TabsContent>
            </Tabs>
        </div>
    );
}
