import type { MetaFunction } from "react-router";

export const meta: MetaFunction = () => [
  { title: "Contact Us – Legacy" },
  {
    name: "description",
    content:
      "Get in touch with the Legacy team. We'd love to hear from you — whether you have questions, feedback, or want to contribute.",
  },
];

export default function ContactUsPage() {
  return (
    <div>
      <h1>Contact Us</h1>
      <p>If you have any questions, feel free to reach out!</p>
      <p>Mail: example@test.com</p>
    </div>
  );
}
