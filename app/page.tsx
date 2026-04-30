import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Briefcase, Search, FileText, Sparkles, ArrowRight } from 'lucide-react'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Briefcase className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-lg font-semibold">JobMatch</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild>
              <Link href="/auth/login">Sign In</Link>
            </Button>
            <Button asChild>
              <Link href="/auth/sign-up">Get Started</Link>
            </Button>
          </div>
        </div>
      </header>

      <main>
        <section className="px-4 py-24 text-center">
          <div className="mx-auto max-w-3xl">
            <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Find Your Perfect Job Match with AI
            </h1>
            <p className="mt-6 text-pretty text-lg text-muted-foreground">
              Upload your CV, search for jobs, and let AI analyze how well you match each opportunity. 
              Get personalized tips to improve your applications and land your dream job.
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <Button size="lg" asChild>
                <Link href="/auth/sign-up">
                  Start Free <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/auth/login">Sign In</Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="border-t border-border bg-muted/50 px-4 py-24">
          <div className="mx-auto max-w-5xl">
            <h2 className="text-center text-2xl font-bold sm:text-3xl">
              Everything You Need for Your Job Search
            </h2>
            <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-xl border border-border bg-card p-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Search className="h-5 w-5 text-primary" />
                </div>
                <h3 className="mt-4 font-semibold">Smart Job Search</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Search thousands of jobs from multiple sources. Filter by title, location, and job type.
                </p>
              </div>
              <div className="rounded-xl border border-border bg-card p-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
                <h3 className="mt-4 font-semibold">AI Match Analysis</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Get instant AI-powered analysis of how well your CV matches each job posting.
                </p>
              </div>
              <div className="rounded-xl border border-border bg-card p-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <h3 className="mt-4 font-semibold">Application Tracker</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Track all your applications in one place. Move jobs through your pipeline from saved to offer.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border px-4 py-8">
        <div className="mx-auto max-w-7xl text-center text-sm text-muted-foreground">
          Built with AI to help you find your dream job.
        </div>
      </footer>
    </div>
  )
}
