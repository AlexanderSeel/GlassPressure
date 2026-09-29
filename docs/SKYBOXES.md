# Skybox / Environment Assets

Glass Pressure supports one six-face cubemap environment per level.

## Runtime contract

A production cubemap should be stored as six square images with a shared base name:

```
<name>_px.jpg
<name>_nx.jpg
<name>_py.jpg
<name>_ny.jpg
<name>_pz.jpg
<name>_nz.jpg
```

Babylon.js can load the set from the common base path with `CubeTexture`.

Recommended production size:
- desktop High: 1024–2048 px per face
- Medium: 1024 px per face
- Low/mobile: 512 px per face

Keep seams clean and avoid objects very close to the capture camera.

## Current development mappings

The runtime currently uses lightweight Babylon Playground cubemap sets as temporary visual development environments:

| Environment | Current dev cubemap |
| --- | --- |
| Botanical Atrium | TropicalSunnyDay |
| Dark Laboratory | skybox3 |
| Ocean Observatory | skybox2 |
| Desert Research Station | skybox4 |
| Neon Night Lab | space |
| Minimal White Gallery | skybox |

These are placeholders. The environment system is intentionally data-driven so each can be replaced without changing level/gameplay code.

## Production asset direction

Preferred source for final photographic environments: Poly Haven CC0 HDRIs, converted to six cubemap faces and optimized for web.

Candidate references:
- Botanical Atrium: **Glasshouse Interior**
- Minimal White Gallery: **St. Fagans Interior**
- Neon Night Lab: **Newman Lobby**
- Dark / Industrial Lab: **Hangar Interior** or **Teufelsberg Inner**
- Desert Research Station: **Rogland Sunset** / **The Lost City**
- Ocean Observatory: **Cannon** or another unrestricted cool coastal HDRI

The final cubemap is not only a backdrop: the same texture is assigned to `scene.environmentTexture` and the custom water shader, so it affects PBR glass and water reflections.

## Licensing rule

Only commit assets with a verified redistributable license. Record:
- original asset name
- author
- source page
- license
- conversion/tonemapping performed

Do not commit unknown web skyboxes just because they look suitable.
