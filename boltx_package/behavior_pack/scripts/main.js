// BOLTX MobTrap + Enderman builder script (Bedrock 1.21.x compatible)
// behavior_pack/scripts/main.js
import { world, system } from "@minecraft/server";
import { ActionFormData } from "@minecraft/server-ui";

const BUILDER_ITEM = "boltx:boltx_tool";
const FALLBACK_ITEM = "minecraft:nether_star"; // بديل للاختبار
const COST = 67; // سعر بناء الموب تراب

world.afterEvents.itemUse.subscribe(async (event) => {
  try {
    const player = event.source;
    const item = event.itemStack;
    if (!item) return;
    if (item.typeId !== BUILDER_ITEM && item.typeId !== FALLBACK_ITEM) return;
    await openMobTrapMenu(player);
  } catch (e) {
    console.warn("BOLTX itemUse handler error:", e);
  }
});

async function openMobTrapMenu(player) {
  const form = new ActionFormData()
    .title("§0⚫ BOLTX - Mob Trap Builder §r")
    .body("§7اختر إعداد Mob Trap (سيتم خصم 67 دايموند من مخزونك):§r")
    .button("🟦 XP-mode — 2×2 hole (السقوط ≈ 22)") 
    .button("🔴 AUTO-KILL — 2×2 hole (السقوط ≈ 32)")
    .button("⚙️ تخصيص (اختيار حجم الفتحة/الوضع)")
    .button("📍 Enderman Farm — The End recommended — 67 ♦");

  const res = await form.show(player);
  if (!res || res.canceled) return;

  const loc = player.location;
  const x = Math.floor(loc.x) + 3;
  const y = Math.floor(loc.y);
  const z = Math.floor(loc.z);

  // فحص دايموند
  if (!chargeDiamonds(player, COST)) {
    await player.runCommandAsync(`tellraw @s {"rawtext":[{"text":"§c❌ ليس لديك ${COST} دايموند."}]}`);
    return;
  }
  await player.runCommandAsync(`tellraw @s {"rawtext":[{"text":"§a⚡ تم خصم ${COST} دايموند — جاري البناء..."}]}`);

  if (res.selection === 0) {
    await safeBuild(player, x, y, z, (p, bx, by, bz) => buildMobTrap(p, bx, by, bz, 2, "XP"));
  } else if (res.selection === 1) {
    await safeBuild(player, x, y, z, (p, bx, by, bz) => buildMobTrap(p, bx, by, bz, 2, "AUTO"));
  } else if (res.selection === 2) {
    // نموذج التخصيص: نعرض اختيار الحجم أولاً ثم الوضع
    const sizeForm = new ActionFormData()
      .title("اختر حجم الفتحة")
      .button("1×1")
      .button("2×2")
      .button("3×3");
    const sizeRes = await sizeForm.show(player);
    if (!sizeRes || sizeRes.canceled) return;
    const sizes = [1, 2, 3];
    const chosenSize = sizes[sizeRes.selection];

    const modeForm = new ActionFormData()
      .title("اختر الوضع")
      .button("XP-mode (≈22)")
      .button("AUTO-KILL (≈32)");
    const modeRes = await modeForm.show(player);
    if (!modeRes || modeRes.canceled) return;
    const chosenMode = modeRes.selection === 0 ? "XP" : "AUTO";

    await safeBuild(player, x, y, z, (p, bx, by, bz) => buildMobTrap(p, bx, by, bz, chosenSize, chosenMode));
  } else if (res.selection === 3) {
    await safeBuild(player, x, y, z, (p, bx, by, bz) => buildEndermanFarm(p, bx, by, bz, 2, "XP"));
  }
}

function chargeDiamonds(player, amount) {
  try {
    const invComp = player.getComponent("minecraft:inventory");
    if (!invComp) return false;
    const container = invComp.container;
    let total = 0;
    for (let i = 0; i < container.size; i++) {
      const it = container.getItem(i);
      if (it && it.typeId === "minecraft:diamond") total += it.amount;
    }
    if (total < amount) return false;
    let toRemove = amount;
    for (let i = 0; i < container.size && toRemove > 0; i++) {
      const it = container.getItem(i);
      if (it && it.typeId === "minecraft:diamond") {
        if (it.amount <= toRemove) {
          toRemove -= it.amount;
          container.setItem(i, undefined);
        } else {
          it.amount -= toRemove;
          container.setItem(i, it);
          toRemove = 0;
        }
      }
    }
    return true;
  } catch (e) {
    console.warn("BOLTX chargeDiamonds error:", e);
    return false;
  }
}

async function safeBuild(player, x, y, z, builderFn) {
  try {
    const dim = world.getDimension("overworld");
    const minX = x - 10, maxX = x + 10;
    const minY = Math.max(1, y), maxY = y + 60;
    const minZ = z - 10, maxZ = z + 10;
    await player.runCommandAsync(`tellraw @s {"rawtext":[{"text":"§e⚠ سيتم مسح منطقة البناء. تأكد أنك تريد المتابعة."}]}`);
    await dim.runCommandAsync(`fill ${minX} ${minY} ${minZ} ${maxX} ${maxY} ${maxZ} air`);
    await system.runTimeout(() => {}, 2);
    await builderFn(player, x, y, z);
  } catch (e) {
    console.warn("BOLTX safeBuild error:", e);
  }
}

