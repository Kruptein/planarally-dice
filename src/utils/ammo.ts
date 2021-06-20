export async function loadAmmo(): Promise<any> {
    const ammo = await import("ammo.js");
    return await ammo.default();
}
