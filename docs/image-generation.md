# 当前图片与生成提示词

当前页面使用内置 imagegen 生成的 13 张猫咪图集，每张包含同一只猫的背面、正面和独立的尾巴。所有图集按透明边界裁切并转为 WebP。

成品在 `public/assets/photoreal`。其中 `window-seat.webp` 是窗边背景，`hand-sage.webp` 是手掌。每只猫的子目录包含 `back.webp`、`belly.webp`、`tail.webp` 和从该猫背部裁出的 `swatch.webp`。

## 背景

```text
Use case photorealistic-natural. Generate an original wide landscape still photo for an interactive cat resting scene, entirely empty of animals, humans and hands. Camera directly overhead at exactly 90 degrees, centered over a soft oatmeal cream sherpa / bouclé cushion on a deep window bench. The plush irregular looped textile is visible in crisp natural detail, with enough gentle neutral texture to show black and white cats clearly. In only the far upper right corner, a small fold of muted sage green washed cotton throw, hem visible. At the far left edge a slim glimpse of warm oak bench trim. Soft afternoon daylight and broad shadow from a window, creamy warm white and moss-sage palette, low contrast in the center, quiet tactile inviting cat favorite place. One large continuous empty cushion occupies 92 percent of the view, no objects in the center. Editorial interior photography, natural daylight with realistic soft falloff, no text no borders no UI no logos. Composition landscape 2:1, cropped generously top and bottom.
```

## 手掌

```text
Use case photorealistic-natural. Actual transparent alpha with one isolated real adult right hand and forearm for a web cat petting interaction. Seen exactly overhead showing back of hand and nails, five natural fingers gently open and curved, angled upper-left, thumb toward the left, realistic warm light skin and short neutral natural nails. Forearm comes from lower-right and straightens downward as it reaches the bottom of frame. Wearing a long sleeve of muted sage green soft merino knit, visible fine subtle ribbing. Include the full fingertips and plenty of sleeve. Realistic editorial soft natural daylight from upper left, natural skin texture. No animal, no floor, no shadows outside cutout, no composition frame, no text, no borders. Single hand on a fully transparent background. Portrait layout.
```

## 猫咪图集

内置工具按下列模板生成，每只猫使用其对应的毛色与特征。

```text
Generate an ORIGINAL photorealistic domestic cat sprite atlas, actual TRANSPARENT alpha, portrait canvas 2:3, exactly three isolated horizontal bands, lots of clear empty space between bands. Use case photorealistic-natural, premium overhead cozy cat photograph, camera exactly overhead and soft daylight from upper left. The SAME cat with consistent fur markings and anatomy in both poses: {毛色与特征}. TOP BAND y=4%-38%: full cat BODY only, loaf / crouch with back up toward the overhead camera, anatomical small head on LEFT showing back of ears, shoulders then long body then smoothly rounded rump to the RIGHT, tucked legs, no tail visible (naturally fully tucked beneath body). SECOND BAND y=43%-76%: the same cat's entire body resting belly-up with visible face at LEFT and rump at RIGHT, eyes peacefully half closed, two curled front paws and two relaxed rear paws and visible belly, no tail visible (naturally hidden beneath body). BOTTOM BAND y=83%-96%: a single detached matching fur tail sprite laid perfectly STRAIGHT horizontal from left to right, wide rounded fluffy root on left and tapered rounded tip at right; it is only a fur asset for compositing, no wounds, no exposed anatomy. Both bodies retain horizontal aspect ratio approximately 2.15:1, all ears and paws inside each band's bounds. Three separable components ONLY. No background, no shadows outside silhouettes, no text, no frame, no room, no hand, no extra objects, no diagrams or vector art. Crisp real animal photography, soft direction of individual fur strands, believable asymmetric fur and natural silhouettes. Leave transparent gaps at y=40% and y=79% running all the way across the image for clean slicing.
```

- `kuro` sleek solid charcoal-black shorthair with subtle warm espresso highlights, golden olive eyes and smoke paw pads
- `mugi` orange mackerel shorthair with pumpkin-orange fur, dark ginger rings, cream chin and apricot belly
- `hana` calico shorthair with an asymmetric black mask over one eye, bold ginger and soot patches over ivory, and pink-dark mottled paw pads
- `shiro` pure ivory-white shorthair, pale pink nose, pink pads, light green eyes
- `saba` silver-black mackerel tabby shorthair, cool silver undercoat and crisp grey-black stripes, pale throat
- `hachi` black-and-white tuxedo shorthair with a black crown, white nose blaze, white bib, white socks and dark saddle
- `kiji` warm brown mackerel tabby shorthair with distinct black tiger stripes, taupe chin and green eyes
- `gray` plush solid blue-gray shorthair with dense slate-blue fur, darker nose and copper eyes
- `sabi` tortoiseshell shorthair with intimate mottled black, warm copper and cinnamon fur, no white markings
- `siam` light fawn colorpoint shorthair with a dark seal-brown pointed mask, dark ears paws and tail, blue eyes
- `ragdoll` cream semi-longhair with chocolate-point ears, soft white chest, fluffy darker tail, blue eyes
- `siberian` warm golden-brown forest longhair with wide chocolate stripes, soft golden tawny undercoat and bushy matching tail
- `norwegian` smoke silver forest longhair with long grey fur, white bib and white belly, silver ringed plume tail

## 尾巴握姿

项目文件 `public/assets/photoreal/hand-grip.webp`，使用同一只手掌和用户提供的手势截图作为参考，通过内置 imagegen 生成。

```text
Use case precise-object-edit, production website transparent sprite. Image 1 is the source hand and sleeve design. Image 2 is only a reference for a relaxed overhand gripping gesture. Generate a single actual transparent PNG showing the same right hand and identical muted sage rib knit sleeve as image 1, now in the relaxed grip pose of image 2, FOR AN INVISIBLE horizontal cat tail. Seen straight down, back of hand uppermost, four fingers bent into a loose, soft curl with knuckles visible and thumb resting at the left, palm largely hidden, not a clenched angry fist. The silhouette of the fist is fairly compact, narrower than the open fingers, entirely visible, positioned around x=42%, y=23% of frame. Keep wrist at x=54%, y=48%, and keep the sage sleeve falling diagonally from there toward lower-right and filling the bottom edge same as image 1. Match skin tone, brightness, sleeve cuff placement and proportion for a seamless transition. Photorealistic same person. No cat, no props, no text, no sleeve color change, no solid backdrop, actual transparent alpha around hand and sleeve. Portrait canvas 2:3.
```
