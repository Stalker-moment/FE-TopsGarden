// app/components/ProfileBox.tsx
import React from "react";
import Image from "next/image";
import Link from "next/link";
import { cookies } from "next/headers";

// Tipe data untuk informasi kontak user
interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  createdAt: string;
  updatedAt: string;
  picture: string;
  banner: string;
}

// Tipe data untuk masing-masing project
interface Project {
  id: string;
  title: string;
  snapshot: string; // URL gambar snapshot project
  description: string;
}

// Tipe data untuk response API user (dalam kasus ini tidak ada data project)
interface UserResponse {
  id: string;
  email: string;
  role: string;
  createdAt: string;
  updatedAt: string;
  contact: Contact;
}

const ProfileBox: React.FC = async () => {
  const API_URL = process.env.NEXT_PUBLIC_HTTPS_API_URL;

  if (!API_URL) {
    throw new Error("HTTPS_API_URL is not defined in environment variables.");
  }

  // Mengambil token dari cookies (server component)
  const token = cookies().get("userAuth")?.value;

  if (!token) {
    return (
      <div className="rounded-md bg-white p-4 text-red-500 shadow">
        <p>Unauthorized. Please log in.</p>
      </div>
    );
  }

  try {
    const res = await fetch(`https://${API_URL}/api/users/account`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch user data: ${res.status}`);
    }

    // Mengambil data user dari API (tanpa data project)
    const data: UserResponse = await res.json();
    const { contact } = data;
    console.log("User data:", data);

    // Data dummy untuk project
    const dummyProjects: Project[] = [
      {
        id: "1",
        title: "Project A",
        snapshot: "/images/product/product_tefa-05.jpg", // pastikan path gambar sudah benar
        description: "Deskripsi singkat Project A",
      },
      {
        id: "2",
        title: "Project B",
        snapshot: "/images/product/product_tefa-05.jpg",
        description: "Deskripsi singkat Project B",
      },
      {
        id: "3",
        title: "Project C",
        snapshot: "/images/product/product_tefa-05.jpg",
        description: "Deskripsi singkat Project C",
      },
    ];

    // Untuk saat ini, gunakan dummyProjects sebagai data project
    const projects = dummyProjects;

    return (
      <div className="overflow-hidden rounded-lg bg-white shadow-lg dark:bg-gray-800">
        {/* Cover Image */}
        <div className="relative h-40 w-full md:h-60">
          <Image
            src={contact.banner || "/images/cover/cover-01.png"}
            alt="Profile Cover"
            fill
            style={{ objectFit: "cover" }}
            className="rounded-t-lg"
          />
        </div>

        {/* Profile Picture */}
        <div className="relative -mt-16 text-center">
          <Image
            src={contact.picture || "/images/user/default-avatar.png"}
            alt="Profile Picture"
            width={120}
            height={120}
            className="mx-auto rounded-full border-4 border-white dark:border-gray-700"
          />
        </div>

        <div className="p-6 text-center">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
            {`${contact.firstName} ${contact.lastName}`}
          </h3>
          <p className="text-gray-500 dark:text-gray-300">{contact.email}</p>

          {/* Statistik Project
          <div className="mt-5 border-t border-gray-200 pt-5 text-center dark:border-gray-600">
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              {projects.length}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-300">Projects</p>
          </div> */}

          {/* Tombol Edit Profile */}
          <div className="mt-5">
            <Link href="/dashboard/pages/settings">
              <button className="rounded-lg bg-blue-500 px-5 py-2 text-white transition hover:bg-blue-600">
                Edit Profile
              </button>
            </Link>
          </div>
        </div>

        {/* Snapshot Detail Project
        <div className="p-6 border-t border-gray-200 dark:border-gray-600">
          <h4 className="mb-3 text-center text-lg font-semibold text-gray-900 dark:text-white">
            Project Snapshots
          </h4>
          {projects.length === 0 ? (
            <p className="text-center text-gray-500 dark:text-gray-300">
              Belum ada project.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
              {projects.map((project) => (
                <div
                  key={project.id}
                  className="rounded-lg bg-gray-100 p-4 dark:bg-gray-700"
                >
                  <Image
                    src={
                      project.snapshot ||
                      "/images/product/product_tefa-05.jpg"
                    }
                    alt={project.title}
                    width={300}
                    height={200}
                    className="rounded-md"
                  />
                  <h5 className="mt-2 text-center text-md font-semibold text-gray-800 dark:text-white">
                    {project.title}
                  </h5>
                </div>
              ))}
            </div> */}
          {/* )} */}
        {/* </div> */}
      </div>
    );
  } catch (error: any) {
    console.error("Failed to fetch user data:", error);
    return (
      <div className="rounded-md bg-white p-4 text-red-500 shadow">
        <p>Error: {error.message}</p>
      </div>
    );
  }
};

export default ProfileBox;