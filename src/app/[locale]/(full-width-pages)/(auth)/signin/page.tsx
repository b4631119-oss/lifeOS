import SignInForm from "@/components/auth/SignInForm";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In | LifeOS",
  description: "Sign in to your LifeOS account",
};

export default function SignIn() {
  return <SignInForm />;
}
