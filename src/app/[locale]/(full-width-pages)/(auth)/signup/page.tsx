import SignUpForm from "@/components/auth/SignUpForm";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign Up | Admin Dashboard",
  description: "Create a new account",
};

export default function SignUp() {
  return <SignUpForm />;
}
