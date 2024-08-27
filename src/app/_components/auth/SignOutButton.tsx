import { Button } from "flowbite-react";
import { signOut } from "@/app/auth";

export async function SignOutButton() {
  return (
    <form>
      <Button
        type="submit"
        formAction={async () => {
          "use server";
          await signOut();
        }}
      >
        Sign Out
      </Button>
    </form>
  );
}
