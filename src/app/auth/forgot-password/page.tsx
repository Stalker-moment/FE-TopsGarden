import React from "react";
import { FC } from "react";
import Link from "next/link";
import Image from "next/image";
import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import { Metadata } from "next";
import DefaultLayout from "@/components/Layouts/DefaultLaout";
import OutLayout from "@/components/Layouts/outLaout";
import ForgotPassword from "@/components/Auth/forgot-password";

export const metadata: Metadata = {
  title: "Sign In | Dashboard Monitoring Garden",
  description: "This is the login page for the Dashboard Monitoring Garden",
  icons: "/images/logo/sw-removebg-preview.png",
};

const SignIn: React.FC = () => {
  return (
      <ForgotPassword />
  );
};

export default SignIn;
