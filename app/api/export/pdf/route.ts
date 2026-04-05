import { NextRequest, NextResponse } from 'next/server';
import puppeteer from 'puppeteer';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const ticker = searchParams.get('ticker');
  const year = searchParams.get('year');
  const quarter = searchParams.get('quarter');

  if (!ticker || !year || !quarter) {
    return NextResponse.json(
      { error: 'Missing required params: ticker, year, quarter' },
      { status: 400 }
    );
  }

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();

    // Navigate to the print page
    const baseUrl = `http://localhost:${process.env.PORT || 3000}`;
    const printUrl = `${baseUrl}/print/${ticker}/${year}/${quarter}`;

    await page.goto(printUrl, { waitUntil: 'networkidle0', timeout: 120000 });

    // Wait for data-print-ready attribute
    await page.waitForSelector('[data-print-ready="true"]', { timeout: 120000 });
    // Extra buffer for chart rendering
    await new Promise((r) => setTimeout(r, 500));

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' },
    });

    await browser.close();

    const filename = `RTIP_${ticker}_${year}Q${quarter}.pdf`;

    return new NextResponse(Buffer.from(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (err: unknown) {
    if (browser) await browser.close();
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[export/pdf] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
