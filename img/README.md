# Image slots — where to drop your files

Every image on the site has a dedicated filename. Replace the placeholder file with your real image **using the exact same filename** and the site updates on the next push.

## How it works

1. Pick the slot below you want to fill
2. Export your image with the exact filename (e.g. `barefoot.jpg`)
3. Drop it into the correct folder, overwriting the placeholder
4. Commit + push — site rebuilds in ~30 seconds

Sizes listed are **recommended** — any aspect ratio works, but these look best on the current layout.

---

## Hero (top of page)

| Slot | File | Recommended size | Notes |
|------|------|------------------|-------|
| Hero background | `img/hero.jpg` | 2400 × 1400 | Optional. If you drop one here, we'll turn on a subtle background image behind the hero text. |

## Selected work grid (6 hero projects)

All work images should be **landscape**, ideally around 1600 × 1000. JPG preferred for photos, PNG for graphics.

| # | Project | File path | Intended vibe |
|---|---------|-----------|---------------|
| 1 | Barefoot | `img/work/barefoot.jpg` | Visual hero — beautiful frame |
| 2 | Help at Hand | `img/work/help-at-hand.jpg` | High production value still |
| 3 | Pilates | `img/work/pilates.jpg` | Ongoing partner, premium feel |
| 4 | Monash · LTT | `img/work/monash-ltt.jpg` | Educational, Monash brand |
| 5 | The Numbers Game | `img/work/tng.jpg` | Podcast studio / hosts on set |
| 6 | Brava | `img/work/brava.jpg` | Brand film still |

---

## Naming rules

- Lowercase only
- Hyphens not underscores (`help-at-hand.jpg`, not `Help_At_Hand.jpg`)
- Keep the extension matching what's in the HTML (currently `.jpg` for all)
- If you want a different extension (e.g. `.png`), tell Claude and the HTML will be updated

## Optimisation (nice to have, not required)

GitHub Pages serves whatever you commit. For best loading speed:
- JPG: 70–85% quality, max ~300 KB each
- Strip metadata (EXIF) from phone shots
- 1600 px wide is plenty — anything larger is wasted

Claude can run optimisation if you drop big originals in — just say the word.
