"use client";

import { CreditWidget } from "@/components/credits/credit-widget";
import DashboardPricing from "@/components/DashboardPricing";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, HelpCircle } from "lucide-react";
import UserGuide from "@/components/guide";

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

          {/* Guide Widget */}
          <Card className="bg-card/20">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg">
                  <HelpCircle className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="text-lg">Getting Started Guide</CardTitle>
              </div>
              <CardDescription>
                Learn how to create and publish your book with our step-by-step guide.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <UserGuide />
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - 1/3 width */}
        <div className="w-full lg:w-1/3 space-y-6">
          <CreditWidget />
          <DashboardPricing subscriptionDetails={{ hasSubscription: false }} />
        </div>
      </div>
    </div>
  );
}
