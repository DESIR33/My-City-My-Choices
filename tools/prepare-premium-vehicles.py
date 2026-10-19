"""Build browser vehicle geometry from the two user-supplied Blender files.

Blender 3.6+: blender --factory-startup --disable-autoexec -b --python \
  tools/prepare-premium-vehicles.py -- /path/to/source-files /path/to/output
Then run the meshopt commands documented in assets/vehicles/README.md.
The original .blend files and unavailable external image references are not exported.
"""
import bpy
import bmesh
import collections
import json
import math
import pathlib
import sys
from mathutils import Matrix, Vector

arguments = sys.argv[sys.argv.index('--') + 1:]
source, output = map(pathlib.Path, arguments[:2])
selected_models = set(arguments[2:]) or {'senna', 'gls'}
output.mkdir(parents=True, exist_ok=True)
PALETTE = {
    'Paint': ((.35, .035, .014, 1), .38, .25),
    'Glass': ((.095, .135, .15, .78), .05, .075),
    'Chrome': ((.55, .59, .62, 1), .95, .22),
    'Alloy': ((.25, .28, .30, 1), .92, .26),
    'Rubber': ((.012, .014, .016, 1), 0, .94),
    'Trim': ((.012, .016, .019, 1), .18, .48),
    'Carbon': ((.018, .023, .026, 1), .35, .34),
    'Leather': ((.025, .02, .017, 1), 0, .85),
    'SeatAccent': ((.14, .065, .025, 1), 0, .78),
    'Headlamp': ((.75, .84, .92, 1), .3, .16),
    'TailLamp': ((.35, .006, .003, 1), .12, .22),
    'Plate': ((.65, .68, .62, 1), .12, .53),
    'Caliper': ((.36, .018, .009, 1), .35, .38),
}


def material(name):
    key = 'Vehicle_' + name
    if key in bpy.data.materials:
        return bpy.data.materials[key]
    color, metal, rough = PALETTE[name]
    m = bpy.data.materials.new(key)
    m.use_nodes = True
    m.diffuse_color = color
    n = m.node_tree.nodes.get('Principled BSDF')
    n.inputs['Base Color'].default_value = color
    n.inputs['Metallic'].default_value = metal
    n.inputs['Roughness'].default_value = rough
    if name == 'Glass':
        m.blend_method = 'BLEND'
        n.inputs['Alpha'].default_value = color[3]
    if name == 'Paint':
        n.inputs['Clearcoat'].default_value = 1
        n.inputs['Clearcoat Roughness'].default_value = .12
    return m


def compact_materials(mesh):
    unique = []
    remap = {}
    for i, m in enumerate(mesh.materials):
        if m not in unique:
            unique.append(m)
        remap[i] = unique.index(m)
    indices = [remap[p.material_index] for p in mesh.polygons]
    mesh.materials.clear()
    for m in unique:
        mesh.materials.append(m)
    for p, index in zip(mesh.polygons, indices):
        p.material_index = index


def split_suv(obj):
    """Separate disconnected tire/rim islands; keep the cabin and body intact."""
    mesh = obj.data
    mesh.calc_normals_split()
    points = [obj.matrix_world @ v.co for v in mesh.vertices]
    normal_matrix = obj.matrix_world.to_3x3().inverted().transposed()
    parents = list(range(len(points)))

    def find(a):
        while parents[a] != a:
            parents[a] = parents[parents[a]]
            a = parents[a]
        return a

    for e in mesh.edges:
        a, b = (find(i) for i in e.vertices)
        parents[b] = a
    islands = collections.defaultdict(list)
    for p in mesh.polygons:
        islands[find(p.vertices[0])].append(p)
    tires = collections.defaultdict(list)
    for p in mesh.polygons:
        if mesh.materials[p.material_index].name == 'Tyres':
            for i in p.vertices:
                v = points[i]
                tires[('R' if v.x < 0 else 'L') + ('F' if v.y < 0 else 'R')].append(v)
    centers = {k: Vector([(min(v[i] for v in vs) + max(v[i] for v in vs)) / 2 for i in range(3)]) for k, vs in tires.items()}
    radii = {k: (max(v.z for v in vs) - min(v.z for v in vs)) / 2 for k, vs in tires.items()}
    parts = collections.defaultdict(list)
    for faces in islands.values():
        verts = {i for p in faces for i in p.vertices}
        lo = Vector([min(points[v][i] for v in verts) for i in range(3)])
        hi = Vector([max(points[v][i] for v in verts) for i in range(3)])
        c, extent = (lo + hi) / 2, hi - lo
        name = 'body'
        for k, center in centers.items():
            radial_extent = max(math.hypot(points[v].y - center.y, points[v].z - center.z) for v in verts)
            if extent.y < 2.8 and extent.z < 2.8 and abs(c.x) > 1.65 and abs(c.x - center.x) < .8 and radial_extent < radii[k] * 1.025:
                name = k
                break
        parts[name].extend(faces)
    result = {}
    for name, faces in parts.items():
        indices = sorted({i for p in faces for i in p.vertices})
        remap = {v: i for i, v in enumerate(indices)}
        m = bpy.data.meshes.new(name)
        m.from_pydata([points[i] for i in indices], [], [[remap[i] for i in p.vertices] for p in faces])
        for mat in mesh.materials:
            m.materials.append(mat)
        for new, old in zip(m.polygons, faces):
            new.material_index = old.material_index
            new.use_smooth = old.use_smooth
        m.use_auto_smooth = True
        m.normals_split_custom_set([(normal_matrix @ mesh.loops[i].normal).normalized() for p in faces for i in p.loop_indices])
        o = bpy.data.objects.new(name, m)
        if name != 'body':
            o['tireCenter'] = list(centers[name])
            o['sourceWheelRadius'] = radii[name]
        bpy.context.collection.objects.link(o)
        result[name] = o
    return result