/* buildMobTrap: holeSize = 1|2|3, mode = "XP"|"AUTO" */
async function buildMobTrap(player, x, y, z, holeSize, mode) {
  const dim = world.getDimension("overworld");
  try {
    const fallDepth = (mode === "XP") ? 22 : 32; // موصى به: XP=22, AUTO=32
    const half = 7; // برج خارجي 15x15
    // بناء الغلاف الخارجي والهواء الداخلي
    await dim.runCommandAsync(`fill ${x-half} ${y+2} ${z-half} ${x+half} ${y+40} ${z+half} cobblestone`);
    await dim.runCommandAsync(`fill ${x-half+1} ${y+3} ${z-half+1} ${x+half-1} ${y+39} ${z+half-1} air`);
    // chest & hopper تجميع في القاع
    await dim.runCommandAsync(`setblock ${x} ${y} ${z} chest`);
    await dim.runCommandAsync(`setblock ${x} ${y-1} ${z} hopper`);
    // طوابق توليد: 5 طوابق، كل 6 بلوكات تقريباً
    const floors = 5;
    let topY = y + 36;
    for (let f = 0; f < floors; f++) {
      const fy = topY - f * 6;
      await dim.runCommandAsync(`fill ${x-half+2} ${fy} ${z-half+2} ${x+half-2} ${fy} ${z+half-2} stone`);
      // مصادر ماء عند الحواف تدفع للوسط
      await dim.runCommandAsync(`setblock ${x-half+2} ${fy} ${z} water`);
      await dim.runCommandAsync(`setblock ${x+half-2} ${fy} ${z} water`);
      await dim.runCommandAsync(`setblock ${x} ${fy} ${z-half+2} water`);
      await dim.runCommandAsync(`setblock ${x} ${fy} ${z+half-2} water`);
      await dim.runCommandAsync(`fill ${x-half+2} ${fy+3} ${z-half+2} ${x+half-2} ${fy+3} ${z+half-2} stone`);
    }
    // إنشاء عمود السقوط بالمقاس المطلوب
    const holeMinX = x - Math.floor(holeSize/2);
    const holeMinZ = z - Math.floor(holeSize/2);
    await dim.runCommandAsync(`fill ${holeMinX} ${y+3} ${holeMinZ} ${holeMinX + holeSize - 1} ${y+2+fallDepth} ${holeMinZ + holeSize - 1} air`);
    // لافتة ارشادية
    await dim.runCommandAsync(`setblock ${x+2} ${y+1} ${z} oak_sign 0 replace {"Text":"{\\"text\\":\\"§b[Mob Trap - ${mode} - ${holeSize}x${holeSize}]\\",\\"color\\":\\"blue\\"}"}`);
    await player.runCommandAsync(`tellraw @s {"rawtext":[{"text":"§2✅ Mob Trap بني (hole ${holeSize}x${holeSize}, mode ${mode}, depth ${fallDepth}). افعل AFK/اختبر الآن."}]}`);
  } catch (e) {
    console.warn("BOLTX buildMobTrap error:", e);
  }
}

// Enderman farm builder (مبسّط)
async function buildEndermanFarm(player, x, y, z, holeSize = 2, mode = "XP") {
  const dim = world.getDimension("overworld");
  try {
    const fallDepth = (mode === "XP") ? 22 : 32;
    const half = 10; // برج عرض 21x21 تقريباً
    // بناء الغلاف وافراغ الداخل
    await dim.runCommandAsync(`fill ${x-half} ${y+4} ${z-half} ${x+half} ${y+40} ${z+half} cobblestone`);
    await dim.runCommandAsync(`fill ${x-half+1} ${y+5} ${z-half+1} ${x+half-1} ${y+39} ${z+half-1} air`);
    // بناء منصات توليد متعددة - ثلاث طوابق نموذجية
    const floors = 4;
    for (let i = 0; i < floors; i++) {
      const fy = y + 34 - i*6;
      await dim.runCommandAsync(`fill ${x-half+2} ${fy} ${z-half+2} ${x+half-2} ${fy} ${z+half-2} stone`);
      // ضع مصادر ماء على الحواف (تدفع الوحوش إلى ممرات داخلية) — إعداد بسيط
      await dim.runCommandAsync(`setblock ${x-half+3} ${fy} ${z} water`);
      await dim.runCommandAsync(`setblock ${x+half-3} ${fy} ${z} water`);
      await dim.runCommandAsync(`setblock ${x} ${fy} ${z-half+3} water`);
      await dim.runCommandAsync(`setblock ${x} ${fy} ${z+half-3} water`);
      // سقف لضمان الظلمة
      await dim.runCommandAsync(`fill ${x-half+2} ${fy+3} ${z-half+2} ${x+half-2} ${fy+3} ${z+half-2} stone`);
    }
    // فتحة المركز: holeSize x holeSize وصولا لعمق fallDepth
    const holeMinX = x - Math.floor(holeSize/2);
    const holeMinZ = z - Math.floor(holeSize/2);
    await dim.runCommandAsync(`fill ${holeMinX} ${y+5} ${holeMinZ} ${holeMinX + holeSize -1} ${y+4+fallDepth} ${holeMinZ + holeSize -1} air`);
    // صندوق جمع أسفل الفتحة
    await dim.runCommandAsync(`setblock ${x} ${y} ${z} chest`);
    await dim.runCommandAsync(`setblock ${x} ${y-1} ${z} hopper`);
    // لافتة تنبيه لمستخدم السكربت
    await dim.runCommandAsync(`setblock ${x+2} ${y+1} ${z} oak_sign 0 replace {"Text":"{\\"text\\":\\"§b[Enderman Farm built — الأفضل داخل The End]\\",\\"color\\":\\"blue\\"}"}`);
    await player.runCommandAsync(`tellraw @s {"rawtext":[{"text":"§2✅ Enderman Farm مبني. الأفضل تفعيله داخل الـEnd - اذهب الى The End وانصب نفسك AFK في منصّة مركزية."}]}`);
  } catch (e) {
    console.warn("BOLTX buildEndermanFarm error:", e);
  }
}
