running in wayland:
    WINIT_UNIX_BACKEND=x11 cargo run --features bevy/dynamic_linking

build for wasm
    cargo build --release --target wasm32-unknown-unknown

generate wasm
    ~/.cargo/bin/wasm-bindgen --out-dir ./out/ --target web ./target/wasm32-unknown-unknown/release/renderlib.wasm 