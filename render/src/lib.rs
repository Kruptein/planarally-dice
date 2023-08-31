use bevy::gltf::{Gltf, GltfMesh};
use bevy::log::LogPlugin;
use std::f32::consts::PI;
use std::ops::Mul;
use std::sync::mpsc::{self, Receiver, Sender};
use std::sync::OnceLock;
use wasm_bindgen::prelude::*;

use bevy::asset::LoadState;
// use bevy::diagnostic::{FrameTimeDiagnosticsPlugin, LogDiagnosticsPlugin};
use bevy::pbr::{CascadeShadowConfigBuilder, DirectionalLightShadowMap};
use bevy::prelude::*;
use bevy::utils::HashMap;
use bevy_rapier3d::prelude::*;
use rand::Rng;

#[derive(Component)]
struct CustomUV;

#[derive(Component)]
struct Cam;

#[derive(Resource)]
struct AssetsLoading(Vec<HandleUntyped>);

#[derive(Resource)]
struct ScreenSize {
    width: u16,
    height: u16,
}

#[derive(Resource)]
struct GlobalResources {
    gltf_meshes: HashMap<String, Handle<GltfMesh>>,
    // mat_handles: HashMap<String, Handle<StandardMaterial>>,
    // mesh_handles: HashMap<String, Handle<Mesh>>,
}

#[derive(Component)]
struct Die;

struct JsChannel {
    sender: Sender<u8>,
    receiver: Receiver<u8>,
}

static SENDER: OnceLock<Sender<u8>> = OnceLock::new();

#[wasm_bindgen]
pub fn load_bevy(path: &str, width: u16, height: u16) {
    let (sender, receiver) = mpsc::channel();
    let s = sender.clone();
    SENDER.set(sender).unwrap();

    App::new()
        .insert_resource(Msaa::Sample4)
        .insert_non_send_resource(JsChannel {
            receiver,
            sender: s,
        })
        .insert_resource(ScreenSize { height, width })
        .insert_resource(GlobalResources {
            // mat_handles: HashMap::new(),
            // mesh_handles: HashMap::new(),
            gltf_meshes: HashMap::new(),
        })
        .insert_resource(AssetsLoading(vec![]))
        .insert_resource(DirectionalLightShadowMap { size: 4096 })
        .add_plugins((
            DefaultPlugins
                .set(AssetPlugin {
                    asset_folder: path.to_string(),
                    ..Default::default()
                })
                .set(WindowPlugin {
                    primary_window: Some(Window {
                        fit_canvas_to_parent: true,
                        ..default()
                    }),
                    ..default()
                })
                .set(LogPlugin {
                    filter: "info,wgpu_core=warn,wgpu_hal=warn,render=debug".into(),
                    level: bevy::log::Level::DEBUG,
                }),
            RapierPhysicsPlugin::<NoUserData>::default(),
            RapierDebugRenderPlugin::default(),
            // LogDiagnosticsPlugin::default(),
            // FrameTimeDiagnosticsPlugin,
        ))
        .add_systems(Startup, (setup_graphics, setup_physics))
        .add_systems(
            Update,
            (input_handler, check_assets_ready, throw_d4, log_dice),
        )
        .run();
}

fn setup_graphics(
    mut commands: Commands,
    asset_server: ResMut<AssetServer>,
    mut loading: ResMut<AssetsLoading>,
) {
    let gltf: Handle<Gltf> = asset_server.load("Dice20variant.gltf"); // #Mesh3/Primitive0
    loading.0.push(gltf.clone_untyped());

    // Add a camera so we can see the debug-render.
    commands.spawn((
        Camera3dBundle {
            // transform: Transform::from_xyz(-50.0, 50.0, 50.0).looking_at(Vec3::ZERO, Vec3::Y),
            transform: Transform::from_xyz(0.0, 200.0, 0.0).looking_at(Vec3::ZERO, Vec3::Y),
            ..Default::default()
        },
        Cam,
    ));

    // let d4_handle = asset_server.load("d4_uv.png");
    // let d4_material = materials.add(StandardMaterial {
    //     base_color_texture: Some(d4_handle),
    //     ..Default::default()
    // });
    // global_resources
    //     .mat_handles
    //     .insert("d4".to_owned(), d4_material);
}

// fn create_d4_mesh(meshes: &mut ResMut<Assets<Mesh>>) -> Handle<Mesh> {
//     // THESE ARE TAKEN FROM THE BABYLON EXPORT BUT WITH THE Z AXIS INVERTED TO ACCOUNT FOR LEFT->RIGHT HANDEDNESS
//     // (in both positions & normals)

