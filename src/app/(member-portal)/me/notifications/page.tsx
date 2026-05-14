import { redirect } from "next/navigation";

export default function MemberNotificationsRedirect() {
  redirect("/me/profile?tab=notifications");
}
