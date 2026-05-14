import { Github, TestTubesIcon, Trash2 } from "lucide-react"; // Using Image for Google icon
import type React from "react";
import { useState } from "react";
// You might want to find better icons for Google or use SVGs
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { m } from "~/paraglide/messages";

interface LinkedAccount {
  id: string;
  provider: string;
  email: string;
  icon: React.ElementType;
}

const MOCK_LINKED_ACCOUNTS: LinkedAccount[] = [
  {
    id: "1",
    provider: "Google",
    email: "alice.g@gmail.com",
    icon: TestTubesIcon,
  },
];

const AVAILABLE_PROVIDERS = [
  { id: "google", name: "Google", icon: TestTubesIcon },
  { id: "github", name: "GitHub", icon: Github },
  // Add more providers here
];

export function LinkedAccountsSection() {
  const [linkedAccounts, setLinkedAccounts] =
    useState<LinkedAccount[]>(MOCK_LINKED_ACCOUNTS);

  const handleAddAccount = (
    providerName: string,
    ProviderIcon: React.ElementType,
  ) => {
    // In a real app, this would trigger an OAuth flow
    const newAccount: LinkedAccount = {
      id: Date.now().toString(),
      provider: providerName,
      email: `${providerName.toLowerCase()}.user@example.com`, // Mock email
      icon: ProviderIcon,
    };
    setLinkedAccounts((prev) => [...prev, newAccount]);
  };

  const handleRemoveAccount = (accountId: string) => {
    setLinkedAccounts((prev) => prev.filter((acc) => acc.id !== accountId));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{m["profile.linkedAccounts.title"]()}</CardTitle>
        <CardDescription>
          {m["profile.linkedAccounts.description"]()}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {linkedAccounts.length > 0 ? (
          <ul className="space-y-4">
            {linkedAccounts.map((account) => (
              <li
                key={account.id}
                className="flex items-center justify-between rounded-md border p-3"
              >
                <div className="flex items-center space-x-3">
                  <account.icon className="h-6 w-6" />
                  <div>
                    <p className="font-medium">{account.provider}</p>
                    <p className="text-muted-foreground text-sm">
                      {account.email}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveAccount(account.id)}
                >
                  <Trash2 className="mr-1 h-4 w-4" />{" "}
                  {m["profile.linkedAccounts.remove"]()}
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground text-sm">
            {m["profile.linkedAccounts.noAccounts"]()}
          </p>
        )}

        <div className="pt-4">
          <h4 className="mb-2 font-medium text-sm">Add New Account:</h4>
          <div className="flex flex-wrap gap-2">
            {AVAILABLE_PROVIDERS.filter(
              (p) =>
                !linkedAccounts.some(
                  (la) => la.provider.toLowerCase() === p.id.toLowerCase(),
                ),
            ).map((provider) => (
              <Button
                key={provider.id}
                variant="outline"
                onClick={() => handleAddAccount(provider.name, provider.icon)}
              >
                <provider.icon className="mr-2 h-4 w-4" />
                {m["profile.linkedAccounts.connect"]()}
                {provider.name}
              </Button>
            ))}
            {AVAILABLE_PROVIDERS.filter(
              (p) =>
                !linkedAccounts.some(
                  (la) => la.provider.toLowerCase() === p.id.toLowerCase(),
                ),
            ).length === 0 && (
              <p className="text-muted-foreground text-sm">
                {m["profile.linkedAccounts.allConnected"]()}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