//     let vertices = &[
//         // Face A   1-3-2
//         ([0., -0.3674, -1.0392], [0., -1., 0.], [0.5, 0.95]),
//         ([0.9, -0.3674, 0.5196], [0., -1., 0.], [0.999, 0.95]),
//         ([-0.9, -0.3674, 0.5196], [0., -1., 0.], [0.75, 0.478]),
//         // Face B   1-2-4
//         ([0., -0.3674, -1.0392], [-0.861, 0.333, -0.471], [0.5, 0.95]),
//         (
//             [-0.9, -0.3674, 0.5196],
//             [-0.861, 0.333, -0.471],
//             [0.75, 0.478],
//         ),
//         ([0., 1.1023, 0.], [-0.861, 0.333, -0.471], [0.25, 0.478]),
//         // Face C   4-2-3
//         ([-0.9, -0.3674, 0.5196], [0., 0.333, 0.943], [0.75, 0.478]),
//         ([0.9, -0.3674, 0.5196], [0., 0.333, 0.943], [0.5, 0.]),
//         ([0., 1.1023, 0.], [0., 0.333, 0.943], [0.25, 0.478]),
//         // Face D   3-1-4
//         (
//             [0.9, -0.3674, 0.5196],
//             [0.861, 0.333, -0.471],
//             [0.001, 0.95],
//         ),
//         ([0., -0.3674, -1.0392], [0.861, 0.333, -0.471], [0.5, 0.95]),
//         ([0., 1.1023, 0.], [0.861, 0.333, -0.471], [0.25, 0.478]),
//     ];

//     let positions: Vec<_> = vertices.iter().map(|(p, _, _)| *p).collect();
//     let normals: Vec<_> = vertices.iter().map(|(_, n, _)| *n).collect();
//     let uvs: Vec<_> = vertices.iter().map(|(_, _, uv)| *uv).collect();

//     let mut mesh = Mesh::new(PrimitiveTopology::TriangleList);
//     mesh.insert_attribute(Mesh::ATTRIBUTE_POSITION, positions);
//     mesh.insert_attribute(Mesh::ATTRIBUTE_NORMAL, normals);
//     mesh.insert_attribute(Mesh::ATTRIBUTE_UV_0, uvs);
//     mesh.set_indices(Some(mesh::Indices::U32(vec![
//         0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11,
//     ])));

//     meshes.add(mesh)
// }

fn setup_physics(
    mut commands: Commands,
    mut meshes: ResMut<Assets<Mesh>>,
    mut materials: ResMut<Assets<StandardMaterial>>,
    screen_size: Res<ScreenSize>,
) {
    commands.spawn(DirectionalLightBundle {
        directional_light: DirectionalLight {
            shadows_enabled: true,
            ..default()
        },
        transform: Transform {
            translation: Vec3::new(0.0, 15.0, 0.0),
            rotation: Quat::from_rotation_x(-PI / 2.),
            // rotation: Quat::from_rotation_x(-PI / 8.),
            ..default()
        },
        cascade_shadow_config: CascadeShadowConfigBuilder {
            first_cascade_far_bound: 4.0,
            maximum_distance: 10.0,
            ..default()
        }
        .into(),
        ..default()
    });

    let x = screen_size.height.into();
    let z = screen_size.width.into();
    let biggest = if x > z { x } else { z };
    let height = 50.0;

    /* Create the ground. */
    commands
        .spawn(PbrBundle {
            mesh: meshes.add(shape::Plane::from_size(biggest).into()),
            material: materials.add(Color::rgb(0.3, 0.5, 0.3).into()),
            ..default()
        })
        .insert(RigidBody::Fixed)
        .insert(Collider::cuboid(x / 2., 0.1, z / 2.))
        .insert(Friction {
            coefficient: 1.,
            ..default()
        })
        .insert(TransformBundle::from(Transform::from_xyz(0.0, 0.0, 0.0)));

    commands
        .spawn(PbrBundle {
            mesh: meshes.add(shape::Plane::from_size(biggest).into()),
            material: materials.add(Color::rgba(0.3, 0.5, 0.3, 0.1).into()),
            ..default()
        })
        .insert(RigidBody::Fixed)
        .insert(Collider::cuboid(x / 2., 0.1, z / 2.))
        .insert(TransformBundle::from(Transform::from_xyz(0.0, height, 0.0)));

    commands
        .spawn(PbrBundle {
            mesh: meshes.add(shape::Box::new(x, height, 1.).into()),
            material: materials.add(Color::rgba(0.3, 0.5, 0.3, 0.2).into()),
            ..default()
        })
        .insert(RigidBody::Fixed)
        .insert(Collider::cuboid(x / 2., height / 2., 0.5))
        .insert(TransformBundle::from(Transform::from_xyz(
            0.0,
            height / 2.,
            z / 2.,
        )));
    commands
        .spawn(PbrBundle {
            mesh: meshes.add(shape::Box::new(x, height, 1.).into()),
            material: materials.add(Color::rgba(0.3, 0.5, 0.3, 0.2).into()),
            ..default()
        })
        .insert(RigidBody::Fixed)
        .insert(Collider::cuboid(x / 2., height / 2., 0.5))
        .insert(TransformBundle::from(Transform::from_xyz(
            0.0,
            height / 2.,
            -z / 2.,
        )));
    commands
        .spawn(PbrBundle {
            mesh: meshes.add(shape::Box::new(1., height, z).into()),
            material: materials.add(Color::rgba(0.3, 0.5, 0.3, 0.2).into()),
            ..default()
        })
        .insert(RigidBody::Fixed)
        .insert(Collider::cuboid(0.5, height / 2., z / 2.))
        .insert(TransformBundle::from(Transform::from_xyz(
            x / 2.,
            height / 2.,
            0.0,
        )));
    commands
        .spawn(PbrBundle {
            mesh: meshes.add(shape::Box::new(1., height, z).into()),
            material: materials.add(Color::rgba(0.3, 0.5, 0.3, 0.2).into()),
            ..default()
        })
        .insert(RigidBody::Fixed)
        .insert(Collider::cuboid(0.5, height / 2., z / 2.))
        .insert(TransformBundle::from(Transform::from_xyz(
            -x / 2.,
            height / 2.,
            0.0,
        )));
}

