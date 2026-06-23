// Redirect old /content page to the new Content Studio
import { redirect } from "next/navigation";

export default function ContentPage() {
  redirect("/content-studio");
}
