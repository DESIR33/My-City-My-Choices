# Detailed vehicle assets

These browser assets are derived from the project owner's supplied files:

- `uploads_files_2815692_Mclaren+Senna.blend`
- `uploads_files_2787791_Mercedes+Benz+GLS+580.blend`

The source files referenced unavailable external textures. Their image references,
studio props, cameras, and Blender shaders are omitted. Runtime PBR materials
provide clear-coated paint, tinted glass, chrome, alloy, rubber, carbon, and cabin
surfaces. The model names describe the supplied geometry; provenance remains with
the original supplied assets.

Each asset contains `near`, `mid`, and `far` bodies and four independent wheels.
Near GLS geometry preserves the authored surface normals and original detail;
medium and far geometry are simplified. The Senna is reduced at all three levels.
The conversion preserves wheel centers as extras so geometry compression cannot
move the steering pivots. The cars fit the existing collision footprint. Paint
color, ownership IDs, saved poses, disabled states, lights, and wheel travel stay
under the existing game systems. Police cars retain their existing rig and livery.

The two compressed assets total 2.8 MB. The civilian fleet now retains the supplied
Ford Mustang alongside the Mercedes-Benz GLS and McLaren Senna: 14 Mustangs, 14 SUVs,
and 7 McLarens across the 35 civilian slots. `vehicle-fleet.js` assigns 12 body-paint
options deterministically and separately from the police roster. Every model has
multiple colors, and both districts contain all three models. The owned coupe is
a Mustang; purchasing or restoring it preserves its offer paint. Police livery is
unchanged. Premium near detail is limited to four cars on desktop and two on touch devices.
Medium detail is limited to ten and five respectively. Remaining cars use the
same model's simplified silhouette. Geometry is shared between instances.

A single 128px desktop / 64px mobile cube-map capture supplies real neighborhood
reflections. This is a static capture near the player when the assets finish
loading. It is not ray tracing or a reflection updated for every car. The sky
environment remains available if capture fails. Model-loading failures preserve
the existing shaped cars. If a premium download fails, the available premium
model and existing Ford remain mixed instead of replacing every car with one SUV.
All three brands share the city reflection environment. No additional model
downloads or runtime dependencies are needed for this fleet update.

## Rebuild

Run Blender 3.6.23 with automatic scripts disabled. Source files stay outside the
repository; only the optimized browser artifacts are committed.

```sh
blender --factory-startup --disable-autoexec -b --python tools/prepare-premium-vehicles.py -- /path/to/source-files /tmp/vehicle-build
npx --yes @gltf-transform/cli@4.2.1 meshopt /tmp/vehicle-build/senna-raw.glb /tmp/vehicle-build/senna.glb --level high
npx --yes @gltf-transform/cli@4.2.1 meshopt /tmp/vehicle-build/gls-raw.glb /tmp/vehicle-build/gls.glb --level high
python3 - <<'PY'
import gzip
from pathlib import Path
for model in ('senna', 'gls'):
    data = Path('/tmp/vehicle-build', model + '.glb').read_bytes()
    Path('assets/vehicles', model + '.glb.gz').write_bytes(gzip.compress(data, compresslevel=9, mtime=0))
PY
npm test
```

Meshopt decoding uses the decoder bundled with the existing Three.js version.
Gzip is decoded with `DecompressionStream`, as with the existing Mustang asset.
There are no texture downloads or new runtime packages for these two cars.