fn check_assets_ready(
    server: Res<AssetServer>,
    mut loading: ResMut<AssetsLoading>,
    mut global_resources: ResMut<GlobalResources>,
    assets_gltf: Res<Assets<Gltf>>,
) {
    if !loading.0.is_empty() {
        if server.get_load_state(loading.0.get(0).unwrap()) != LoadState::Loaded {
            return;
        }
        let ass = loading.0.pop().unwrap();
        let handle = ass.typed::<Gltf>();

        if let Some(gltf) = assets_gltf.get(&handle) {
            // error!("{:?}", gltf.named_meshes);
            // let d4 = assets_gltf_mesh
            //     .get(&gltf.named_meshes["Polygon.001"])
            //     .unwrap();

            global_resources
                .gltf_meshes
                .insert("d4".to_owned(), gltf.named_meshes["Polygon.001"].clone());
            global_resources
                .gltf_meshes
                .insert("d12".to_owned(), gltf.named_meshes["Polygon.013"].clone());
            global_resources
                .gltf_meshes
                .insert("d20".to_owned(), gltf.named_meshes["Icosphere.003"].clone());

            // commands.spawn(PbrBundle {
            //     mesh: d4.primitives[0].mesh.clone(),
            //     material: d4.primitives[0].material.clone().unwrap(),
            //     transform: Transform::default().with_scale(Vec3::splat(10.)),
            //     ..default()
            // });
        }

        // global_resources
        //     .mesh_handles
        //     .insert("d4".to_owned(), handle);
    }
}

fn input_handler(
    channel: NonSend<JsChannel>,
    keyboard_input: Res<Input<KeyCode>>,
    mut query: Query<&mut Transform, (With<CustomUV>, Without<Cam>)>,
    mut cam_query: Query<&mut Transform, (With<Cam>, Without<CustomUV>)>,
    time: Res<Time>,
) {
    if keyboard_input.pressed(KeyCode::X) {
        for mut transform in &mut query {
            transform.rotate_x(time.delta_seconds() / 1.2);
        }
    }
    if keyboard_input.pressed(KeyCode::Y) {
        for mut transform in &mut query {
            transform.rotate_y(time.delta_seconds() / 1.2);
        }
    }
    if keyboard_input.pressed(KeyCode::Z) {
        for mut transform in &mut query {
            transform.rotate_z(time.delta_seconds() / 1.2);
        }
    }
    if keyboard_input.pressed(KeyCode::R) {
        for mut transform in &mut query {
            transform.look_to(Vec3::NEG_Z, Vec3::Y);
        }
    }
    if keyboard_input.pressed(KeyCode::Left) {
        for mut transform in &mut cam_query {
            transform.rotate_around(
                Vec3::ZERO,
                Quat::from_rotation_y(time.delta_seconds() / 1.2),
            );
        }
    }
    if keyboard_input.pressed(KeyCode::Right) {
        for mut transform in &mut cam_query {
            transform.rotate_around(
                Vec3::ZERO,
                Quat::from_rotation_y(-time.delta_seconds() / 1.2),
            );
        }
    }
    if keyboard_input.pressed(KeyCode::Down) {
        for mut transform in &mut cam_query {
            transform.rotate_around(
                Vec3::ZERO,
                Quat::from_rotation_z(-time.delta_seconds() / 1.2),
            );
        }
    }
    if keyboard_input.pressed(KeyCode::Up) {
        for mut transform in &mut cam_query {
            transform.rotate_around(
                Vec3::ZERO,
                Quat::from_rotation_z(time.delta_seconds() / 1.2),
            );
        }
    }
    if keyboard_input.just_pressed(KeyCode::T) {
        channel.sender.send(1).unwrap();
        //     throw_d4(global_resources, meshes, commands);
    }
    if keyboard_input.just_pressed(KeyCode::C) {
        channel.sender.send(0).unwrap();
        //     throw_d4(global_resources, meshes, commands);
    }
}

