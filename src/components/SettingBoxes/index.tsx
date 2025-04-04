// app/dashboard/SettingBoxesWrapper.tsx
import SettingBoxes from "./SettingBoxes";
import { cookies } from "next/headers";

export interface UserData {
  contact: {
    firstName: string;
    lastName: string;
    phone: string;
    noreg?: string;
    email: string;
    picture: string;
  };
  email: string;
}

const SettingBoxesWrapper = async () => {
  const API_URL = process.env.NEXT_PUBLIC_HTTPS_API_URL;
  if (!API_URL) {
    throw new Error("NEXT_PUBLIC_HTTPS_API_URL is not defined in env variables.");
  }
  
  // Ambil token menggunakan cookies (server-side)
  const cookieStore = cookies();
  const token = cookieStore.get("userAuth")?.value;
  if (!token) {
    return <div>Unauthorized. Please log in.</div>;
  }

  // Lakukan fetch ke API secara server-side (token dan URL tidak terekspos di client)
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
  
  const data: UserData = await res.json();
  console.log(data);

  // Meneruskan data ke client component
  return <SettingBoxes initialUserData={data} />;
};

export default SettingBoxesWrapper;