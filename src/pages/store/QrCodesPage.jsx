import { useEffect, useMemo, useState } from 'react'
import { Check, Copy, Link2, QrCode, ScanLine, Tag } from 'lucide-react'
import { useStore } from '../../context/StoreContext'
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  Field,
  Input,
  InlineNote,
  Select,
  Tabs,
} from '../../components/ui'
import { KPIGrid, PageHeader } from '../../components/store/PageParts'
import { QrCard, QRCodeSheet } from '../../components/store/QRCodeSheet'
import { PROMO_CODES, QR_TYPES, buildQrUrl, copyToClipboard, downloadFile, makeQrSvg, printPage, securityHashFor, slugify } from '../../lib/qr'
import { money } from '../../lib/format'
import { COUPONS } from '../../lib/pricing'

const CARDS_PER_SHEET = 6

function useQrMap(requests) {
  const [map, setMap] = useState({})
  const key = JSON.stringify(requests)
  useEffect(() => {
    let cancelled = false
    async function run() {
      const entries = await Promise.all(
        requests.map(async (request) => [
          request.id,
          await makeQrSvg(request.url, { width: 260, dark: '#18181b' }),
        ]),
      )
      if (!cancelled) setMap(Object.fromEntries(entries))
    }
    run()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  return map
}

export default function QrCodesPage() {
  const { state } = useStore()
  const [type, setType] = useState('table')
  const [promoCode, setPromoCode] = useState('WELCOME20')
  const [customUrl, setCustomUrl] = useState('')
  const [sheet, setSheet] = useState(0)
  const [copied, setCopied] = useState(false)

  const tableCards = useMemo(
    () =>
      state.tables.map((table) => {
        const url = buildQrUrl('table', { tableId: table.id })
        return {
          id: table.id,
          label: table.id,
          subtitle: `${table.section} · ${table.seats} seats`,
          action: 'Scan to browse the menu',
          url,
          hash: securityHashFor(url),
          status: table.reserved ? 'Held' : 'Active',
          statusTone: table.reserved ? 'indigo' : 'emerald',
        }
      }),
    [state.tables],
  )

  const singleCard = useMemo(() => {
    if (type === 'promo') {
      const url = buildQrUrl('promo', { code: promoCode })
      return [
        {
          id: 'promo',
          label: promoCode,
          subtitle: COUPONS[promoCode]?.label || 'Promotional voucher',
          action: 'Scan to claim the offer',
          url,
          hash: securityHashFor(url),
          status: 'Live',
          statusTone: 'amber',
        },
      ]
    }
    if (type === 'feedback') {
      const url = buildQrUrl('feedback')
      return [
        {
          id: 'feedback',
          label: 'Feedback',
          subtitle: 'Guest review sheet',
          action: 'Scan to rate your visit',
          url,
          hash: securityHashFor(url),
          status: 'Live',
          statusTone: 'emerald',
        },
      ]
    }
    const url = buildQrUrl('custom', { customUrl: customUrl || 'https://ganeshcafe.in' })
    return [
      {
        id: 'custom',
        label: 'Custom',
        subtitle: 'Custom destination',
        action: 'Scan to open the link',
        url,
        hash: securityHashFor(url),
        status: customUrl ? 'Live' : 'Draft',
        statusTone: customUrl ? 'emerald' : 'zinc',
      },
    ]
  }, [type, promoCode, customUrl])

  const allCards = type === 'table' ? tableCards : singleCard
  const qrMap = useQrMap(allCards)
  const withSvg = allCards.map((card) => ({ ...card, svg: qrMap[card.id] || '' }))

  const sheetCount = Math.max(1, Math.ceil(withSvg.length / CARDS_PER_SHEET))
  const sheetCards = withSvg.slice(sheet * CARDS_PER_SHEET, sheet * CARDS_PER_SHEET + CARDS_PER_SHEET)

  useEffect(() => {
    setSheet(0)
  }, [type, promoCode, customUrl])

  const slug = slugify(
    type === 'table' ? 'table-menu' : type === 'promo' ? `promo-${promoCode}` : type,
  )

  async function copyUrl(url) {
    const ok = await copyToClipboard(url)
    if (ok) {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="QR code studio"
        description="Generate scannable codes for every table, promotion and feedback sheet. Codes are drawn locally as SVG, so they print razor sharp and never expire."
        badge={
          <Badge tone="zinc" size="md" mono>
            {tableCards.length} table codes
          </Badge>
        }
        actions={
          <Button size="sm" variant="primary" onClick={printPage}>
            <ScanLine size={13} strokeWidth={1.9} />
            Print sheet
          </Button>
        }
      />

      <KPIGrid
        columns={4}
        items={[
          { label: 'Table codes', value: tableCards.length, hint: 'one per table, T1–T12', icon: QrCode, tone: 'zinc' },
          { label: 'Cards per A4 sheet', value: CARDS_PER_SHEET, hint: `${sheetCount} sheet(s) needed`, icon: ScanLine, tone: 'indigo' },
          { label: 'Promo vouchers', value: PROMO_CODES.length, hint: 'discount destinations', icon: Tag, tone: 'amber' },
          {
            label: 'Best voucher',
            value: COUPONS.WELCOME20.code,
            hint: '20% off up to ₹150',
            icon: Tag,
            tone: 'emerald',
            mono: true,
          },
        ]}
      />

      <Card>
        <CardHeader
          icon={QrCode}
          title="QR type"
          subtitle="Pick what a scan should do, then print or download the artwork."
        />
        <CardBody className="space-y-4">
          <Tabs
            value={type}
            onChange={setType}
            tabs={QR_TYPES.map((entry) => ({ id: entry.id, label: entry.label }))}
          />

          <p className="text-[11px] text-zinc-500">
            {QR_TYPES.find((entry) => entry.id === type)?.description} ·{' '}
            <span className="tnum">{QR_TYPES.find((entry) => entry.id === type)?.hint}</span>
          </p>

          {type === 'promo' ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Field label="Voucher code" hint="Attached to every scan from this card.">
                <Select value={promoCode} onChange={(event) => setPromoCode(event.target.value)}>
                  {PROMO_CODES.map((code) => (
                    <option key={code} value={code}>
                      {code} — {COUPONS[code]?.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Destination preview" className="sm:col-span-2">
                <div className="flex items-center gap-2">
                  <Input readOnly value={singleCard[0].url} />
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => copyUrl(singleCard[0].url)}
                  >
                    {copied ? <Check size={13} strokeWidth={2.4} /> : <Copy size={13} strokeWidth={1.9} />}
                    {copied ? 'Copied' : 'Copy'}
                  </Button>
                </div>
              </Field>
            </div>
          ) : null}

          {type === 'custom' ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Field label="Custom URL" className="sm:col-span-2" hint="Any link — a review page, a delivery app, a survey.">
                <Input
                  value={customUrl}
                  onChange={(event) => setCustomUrl(event.target.value)}
                  placeholder="https://ganeshcafe.in/book-a-table"
                />
              </Field>
              <Field label="Encoded length" hint="Keep it short so the code stays dense-free.">
                <Input readOnly value={`${singleCard[0].url.length} characters`} />
              </Field>
            </div>
          ) : null}

          {type === 'table' ? (
            <InlineNote tone="zinc" icon={Link2}>
              Each table card encodes <span className="tnum">/?table=T[n]</span>, so the guest lands
              on the menu already locked to that table with no sign-up.
            </InlineNote>
          ) : null}
        </CardBody>
      </Card>

      {type === 'table' ? (
        <Card className="overflow-hidden">
          <QRCodeSheet
            cards={sheetCards}
            title="Table menu QR cards"
            tagline={state.restaurant?.tagline}
            sheetNumber={sheet}
            sheetCount={sheetCount}
            onSheetChange={setSheet}
            onPrint={printPage}
            onDownloadCard={(card) =>
              downloadFile(`ganesh-cafe-${slug}-${card.label}.svg`, card.svg)
            }
            onDownloadAll={() =>
              withSvg.forEach((card, index) =>
                window.setTimeout(
                  () => downloadFile(`ganesh-cafe-${slug}-${card.label}.svg`, card.svg),
                  index * 220,
                ),
              )
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">
          <Card>
            <CardHeader size="sm" title="Preview" subtitle="Print size scales cleanly." />
            <CardBody className="flex justify-center">
              <div className="w-full max-w-[260px]">
                <QrCard
                  card={singleCard[0]}
                  className="w-full"
                  tagline={state.restaurant?.tagline}
                />
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              icon={Link2}
              title="Destination"
              subtitle="What the guest sees the moment the camera app opens the link."
            />
            <CardBody className="space-y-3">
              <div className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                  Encoded URL
                </p>
                <p className="tnum mt-1 break-all text-xs text-zinc-900">{singleCard[0].url}</p>
                <div className="mt-2 flex items-center gap-2">
                  <Badge tone="zinc" size="sm" mono>
                    {singleCard[0].hash}
                  </Badge>
                  <Badge tone={singleCard[0].statusTone} size="sm" dot>
                    {singleCard[0].status}
                  </Badge>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="secondary" onClick={() => copyUrl(singleCard[0].url)}>
                  {copied ? <Check size={13} strokeWidth={2.4} /> : <Copy size={13} strokeWidth={1.9} />}
                  {copied ? 'Copied to clipboard' : 'Copy URL'}
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => downloadFile(`ganesh-cafe-${slug}.svg`, singleCard[0].svg)}
                >
                  Download SVG
                </Button>
                <Button size="sm" variant="primary" onClick={printPage}>
                  Print card
                </Button>
              </div>

              {type === 'promo' ? (
                <InlineNote tone="amber" icon={Tag}>
                  Guests scanning this card land on the menu with{' '}
                  <span className="tnum font-semibold">{promoCode}</span> pre-attached —{' '}
                  {COUPONS[promoCode]?.label}. Worth up to{' '}
                  {money(COUPONS[promoCode]?.max || COUPONS[promoCode]?.value || 0)} off a bill.
                </InlineNote>
              ) : null}
            </CardBody>
          </Card>
        </div>
      )}
    </div>
  )
}
