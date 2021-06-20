export async function loadAmmo(): Promise<any> {
    const ammo = await import("ammo.js");
    console.log(ammo);
    return await ammo.default();
}
