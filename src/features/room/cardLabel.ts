import type { Card } from '@/domain/scale'
import { useT } from '@/i18n'

export function useCardLabel() {
  const { t } = useT()
  return (c: Card | null): string => (c === null ? t('card.none') : c === 'coffee' ? t('card.coffee') : c === '?' ? t('card.unknown') : c)
}
