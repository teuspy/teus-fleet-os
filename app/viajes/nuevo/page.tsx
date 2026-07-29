import { redirect } from "next/navigation";

export default function Page() {
  redirect("/viajes?new=1");
}
