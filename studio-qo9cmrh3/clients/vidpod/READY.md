# VIDPOD demo client: Tommy, ready to wire in

Built 7 Nov 2026. Default demo footage for the generic VIDPOD board: Tommy seated, talking to camera, from his film The Jackett Ranch. Nothing in the source footage, the Brain or any other style-board file was changed.

## Source
- Clip: `A_0014C998A261010_1757501B_CANON.MXF` (the 10 Oct 2026 sit-down, A cam front on, Canon C200 4K 25 fps, Canon Log 3, beige curtain, soft light). Folder: `Desktop/TOMMY JACKETT VIDEO CONTENT/2023/USA Trip 2023/CAPTURE/USA Property Pt 3_2026/Footage/Tommy sit down interview_scene/`.
- Used: 1:42.5 to 1:58.5 of the clip (16.0 s, one take, no cuts). He is answering Dan's off-camera question about the 7-Eleven coffee story.
- Grade: Canon C-Log3 to Rec.709 LUT (Resolve's C200 LUT), nothing else.
- Crop: 1215x2160 from x 1312 of the 3840x2160 frame (full height), scaled down to 1080x1920, so it is sharp. Head and chest, face in the upper third.
- Sound: channel 1 (his mic), loudness normalised to -15 LUFS, AAC 160k stereo.

## The line
"I've been down quite a few rabbit holes. I was fishing oBikes out of the Yarra River. I was trying to uncover one of the biggest scams in Australian coffee history at 7-Eleven. I've done a Domino's deep dive."

There is no name or intro moment anywhere in the logged footage (checked every transcript), so the name card carries "Tommy Jackett, Founder, VIDPOD" on its own. The proud line is the whole list of past investigations.

## Files (all in `clients/vidpod/`)
| Path | What it is |
|---|---|
| `media/base.mp4` | Base clip, 1080x1920, 25 fps, H.264 High, 3.3 Mbps, AAC, faststart, 16.0 s, 6.95 MB |
| `media/base.jpg` | First frame |
| `media/words.json` | Word timings (`words`, list of `{t, end, text}`, 39 words, seconds on the base clip, from AssemblyAI on the cut clip), plus `phrases`, `emphasis`, `hook_text`, `hook_label`, `name`, `role`, `name_at`, `cuts`, `protect_case`, `proper`, `depth`, `face`, `card_frames`, `card_cutout`, and suggestions (`moves_suggested`, `words_extra_suggested`). Keys match `board.json` `base` |
| `media/depth.mp4` | Person matte clip for the full 0 to 16.0 s: colour on top, Apple Vision matte below, 720x1280 each (720x2560, 400 frames). Same method as `alisha-depth.mp4`: frames at 540x960, `mask` per frame, matte blurred 1.2 px |
| `media/cards/f_1_0.jpg`, `f_3_0.jpg`, `f_6_0.jpg`, `f_9_0.jpg`, `f_12_0.jpg`, `f_15_0.jpg` | 270x480 stills at 1, 3, 6, 9, 12 and 15 s for the mini cards |
| `media/cards/cutout_9_0.png` | 270x480 RGBA person cut-out at 9.0 s (looking straight down the lens) |

## Words (index, start, text)
0 0.176 I've / 1 0.273 been / 2 0.514 down / 3 0.916 quite / 4 1.157 a / 5 1.222 few / 6 1.398 rabbit / 7 1.704 holes. / 8 2.669 I / 9 3.409 was / 10 3.553 fishing / 11 3.955 oBikes / 12 4.438 out / 13 4.550 of / 14 4.598 the / 15 4.679 Yarra / 16 4.936 River. / 17 5.805 I / 18 6.528 was / 19 6.946 trying / 20 7.284 to / 21 7.413 uncover / 22 8.458 one / 23 8.570 of / 24 8.635 the / 25 8.795 biggest / 26 9.037 scams / 27 9.616 in / 28 9.696 Australian / 29 11.047 coffee / 30 11.433 history / 31 11.931 at / 32 12.076 7-Eleven. / 33 13.443 I've / 34 13.861 done / 35 14.086 a / 36 14.279 Domino's / 37 14.906 deep / 38 15.147 dive. (ends 15.646)

- Phrases (start indices): 0, 3, 8, 12, 17, 22, 27, 31, 33, 37
- Emphasis: 6 rabbit, 7 holes, 11 oBikes, 15 Yarra, 26 scams, 32 7-Eleven, 36 Domino's, 37 deep
- Hook: `I've been down quite a few\n*rabbit holes*`
- Name: Tommy Jackett. Role: Founder, VIDPOD. Suggested `name_at` 2.7 (the pause after "rabbit holes").
- Cuts: none.
- Suggested move word: SCAMS at 9.04 (he is facing the lens there), small line "7-Eleven" at 12.08.

## Face position (1080x1920 frame)
- Focus ring and word-behind-head: **x 547, y 490, r 380** (head centre and a ring that clears hair and chin).
- Measured from the person matte across the clip: head centre x moves 490 to 613 (he leans and turns a little in the first 3 s and around 6 s), hair top y 105 to 154, chin about y 830.
- Word-behind-head: a centre y of about 400 sits behind the top of his head with the face clear.
- Note: his hair sits close to the top of frame (about y 110), so a word behind the head has less room above it than on Alisha's clip.

## Clips
Added 7 Nov 2026: three more takes of Tommy for a look picker, so subtitles and titles can be seen on different backgrounds. The seated clip above stays the default. Each clip is one continuous take, 1080x1920, 25 fps, H.264 High, AAC 160k stereo at -15 LUFS, faststart, under 7 MB, and has the same file set as the default: `base.mp4`, `base.jpg` (first frame), `words.json` (same shape as `media/words.json`, plus a `label` key; paths inside are relative to `clients/vidpod/`), `depth.mp4` (720x2560, colour over Apple Vision person matte, matte blurred 1.2 px, same method as `media/depth.mp4`), `cards/f_*.jpg` (270x480 stills) and one `cards/cutout_*.png` (270x480 RGBA). Words are from AssemblyAI on each cut clip. No grade was needed (the DJI footage is standard Rec.709). Source footage, the Brain and every other style-board file were left untouched.

| Slug (in `media/clips/`) | Picker label | Look | The line | Duration | Face (x, y, r on 1080x1920) |
|---|---|---|---|---|---|
| `seated` (the default, `media/`) | Seated | Beige curtain, soft indoor light, mid shot | "I've been down quite a few rabbit holes..." | 16.0 s | 547, 490, 380 |
| `rooftop-walk` | Rooftop walk | Rooftop, city skyline, morning sun. Empty frame, he pops up from behind a wall at 0.3 s, steps over and walks at the lens talking, camera backing off; wide to mid shot. Leaves frame left in the last 0.4 s | "If you're new here, back in the '70s my dad bought a block of land for $5,000 in Colorado, USA, and now we're giving it away for free." | 10.52 s | null (he moves too much; settled 4.5 to 9.0 s at about x 500, y 860, see `face_note`) |
| `rooftop-mic` | Mic in hand | Rooftop by a grey building, hard blue sky, seated with a handheld mic; camera arcs in over the first 2 s, then a steady mid shot | "Here's the thing about when you're giving something away for free. Initially you think it's got no value, and then when lots of people want it, you start thinking, maybe we should be charging for this." | 10.8 s | 536, 605, 280 (from 2.0 s) |
| `selfie-walk` | Selfie walk | Handheld selfie close-up walking from a timber lobby out into the sun (8 Oct 2026, white tee). Upscaled 1.27x, a touch softer; face drifts with the hand | "Alright, I'm here to see my accountant so that I can ask him if there's any tax implications for my dad if we give this property away." | 10.2 s | 535, 690, 500 (drifts x 420 to 750) |

Sources (all from The Jackett Ranch footage, `Desktop/TOMMY JACKETT VIDEO CONTENT/2023/USA Trip 2023/CAPTURE/USA Property Pt 3_2026/Footage/`):
- `rooftop-walk`: `Rooftop PTC_15102026/DJI_20261015084808_0226_D.MP4`, 0.8 to 11.32 s. This is the "pop up and walk while talking" rooftop moment. Take 0225 has a similar pop-up and walk-in on the same line; 0226 is the cleanest.
- `rooftop-mic`: `Rooftop PTC_15102026/DJI_20261015085349_0232_D.MP4`, 0.0 to 10.8 s.
- `selfie-walk`: `Meeting with accountant_scene/DJI_20261007214552_0007_D_G04.MP4`, 26.8 to 37.0 s.

Crop: a vertical window that follows his face (Vision face track, smoothed 0.5 s, 1.0 s on the selfie), full source height. All three mattes are clean (person matte is per frame, so the moving camera does not hurt it); one note: on `rooftop-walk` frame 0 the matte picks up the cushion on the wall for a moment, and the last 0.4 s has no person in it.

Suggested in each `words.json`: phrases, emphasis, hook (`rooftop-walk` "Now we're giving it away *for free*", `rooftop-mic` "Maybe we should be *charging for this*", `selfie-walk` "I'm here to see *my accountant*"), `name_at` (2.0, 2.4, 3.0, each in a pause), `moves_suggested` and `words_extra_suggested`. No place card on `rooftop-mic` or `selfie-walk` (the city is not on file).
