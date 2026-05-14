import { redirect } from "next/navigation";

export default function MemberEventsRedirect() {
  redirect("/me/connect?tab=events");
}
