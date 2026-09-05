import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { useT } from '@/i18n'
import { Button, Icon, icons } from '@/ui'

export function joinUrl(code: string): string {
  return `${location.origin}${import.meta.env.BASE_URL}j/${code}`
}

export function JoinCode({ code, compact = false }: { code: string; compact?: boolean }) {
  const { t } = useT()
  const [qr, setQr] = useState<string>('')
  const [copied, setCopied] = useState(false)
  const url = joinUrl(code)

  useEffect(() => {
    if (compact) return
    QRCode.toDataURL(url, { margin: 0, width: 128, color: { dark: '#1e1e24', light: '#ffffff' } }).then(setQr).catch(() => setQr(''))
  }, [url, compact])

  async function copy() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="flex items-center gap-3">
      {!compact && qr && <img src={qr} alt={t('room.qrAlt')} className="h-16 w-16 shrink-0 rounded-sm bg-surface p-1" />}
      <div className="flex flex-col gap-1">
        <span className="text-[13px] text-muted">{t('room.linkForTeam')}</span>
        <div className="flex items-center gap-2">
          <span className="rounded-sm bg-surface-raised px-2.5 py-1 font-semibold tracking-wider" data-testid="join-code">
            {code}
          </span>
          <Button variant="secondary" size="sm" onClick={copy}>
            <Icon d={copied ? icons.check : icons.copy} size={16} />
            {copied ? t('room.copied') : t('room.copyLink')}
          </Button>
        </div>
      </div>
    </div>
  )
}
