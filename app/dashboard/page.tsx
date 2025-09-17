import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { CreditWidget } from "@/components/credits/credit-widget";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen } from "lucide-react";

export default async function Dashboard() {
  const result = await auth.api.getSession({
    headers: await headers(), // you need to pass the headers object.
  });

  if (!result?.session?.userId) {
    redirect("/sign-in");
  }

  return (
    <section className="flex flex-col items-start justify-start p-6 w-full">
      <div className="w-full">
        <div className="flex flex-col items-start justify-center gap-2 mb-6">
          <h1 className="text-3xl font-semibold tracking-tight">
            Dashboard
          </h1>
          <p className="text-muted-foreground">
            Welcome back! Here&apos;s an overview of your account.
          </p>
        </div>
        
        <div className="grid gap-6 md:grid-cols-4">
          {/* Left Column - Create Book Card */}
          <div className="md:col-span-1">
            <Card className="h-full flex flex-col">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <BookOpen className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-lg">Create a book</CardTitle>
                </div>
                <CardDescription>
                  To publish your book digitally, first enter the book details.
                </CardDescription>
              </CardHeader>
              <CardFooter className="mt-auto">
                <Link href="/dashboard/books/new" className="w-full">
                  <Button className="w-full">
                    Create new book
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          </div>
          
          {/* Right Column - Other Widgets */}
          <div className="md:col-span-3 space-y-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-6">
                <CreditWidget />
              </div>
              {/* Add more widgets here */}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
