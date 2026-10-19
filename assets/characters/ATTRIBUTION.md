# Character assets

Original models and motion clips: Microsoft Rocketbox, Copyright (c) 2020 Microsoft, MIT License.

Original source: https://github.com/microsoft/Microsoft-Rocketbox

Web-optimized GLB conversions downloaded from https://models.codelove.in/ on 2026-10-19. The original MIT copyright and license are embedded in every model and are retained in LICENSE.txt.

Models: female-child-01, male-child-01, female-adult-01, female-adult-05, male-adult-02, male-adult-09. Motion files: female/male idle_neutral_01, walk_neutral_01, run_neutral_01.

Meshopt buffer compression was expanded at build time so a runtime WebAssembly decoder is not needed. The game applies material color masks, attaches original accessories, clones the skeletons independently, and retargets motions to retain each model's native body proportions. No Microsoft endorsement is implied.
