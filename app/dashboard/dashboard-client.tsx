"use client";

import { CreditWidget } from "@/components/credits/credit-widget";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen } from "lucide-react";
import { DashboardHelp } from "@/components/dashboard/dashboard-help";

export function DashboardClient() {
  return (
    <div className="w-full">
      <div className="flex flex-col items-start justify-center gap-2 mb-6">
        <h1 className="text-3xl font-semibold tracking-tight">
          Dashboard
        </h1>
        <p className="text-muted-foreground">
          Welcome back! Here&apos;s an overview of your account.
        </p>
      </div>
      
      <div className="flex flex-col lg:flex-row gap-8 w-full">
        {/* Main Content - 2/3 width */}
        <div className="w-full lg:w-2/3 space-y-6">
          {/* Add New Book Widget */}
          <Card className="bg-card/20">
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
            <CardFooter>
              <Link href="/dashboard/books/new" className="w-full">
                <Button className="w-full">
                  Create new book
                </Button>
              </Link>
            </CardFooter>
          </Card>

          {/* Help Section */}
          <DashboardHelp />
        </div>

        {/* Sidebar - 1/3 width */}
        <div className="w-full lg:w-1/3 space-y-6">
          <CreditWidget />
        </div>
      </div>
    </div>
  );
}