maps = {
    'senna': {
        'BodyPaint': 'Paint', 'OrangeBody': 'Paint', 'Windows': 'Glass', 'Translucent': 'Glass',
        'Glass': 'Glass', 'Headlight': 'Headlamp', 'Shining': 'Headlamp',
        'BackLighs': 'TailLamp', 'Baclight': 'TailLamp', 'Red Light': 'TailLamp',
        'Back Plate': 'Plate', 'Dashboard': 'Leather', 'Seat': 'Leather',
        'Seat lining': 'SeatAccent', 'Interior': 'Leather', 'Crbon': 'Carbon',
        'Metallic': 'Alloy', 'Grey': 'Trim', 'Top': 'Carbon', 'screen': 'Trim',
    },
    'gls': {
        'Polar_White': 'Paint', 'WindowsTint': 'Glass', 'ChromeBlack_Windows': 'Trim',
        'Interior': 'Leather', 'Color_A07': 'TailLamp', 'Color_A08': 'TailLamp',
        'Lights_Glass': 'Glass', 'Color_M01': 'Headlamp', 'Color_M04': 'Headlamp',
        'Color_M02': 'Chrome', 'Color_M03': 'Alloy', 'Color_M08': 'Trim',
        'Tyres': 'Rubber', 'material': 'Plate', '_2020_Mercedes_Benz_GLS450_wire_088144225': 'Trim',
    },
}
reports = []
for model, filename in [('senna', 'uploads_files_2815692_Mclaren+Senna.blend'), ('gls', 'uploads_files_2787791_Mercedes+Benz+GLS+580.blend')]:
    if model not in selected_models:
        continue
    bpy.ops.wm.open_mainfile(filepath=str(source / filename), load_ui=False, use_scripts=False)
    if model == 'senna':
        parts = {'body': bpy.data.objects['senna'], **{k: bpy.data.objects[k] for k in ['FL', 'FR', 'RL', 'RR']}}
        # Normalize the source's wheel names to the same front/rear convention.
        parts = {'body': parts['body'], 'LF': parts['FL'], 'RF': parts['FR'], 'LR': parts['RL'], 'RR': parts['RR']}
        for o in parts.values():
            o.data = o.data.copy()
            o.data.transform(o.matrix_world)
            o.matrix_world = Matrix.Identity(4)
    else:
        parts = split_suv(bpy.data.objects['Mercedes Benz GLS 580'])
    assert set(parts) == {'body', 'LF', 'RF', 'LR', 'RR'}, set(parts)
    points = [v.co for o in parts.values() for v in o.data.vertices]
    lo = Vector([min(v[i] for v in points) for i in range(3)])
    hi = Vector([max(v[i] for v in points) for i in range(3)])
    scale = min(2.02 / (hi.x - lo.x), 4.72 / (hi.y - lo.y))
    origin = Vector([(hi.x + lo.x) / 2, (hi.y + lo.y) / 2, lo.z])
    for name, obj in parts.items():
        for v in obj.data.vertices:
            v.co = (v.co - origin) * scale + Vector((0, 0, .061))
        if name != 'body':
            vs = [v.co for v in obj.data.vertices]
            center = Vector([(min(v[i] for v in vs) + max(v[i] for v in vs)) / 2 for i in range(3)])
            if 'tireCenter' in obj:
                center = (Vector(obj['tireCenter']) - origin) * scale + Vector((0, 0, .061))
            for v in obj.data.vertices:
                v.co -= center
            obj.location = center
            obj['wheelRadius'] = obj['sourceWheelRadius'] * scale if 'sourceWheelRadius' in obj else (max(v.z for v in vs) - min(v.z for v in vs)) / 2
            obj['wheelCenter'] = [center.x, center.z, -center.y]
        for i, mat in enumerate(list(obj.data.materials)):
            if model == 'senna' and name != 'body':
                category = 'Caliper' if '135006006' in mat.name else 'Rubber'
            else:
                category = maps[model].get(mat.name, 'Trim')
            obj.data.materials[i] = material(category)
        if model == 'senna' and name != 'body':
            # The source uses one black material for both the tire and rim.
            alloy_index = len(obj.data.materials)
            obj.data.materials.append(material('Alloy'))
            for p in obj.data.polygons:
                if obj.data.materials[p.material_index].name == 'Vehicle_Rubber':
                    radial = sum(math.hypot(obj.data.vertices[i].co.y, obj.data.vertices[i].co.z) for i in p.vertices) / len(p.vertices)
                    if radial < obj['wheelRadius'] * .8:
                        p.material_index = alloy_index
        compact_materials(obj.data)
        # Unavailable source image maps are replaced above. The exporter omits UVs.
    originals = set(parts.values())
    for o in list(bpy.data.objects):
        if o not in originals:
            bpy.data.objects.remove(o, do_unlink=True)
    root = bpy.data.objects.new('PremiumVehicle_' + model, None)
    bpy.context.collection.objects.link(root)
    root['modelId'] = model
    root['sourceFile'] = filename
    root['gameForward'] = '+Z'
    levels = []
    for level, body_ratio, wheel_ratio in [('near', .17 if model == 'senna' else .23, .12), ('mid', .045, .045), ('far', .009, .012)]:
        total = 0
        for name, original in parts.items():
            o = original.copy()
            o.data = original.data.copy()
            bpy.context.collection.objects.link(o)
            o.name = level + '_' + name
            o.parent = root
            bpy.context.view_layer.objects.active = o
            o.select_set(True)
            if model != 'gls' or level != 'near':
                decimate = o.modifiers.new('Distance detail', 'DECIMATE')
                decimate.ratio = body_ratio if name == 'body' else wheel_ratio
                decimate.use_collapse_triangulate = True
                bpy.ops.object.modifier_apply(modifier=decimate.name)
            # Exported custom normals no longer describe the decimated surface.
            # Weld coincident vertices and rebuild angle-limited smooth normals.
            if model == 'senna' and o.data.has_custom_normals:
                bpy.ops.mesh.customdata_custom_splitnormals_clear()
            if model == 'senna':
                bm = bmesh.new()
                bm.from_mesh(o.data)
                # Coincident front/back faces can have different materials (paint
                # outside, upholstery inside). Welding across them deletes panels.
                material_vertices = collections.defaultdict(list)
                for v in bm.verts:
                    material_vertices[tuple(sorted({f.material_index for f in v.link_faces}))].append(v)
                for vertices in material_vertices.values():
                    bmesh.ops.remove_doubles(bm, verts=vertices, dist=.00001)
                bm.to_mesh(o.data)
                bm.free()
                for p in o.data.polygons:
                    p.use_smooth = True
                for edge in o.data.edges:
                    edge.use_edge_sharp = False
                o.data.use_auto_smooth = True
                o.data.auto_smooth_angle = math.radians(50)
            if level == 'far':
                for i, mat in enumerate(list(o.data.materials)):
                    if mat.name not in ['Vehicle_Paint', 'Vehicle_Glass', 'Vehicle_Rubber', 'Vehicle_TailLamp', 'Vehicle_Headlamp']:
                        o.data.materials[i] = material('Trim' if mat.name in ['Vehicle_Carbon', 'Vehicle_Leather', 'Vehicle_SeatAccent'] else 'Alloy')
            compact_materials(o.data)
            total += sum(len(p.vertices) - 2 for p in o.data.polygons)
            o.select_set(False)
        levels.append({'level': level, 'triangles': total})
    for o in originals:
        bpy.data.objects.remove(o, do_unlink=True)
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.export_scene.gltf(filepath=str(output / (model + '-raw.glb')), export_format='GLB', use_selection=True,
                              export_extras=True, export_yup=True, export_texcoords=False, export_normals=True,
                              export_colors=False, export_cameras=False, export_lights=False, export_animations=False)
    report = dict(model=model, source=filename, width=(hi.x - lo.x) * scale, length=(hi.y - lo.y) * scale,
                  height=(hi.z - lo.z) * scale, levels=levels)
    reports.append(report)
    print('VEHICLE_EXPORT', json.dumps(report), flush=True)
(output / 'build-report.json').write_text(json.dumps(reports, indent=2) + '\n')
