# Third-party notices

The motion layer (`src/app/motion.css`, `src/components/shell/Interact.tsx`, `src/lib/celebrate.ts`) re-implements, mostly in plain CSS, effects whose design and parameters were taken from these open-source component libraries:

| Library | Components used as reference | License |
|---|---|---|
| [Magic UI](https://github.com/magicuidesign/magicui) | Magic Card, Border Beam, Dot Pattern, Blur Fade, Confetti | MIT, Copyright (c) Magic UI |
| [Motion Primitives](https://github.com/ibelick/motion-primitives) | Animated Background, Text Effect, Text Shimmer | MIT, Copyright (c) 2024 ibelick |
| [canvas-confetti](https://github.com/catdad/canvas-confetti) | used as a dependency, loaded on demand | ISC, Copyright (c) 2020 Kiril Vatev |

Artwork and icons (ready-made, instead of hand-drawn SVG; generated or copied by `scripts/build_art.mjs`):

| Source | Used for | License |
|---|---|---|
| [Open Peeps](https://www.openpeeps.com/) by Pablo Stanley, via [DiceBear](https://www.dicebear.com/styles/open-peeps/) | 股吧老哥 (`public/art/laoge*.svg`) | Design CC0 1.0; DiceBear code MIT |
| [Microsoft Fluent Emoji](https://github.com/microsoft/fluentui-emoji), 「Color」 style, via the `fluentui-emoji` package | persona emoji, question mark, fire, headphone (`public/art/emoji/`) | MIT, Copyright (c) Microsoft Corporation |
| [Lucide](https://lucide.dev/) (`lucide-react`) | UI icons: sound, close, back, chevron, play/pause, check, warning, star, music | ISC, Copyright (c) Lucide Contributors |

MIT License text (applies to Magic UI, Motion Primitives, DiceBear and Fluent Emoji):

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
