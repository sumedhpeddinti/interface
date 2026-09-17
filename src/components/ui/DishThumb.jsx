import { useState } from 'react'
import { CakeSlice, Coffee, Flame, Salad, Soup, Star, UtensilsCrossed } from 'lucide-react'
import { classNames, initials } from '../../lib/format'

/* A dish photo when the menu item has a URL, otherwise a monochrome
   category tile — flat zinc, hairline border, no gradients. */

const GLYPHS = {
  'Top Picks': Star,
  'Main Course': UtensilsCrossed,
  Soups: Soup,
  'Starters - Veg': Salad,
  'Starters - Non-Veg': Flame,
  Beverages: Coffee,
  Desserts: CakeSlice,
}

export function DishThumb({ item, size = 64, className, rounded = 'rounded-md' }) {
  const [failed, setFailed] = useState(false)
  const Glyph = GLYPHS[item?.category] || UtensilsCrossed
  const src = item?.image
  const showImage = Boolean(src) && !failed

  return (
    <div
      className={classNames(
        'relative flex shrink-0 items-center justify-center overflow-hidden border border-zinc-200 bg-zinc-100',
        rounded,
        className,
      )}
      style={{ width: size, height: size }}
    >
      {showImage ? (
        <img
          src={src}
          alt={item?.name || 'Dish'}
          loading="lazy"
          onError={() => setFailed(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <>
          <Glyph size={Math.round(size * 0.4)} strokeWidth={1.2} className="text-zinc-400" />
          <span
            className="absolute bottom-1 right-1 text-[9px] font-semibold uppercase tracking-wider text-zinc-400"
            aria-hidden="true"
          >
            {initials(item?.name || '')}
          </span>
        </>
      )}
    </div>
  )
}
