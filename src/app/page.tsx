import Landing from "@/components/Landing/landing"

export const metadata = {
  title: "Hz",
  description: "This is the home page for the Dashboard Monitoring Garden",
  icons: "/images/logo/sw-removebg-preview.png",
};

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-grow">
        <Landing />
      </main>
    </div>
  )
}

