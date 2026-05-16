'use client'

import { useState, useEffect } from 'react'
import { Job } from '@/lib/types'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Loader2, AlertCircle, FileText, Copy, Check } from 'lucide-react'

interface ApplicationPackModalProps {
    job: Job | null
    open: boolean
    onOpenChange: (open: boolean) => void
}

interface ApplicationPackResult {
    motivation: string
    coverLetter: string
    cvBullets: string[]
    keywords: string[]
    avoidClaims: string[]
}

export function ApplicationPackModal({ job, open, onOpenChange }: ApplicationPackModalProps) {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [result, setResult] = useState<ApplicationPackResult | null>(null)
    const [hasCV, setHasCV] = useState<boolean | null>(null)
    const [copied, setCopied] = useState<string | null>(null)

    useEffect(() => {
        if (open && job) {
            generatePack()
        } else {
            setResult(null)
            setError(null)
            setHasCV(null)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, job?.id])


    const generatePack = async () => {
        setLoading(true)
        setError(null)
        setResult(null)
        setHasCV(null)

        try {
            const res = await fetch('/api/application-pack', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    job: {
                        title: job?.title,
                        company: job?.company,
                        location: job?.location,
                        description: job?.summary,
                    },
                }),
            })

            if (res.status === 400) {
                const data = await res.json()
                // No CV case — show the "go to profile" state
                if (data.error?.includes('No CV')) {
                    setHasCV(false)
                    return
                }
                throw new Error(data.error)
            }

            if (!res.ok) {
                const data = await res.json()
                throw new Error(data?.error ?? 'Failed to generate application pack')
            }

            setHasCV(true)
            const data = await res.json()
            setResult(data)
        } catch (err: any) {
            setError(err?.message ?? 'Failed to generate application pack')
        } finally {
            setLoading(false)
        }
    }

    const handleCopy = async (text: string, key: string) => {
        await navigator.clipboard.writeText(text)
        setCopied(key)
        setTimeout(() => setCopied(null), 2000)
    }



    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Application Pack</DialogTitle>
                    <DialogDescription>
                        {job?.title} at {job?.company}
                    </DialogDescription>
                </DialogHeader>

                {loading && (
                    <div className="flex flex-col items-center justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <p className="mt-4 text-sm text-muted-foreground">Generating application pack...</p>
                    </div>
                )}

                {!loading && hasCV === false && (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                        <FileText className="h-12 w-12 text-muted-foreground" />
                        <h3 className="mt-4 font-medium">No CV Found</h3>
                        <p className="mt-2 text-sm text-muted-foreground">
                            Add your CV in the Profile section to generate an application pack.
                        </p>
                        <Button className="mt-4" onClick={() => onOpenChange(false)} asChild>
                            <a href="/dashboard/profile">Go to Profile</a>
                        </Button>
                    </div>
                )}

                {!loading && error && (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                        <AlertCircle className="h-8 w-8 text-destructive" />
                        <p className="mt-2 text-sm text-destructive">{error}</p>
                        <Button variant="outline" className="mt-4" onClick={generatePack}>
                            Try Again
                        </Button>
                    </div>
                )}

                {!loading && !error && result && (
                    <div className="space-y-6">
                        <section>
                            <div className="flex items-center justify-between mb-2">
                                <h4 className="text-sm font-medium">Motivation</h4>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 gap-1.5 text-xs"
                                    onClick={() => handleCopy(result.motivation, 'motivation')}
                                >
                                    {copied === 'motivation' ? (
                                        <>
                                            <Check className="h-3.5 w-3.5 text-emerald-500" />
                                            <span className="text-emerald-500">Copied</span>
                                        </>
                                    ) : (
                                        <>
                                            <Copy className="h-3.5 w-3.5" />
                                            Copy
                                        </>
                                    )}
                                </Button>
                            </div>
                            <div className="rounded-md bg-muted p-3 text-sm leading-relaxed">
                                {result.motivation}
                            </div>
                        </section>

                        <section>
                            <div className="flex items-center justify-between mb-2">
                                <h4 className="text-sm font-medium">Cover Letter</h4>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 gap-1.5 text-xs"
                                    onClick={() => handleCopy(result.coverLetter, 'coverLetter')}
                                >
                                    {copied === 'coverLetter' ? (
                                        <>
                                            <Check className="h-3.5 w-3.5 text-emerald-500" />
                                            <span className="text-emerald-500">Copied</span>
                                        </>
                                    ) : (
                                        <>
                                            <Copy className="h-3.5 w-3.5" />
                                            Copy
                                        </>
                                    )}
                                </Button>
                            </div>
                            <div className="rounded-md bg-muted p-3 text-sm leading-relaxed whitespace-pre-wrap">
                                {result.coverLetter}
                            </div>
                        </section>

                        <section>
                            <h4 className="text-sm font-medium mb-2">CV Bullet Suggestions</h4>
                            <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                                {result.cvBullets.map((b, i) => (
                                    <li key={i}>{b}</li>
                                ))}
                            </ul>
                        </section>

                        <section>
                            <h4 className="text-sm font-medium mb-2">Keywords to Include</h4>
                            <div className="flex flex-wrap gap-2">
                                {result.keywords.map((k, i) => (
                                    <span
                                        key={i}
                                        className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground"
                                    >
                                        {k}
                                    </span>
                                ))}
                            </div>
                        </section>

                        <section>
                            <h4 className="text-sm font-medium mb-2 text-amber-600">Avoid Overclaiming</h4>
                            <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                                {result.avoidClaims.map((ac, i) => (
                                    <li key={i}>{ac}</li>
                                ))}
                            </ul>
                        </section>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}
