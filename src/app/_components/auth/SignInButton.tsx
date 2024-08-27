import { Button } from "flowbite-react";
import { signIn } from "@/app/auth";

export async function SignInButton() {
  return (
    <form>
      <Button
        type="submit"
        formAction={async () => {
          "use server";
          await signIn();
        }}
      >
        Sign In
      </Button>
    </form>
  );
}
