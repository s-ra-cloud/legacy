import type { MetaFunction } from "react-router";

export const meta: MetaFunction = () => [
  { title: "Privacy Policy – Legacy" },
  {
    name: "description",
    content:
      "Read the Legacy privacy policy to understand how we collect, use, and protect your personal information.",
  },
];

export default function PrivacyPage() {
  return <div>Privacy Policy</div>;
}
