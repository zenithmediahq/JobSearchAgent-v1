import { NextRequest, NextResponse } from 'next/server'
import mammoth from 'mammoth'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData()
        const file = formData.get('file')

        if (!(file instanceof File)) {
            return NextResponse.json(
                { error: 'No file uploaded' },
                { status: 400 }
            )
        }

        const fileName = file.name.toLowerCase()
        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)

        if (fileName.endsWith('.txt') || file.type === 'text/plain') {
            const text = buffer.toString('utf-8')

            return NextResponse.json({
                text,
                type: 'txt',
            })
        }

        if (
            fileName.endsWith('.docx') ||
            file.type ===
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ) {
            const result = await mammoth.extractRawText({ buffer })

            return NextResponse.json({
                text: result.value,
                type: 'docx',
            })
        }

        if (fileName.endsWith('.pdf') || file.type === 'application/pdf') {
            const { PDFParse } = await import('pdf-parse')
            const parser = new PDFParse({ data: buffer })

            try {
                const result = await parser.getText()
                const text =
                    result.text
                        ?.replace(/\n?\s*--\s+\d+\s+of\s+\d+\s+--\s*/gi, '\n')
                        .trim() ?? ''

                if (!text) {
                    return NextResponse.json(
                        {
                            error:
                                'This PDF does not contain readable text. Please upload DOCX/TXT or paste your CV.',
                        },
                        { status: 400 }
                    )
                }

                return NextResponse.json({
                    text,
                    type: 'pdf',
                })
            } finally {
                await parser.destroy()
            }
        }

        return NextResponse.json(
            { error: 'Unsupported file type. Use TXT, DOCX, or PDF.' },
            { status: 400 }
        )
    } catch (error) {
        console.error('[CV Parse] Error:', error)

        return NextResponse.json(
            { error: 'Failed to parse CV file.' },
            { status: 500 }
        )
    }
}
