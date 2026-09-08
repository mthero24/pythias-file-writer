import HID from "node-hid";
import { usb } from "usb";
import { getSettingsSync } from "./settings.js";

// Latest weight reading per device, keyed by "vendorId:productId"
const readings = new Map();
// Open HID device handles
const handles  = new Map();

function deviceKey(vendorId, productId) {
    return `${vendorId}:${productId}`;
}

function parseReading(data) {
    const buf = Buffer.from(data);
    const reading = { value: 0, system: undefined, off: true, overweight: false };

    if (buf[2] === 11) reading.system = "ounces";
    if (buf[2] === 2)  reading.system = "grams";
    reading.off = buf[2] === 0;

    if (reading.system === "grams")  reading.value = buf[4] + (256 * buf[5]);
    if (reading.system === "ounces") reading.value =
        Math.round((((buf[4] + buf[5] * 256) * 0.1) * 10) / 10 * 100) / 100;

    return reading;
}

function openDevice(vendorId, productId) {
    const key = deviceKey(vendorId, productId);
    if (handles.has(key)) return;

    try {
        const device = new HID.HID(vendorId, productId);
        handles.set(key, device);
        readings.set(key, { value: 0, system: undefined, off: true, overweight: false });

        device.on("data", data => {
            readings.set(key, parseReading(data));
        });

        device.on("error", () => {
            try { device.close(); } catch {}
            handles.delete(key);
            console.log(`[scales] device ${key} disconnected`);
        });

        console.log(`[scales] opened device ${key}`);
    } catch (e) {
        console.log(`[scales] could not open ${key}: ${e.message}`);
    }
}

function closeDevice(vendorId, productId) {
    const key = deviceKey(vendorId, productId);
    const device = handles.get(key);
    if (device) {
        try { device.close(); } catch {}
        handles.delete(key);
    }
    readings.delete(key);
}

function configuredScales() {
    try {
        const s = getSettingsSync();
        return Array.isArray(s.scaleDevices) ? s.scaleDevices : [];
    } catch {
        return [];
    }
}

// ── Public API ────────────────────────────────────────────────────────────────

export function startScales() {
    for (const sc of configuredScales()) {
        const vid = Number(sc.vendorId);
        const pid = Number(sc.productId);
        if (vid && pid) openDevice(vid, pid);
    }

    usb.on("attach", device => {
        const vid = device.deviceDescriptor.idVendor;
        const pid = device.deviceDescriptor.idProduct;
        const match = configuredScales().find(s => Number(s.vendorId) === vid && Number(s.productId) === pid);
        if (match) openDevice(vid, pid);
    });

    usb.on("detach", device => {
        closeDevice(device.deviceDescriptor.idVendor, device.deviceDescriptor.idProduct);
    });
}

// Restart after settings change (call from settings save handler if needed)
export function restartScales() {
    for (const [, device] of handles) {
        try { device.close(); } catch {}
    }
    handles.clear();
    readings.clear();
    startScales();
}

export function getWeightForStation(station) {
    const scales = configuredScales();
    if (scales.length === 0) return { error: true, msg: "No scales configured — add a scale in File Writer settings" };

    // Match by station name, fall back to first scale
    const sc = scales.find(s => s.name === station) ?? scales[0];
    const key = deviceKey(Number(sc.vendorId), Number(sc.productId));
    const reading = readings.get(key);

    if (!reading || !handles.has(key)) {
        return { error: true, msg: `Scale "${sc.name}" is not connected` };
    }
    if (reading.off) {
        return { error: true, msg: "Make sure the scale is turned on" };
    }
    if (reading.system === "grams") {
        return { error: true, msg: "Scale is set to grams — please switch to ounces" };
    }

    return { error: false, ...reading };
}
