import SignUpForm from "@/components/auth/SignUpForm";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign Up | LifeOS",
  description: "Create your LifeOS account",
};

export default function SignUp() {
  return <SignUpForm />;
}