fn log_dice(dice: Query<(&Velocity, &GravityScale), With<Die>>) {
    for die in dice.iter() {
        debug!("Velocity: {:?}  Gravity {:?}", die.0.linvel.y, die.1);
    }
}

fn throw_d4(
    channel: NonSend<JsChannel>,
    global_resources: Res<GlobalResources>,
    gltf_meshes: Res<Assets<GltfMesh>>,
    meshes: Res<Assets<Mesh>>,
    mut commands: Commands,
    dice: Query<Entity, With<Die>>,
) {
    let x = channel.receiver.try_recv();
    if x.is_err() {
        return;
    }
    let num = x.unwrap();
    if num == 0 {
        for die in dice.iter() {
            commands.entity(die).despawn();
        }
        return;
    }
    for _ in 0..num {
        // let d4_mesh_handle: &Handle<Mesh> = global_resources.mesh_handles.get("d4").unwrap();
        // let c = Collider::from_bevy_mesh(
        //     meshes.get(d4_mesh_handle).unwrap(),
        //     &ComputedColliderShape::ConvexHull,
        // );
        // let material = global_resources.mat_handles.get("d4").unwrap();

        let mut rng = rand::thread_rng();
        let x = rng.gen_range(-1.0..=1.0);
        let z = rng.gen_range(-1.0..=1.0);
        let impulse = Vec3::new(x, 0., z).normalize().mul(100.0); //.add(Vec3::Y);
                                                                  // let impulse = Vec3::new(0., 1., 75.);
                                                                  // debug!("Impulse: {:?}", impulse);

        // commands.spawn(PbrBundle {
        //     mesh: d4.primitives[0].mesh.clone(),
        //     material: d4.primitives[0].material.clone().unwrap(),
        //     transform: Transform::default().with_scale(Vec3::splat(10.)),
        //     ..default()
        // });

        let die = &gltf_meshes
            .get(global_resources.gltf_meshes.get("d20").unwrap())
            .unwrap()
            .primitives[0];

        let c = Collider::from_bevy_mesh(
            meshes.get(&die.mesh).unwrap(),
            &ComputedColliderShape::ConvexHull,
        );

        commands
            .spawn((
                PbrBundle {
                    mesh: die.mesh.clone(),
                    material: die.material.clone().unwrap(),
                    // mesh: d4_mesh_handle.clone(),
                    // material: material.clone(),
                    transform: Transform::from_xyz(0.0, 10.0, -50.0).with_scale(Vec3::splat(10.0)),
                    ..Default::default()
                },
                Die,
            ))
            .insert(RigidBody::Dynamic)
            .insert(c.unwrap())
            // .insert(ColliderMassProperties::Density(6.))
            // .insert(Restitution::coefficient(0.4))
            // .insert(GravityScale(5.))
            // .insert(Velocity::default())
            .insert(ExternalImpulse {
                impulse,
                // torque_impulse: Vec3::new(1.0, 0., 0.),
                ..default()
            });
    }

    // let d4_collider = Collider::from_bevy_mesh(
    //     meshes.get(&d4_mesh_handle).unwrap(),
    //     &ComputedColliderShape::ConvexHull,
    // );

    // commands
    //     .spawn((
    //         PbrBundle {
    //             mesh: d4_mesh_handle,
    //             material,
    //             ..default()
    //         },
    //         CustomUV,
    //     ))
    //     .insert(RigidBody::Dynamic)
    //     .insert(d4_collider.unwrap())
    //     .insert(Restitution::coefficient(0.7))
    //     .insert(TransformBundle::from(
    //         Transform::from_xyz(0.0, 1.0, 0.0).with_scale(Vec3::splat(1.25)),
    //     ));
}

// fn read_shit(
//     channel: NonSend<JsChannel>,
//     global_resources: Res<GlobalResources>,
//     meshes: Res<Assets<Mesh>>,
//     commands: Commands,
// ) {
//     for i in channel.0.try_iter() {
//         // println!("GOT SOMETHING {}", i);
//         throw_d4(global_resources, meshes, commands);
//     }
// }

#[wasm_bindgen]
pub fn d4(num: u8) {
    let s = SENDER.get().unwrap();
    s.send(num).unwrap();
}
