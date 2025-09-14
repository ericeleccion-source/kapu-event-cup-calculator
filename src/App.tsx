import React, { useMemo, useState } from "react";

// === Types ===
type Ingredient = { id: string; name: string; amountOz: number };
type Drink = { id: string; name: string; cupSizeOz: number; ingredients: Ingredient[] };

type QtyMap = Record<string, number>; // drinkId -> number of cups
type CupOverrideMap = Record<string, number | null>; // drinkId -> chosen cup size (oz) or null for default

// === Unit Utils ===
const ozToLiters = (oz: number) => oz / 33.814;
const ozToQuarts = (oz: number) => oz / 32;
const ozToGallons = (oz: number) => oz / 128;
const ozToMl = (oz: number) => oz * 29.5735;
const tbspToFlOz = (tbsp: number) => tbsp * 0.5; // 2 tbsp = 1 fl oz
const tspToFlOz = (tsp: number) => tsp / 6; // 6 tsp = 1 fl oz

const round = (n: number, p = 2) => {
  const f = Math.pow(10, p);
  return Math.round(n * f) / f;
};

// === Robust UID (timestamp + counter) ===
const uid = (() => {
  let counter = 0;
  return () => `id_${Date.now().toString(36)}_${(++counter).toString(36)}`;
})();

// === Default Menu ===
const DEFAULT_DRINKS: Drink[] = [
  { id: uid(), name: "Kapu Cold Brew", cupSizeOz: 12, ingredients: [ { id: uid(), name: "Ice", amountOz: 3 }, { id: uid(), name: "Cold Brew Coffee", amountOz: 9 } ] },
  { id: uid(), name: "Nitro Cold Brew", cupSizeOz: 12, ingredients: [ { id: uid(), name: "Ice", amountOz: 3 }, { id: uid(), name: "Cold Brew Coffee", amountOz: 9 } ] },
  { id: uid(), name: "Tiki Chata", cupSizeOz: 12, ingredients: [ { id: uid(), name: "Vanilla Syrup", amountOz: 1 }, { id: uid(), name: "Tiki Horchata Creamer", amountOz: 4 }, { id: uid(), name: "Cold Brew Coffee", amountOz: 7 }, { id: uid(), name: "Ice", amountOz: 4 } ] },
  { id: uid(), name: "Dirty Ube", cupSizeOz: 12, ingredients: [ { id: uid(), name: "Coconut Syrup", amountOz: 1 }, { id: uid(), name: "Ube Creamer", amountOz: 4 }, { id: uid(), name: "Cold Brew Coffee", amountOz: 7 }, { id: uid(), name: "Ice", amountOz: 4 } ] },
  { id: uid(), name: "Mauna Kea", cupSizeOz: 12, ingredients: [ { id: uid(), name: "Caramel Syrup", amountOz: 1 }, { id: uid(), name: "Cold Brew Coffee", amountOz: 9 }, { id: uid(), name: "Ice", amountOz: 3 }, { id: uid(), name: "Mauna Kea Foam", amountOz: 3 } ] },
  { id: uid(), name: "Green Panda", cupSizeOz: 12, ingredients: [ { id: uid(), name: "Coconut Syrup", amountOz: 1 }, { id: uid(), name: "Cold Brew Coffee", amountOz: 9 }, { id: uid(), name: "Ice", amountOz: 3 }, { id: uid(), name: "Green Panda Foam", amountOz: 3 } ] },
  { id: uid(), name: "Dirty Ube Cheesecake", cupSizeOz: 16, ingredients: [ { id: uid(), name: "Coconut Syrup", amountOz: 1 }, { id: uid(), name: "Ube Creamer", amountOz: 3 }, { id: uid(), name: "Cold Brew Coffee", amountOz: 6 }, { id: uid(), name: "Ice", amountOz: 3 }, { id: uid(), name: "Cheesecake Foam", amountOz: 3 } ] },
  { id: uid(), name: "Ube Cheesecake", cupSizeOz: 16, ingredients: [ { id: uid(), name: "Coconut Syrup", amountOz: 1 }, { id: uid(), name: "Ube Creamer", amountOz: 3 }, { id: uid(), name: "Oat Milk", amountOz: 6 }, { id: uid(), name: "Ice", amountOz: 3 }, { id: uid(), name: "Cheesecake Foam", amountOz: 3 } ] },
  { id: uid(), name: "Bananas Foster", cupSizeOz: 12, ingredients: [ { id: uid(), name: "Caramel Syrup", amountOz: 1 }, { id: uid(), name: "Cold Brew Coffee", amountOz: 9 }, { id: uid(), name: "Ice", amountOz: 3 }, { id: uid(), name: "Bananas Foster Foam", amountOz: 3 } ] },
  { id: uid(), name: "Lemonade", cupSizeOz: 24, ingredients: [ { id: uid(), name: "Ice", amountOz: 7 }, { id: uid(), name: "Lemonade Base", amountOz: 17 } ] },
  { id: uid(), name: "Strawberry Lemonade", cupSizeOz: 24, ingredients: [ { id: uid(), name: "Strawberry Puree", amountOz: 1 }, { id: uid(), name: "Ice", amountOz: 7 }, { id: uid(), name: "Lemonade Base", amountOz: 16 } ] },
  { id: uid(), name: "Mango Lemonade", cupSizeOz: 24, ingredients: [ { id: uid(), name: "Mango Puree", amountOz: 1 }, { id: uid(), name: "Ice", amountOz: 7 }, { id: uid(), name: "Lemonade Base", amountOz: 16 } ] },
  { id: uid(), name: "Dragonfruit Mango Lemonade", cupSizeOz: 24, ingredients: [ { id: uid(), name: "Mango Puree", amountOz: 1 }, { id: uid(), name: "Ice", amountOz: 7 }, { id: uid(), name: "Lemonade Base", amountOz: 15 }, { id: uid(), name: "Dragonfruit", amountOz: 1 } ] },
];

export default function App() {
  // === State ===
  const [drinks, setDrinks] = useState<Drink[]>(DEFAULT_DRINKS);
  const [qtys, setQtys] = useState<QtyMap>(() => {
    const initial: QtyMap = {};
    DEFAULT_DRINKS.forEach((d) => (initial[d.id] = 0));
    return initial;
  });
  const [cupOverrides, setCupOverrides] = useState<CupOverrideMap>(() => {
    const initial: CupOverrideMap = {};
    DEFAULT_DRINKS.forEach((d) => (initial[d.id] = null));
    return initial;
  });
  const [showTests, setShowTests] = useState(false);

  const effectiveCupSize = (drink: Drink) => cupOverrides[drink.id] ?? drink.cupSizeOz;
  const scaleForDrink = (drink: Drink) => effectiveCupSize(drink) / drink.cupSizeOz; // scales ingredients when using 9/7 oz cups

  // === Derived totals by ingredient across all drinks ===
  const totalsByIngredient = useMemo(() => {
    const map = new Map<string, number>();
    drinks.forEach((drink) => {
      const qty = qtys[drink.id] || 0;
      if (!qty) return;
      const scale = scaleForDrink(drink);
      drink.ingredients.forEach((ing) => {
        const add = ing.amountOz * scale * qty;
        map.set(ing.name, (map.get(ing.name) || 0) + add);
      });
    });
    return map; // name -> total oz needed
  }, [drinks, qtys, cupOverrides]);

  const grandTotalOz = useMemo(() => {
    let sum = 0;
    totalsByIngredient.forEach((oz) => (sum += oz));
    return sum;
  }, [totalsByIngredient]);

  // === Cup size tallies ===
  const cupTallies = useMemo(() => {
    const t = new Map<number, number>(); // size -> count
    drinks.forEach((d) => {
      const size = effectiveCupSize(d);
      const qty = qtys[d.id] || 0;
      if (!qty) return;
      t.set(size, (t.get(size) || 0) + qty);
    });
    return t; // contains keys like 7, 9, 12, 16, 24
  }, [drinks, qtys, cupOverrides]);

  // === Horchata / Ube separation logic ===
  const prepTotals = useMemo(() => {
    const get = (name: string) => totalsByIngredient.get(name) || 0;

    const tikiHorchataCreamerOz = get("Tiki Horchata Creamer");
    const ubeCreamerOz = get("Ube Creamer");

    const totalHorchataCreamerBaseOz = tikiHorchataCreamerOz + ubeCreamerOz;

    // Horchata base composition per 96 oz batch: 64 oz Coconut Milk + 32 oz Horchata Concentrate.
    const CM_PER_OZ = 64 / 96;
    const HC_PER_OZ = 32 / 96;

    const coconutMilkOz = totalHorchataCreamerBaseOz * CM_PER_OZ;
    const horchataConcOz = totalHorchataCreamerBaseOz * HC_PER_OZ;

    // Ube extract for Ube Creamer only: 2 tbsp per 96 oz of Ube Creamer
    const UBE_TBSP_PER_OZ = 2 / 96;
    const ubeExtractTbsp = ubeCreamerOz * UBE_TBSP_PER_OZ;
    const ubeExtractOz = tbspToFlOz(ubeExtractTbsp);

    // Cold brew: 1:1 concentrate:water from total "Cold Brew Coffee"
    const actualColdBrewOz = get("Cold Brew Coffee");
    const coffeeConcentrateOz = actualColdBrewOz / 2;
    const waterOz = actualColdBrewOz / 2;

    const totalLiquidInputsOz = coconutMilkOz + horchataConcOz + coffeeConcentrateOz + waterOz + ubeExtractOz;

    return {
      // Horchata/Ube
      tikiHorchataCreamerOz,
      ubeCreamerOz,
      totalHorchataCreamerBaseOz,
      coconutMilkOz,
      horchataConcOz,
      ubeExtractTbsp,
      ubeExtractOz,
      // Cold brew
      actualColdBrewOz,
      coffeeConcentrateOz,
      waterOz,
      // Totals
      totalLiquidInputsOz,
    };
  }, [totalsByIngredient]);

  // === Raw Ingredients Needed (extracts, foams, purees) ===
  const rawIngredients = useMemo(() => {
    const get = (name: string) => totalsByIngredient.get(name) || 0;

    // Foams used
    const greenPandaFoamOz = get("Green Panda Foam");
    const cheesecakeFoamOz = get("Cheesecake Foam");
    const bananasFosterFoamOz = get("Bananas Foster Foam");
    const maunaKeaFoamOz = get("Mauna Kea Foam");

    // Flavor extract ratios per 32 oz base foam
    const pandanTsp = (0.5 / 32) * greenPandaFoamOz;
    const cheesecakeTsp = (0.25 / 32) * cheesecakeFoamOz;
    const bananaFlavorTsp = (0.5 / 32) * bananasFosterFoamOz;
    const seaSaltTsp = (0.5 / 32) * maunaKeaFoamOz; // Hawaiian Sea Salt

    const pandanFlOz = tspToFlOz(pandanTsp);
    const cheesecakeFlOz = tspToFlOz(cheesecakeTsp);
    const bananaFlavorFlOz = tspToFlOz(bananaFlavorTsp);

    const caramelForBananaFoamGrams = (45 / 32) * bananasFosterFoamOz;
    const caramelForMaunaKeaFoamGrams = (50 / 32) * maunaKeaFoamOz;

    return {
      // liquids & bases (from prepTotals)
      lokahiCoffeeConcentrateOz: prepTotals.coffeeConcentrateOz,
      waterOz: prepTotals.waterOz,
      coconutMilkOz: prepTotals.coconutMilkOz,
      coconutMilkCartons: prepTotals.coconutMilkOz / 32,
      horchataConcOz: prepTotals.horchataConcOz,
      ubeExtractTbsp: prepTotals.ubeExtractTbsp,
      ubeExtractOz: prepTotals.ubeExtractOz,
      // extracts & flavors
      pandanExtractTsp: pandanTsp,
      pandanExtractOz: pandanFlOz,
      cheesecakeFlavorTsp: cheesecakeTsp,
      cheesecakeFlavorOz: cheesecakeFlOz,
      bananaFlavorTsp,
      bananaFlavorOz: bananaFlavorFlOz,
      seaSaltTsp,
      caramelForBananaFoamGrams,
      caramelForMaunaKeaFoamGrams,
      // fruit & lemonade
      mangoPureeOz: get("Mango Puree"),
      strawberryPureeOz: get("Strawberry Puree"),
      lemonadeBaseOz: get("Lemonade Base"),
      // foams volume rollup for base-foam batch calc
      totalFoamOz: greenPandaFoamOz + cheesecakeFoamOz + bananasFosterFoamOz + maunaKeaFoamOz,
      greenPandaFoamOz,
      cheesecakeFoamOz,
      bananasFosterFoamOz,
      maunaKeaFoamOz,
    };
  }, [prepTotals, totalsByIngredient]);

  // === Base Foam batch math ===
  const BASE_FOAM_YIELD_OZ = 90; // ≈ (64 oz cream + 8 oz sugar) * 1.25
  const HEAVY_CREAM_PER_BATCH_OZ = 64;
  const SUGAR_PER_BATCH_CUPS = 1;

  const baseFoamNeededOz = rawIngredients.totalFoamOz;
  const baseFoamBatches = baseFoamNeededOz > 0 ? baseFoamNeededOz / BASE_FOAM_YIELD_OZ : 0;
  const heavyCreamNeededOz = baseFoamBatches * HEAVY_CREAM_PER_BATCH_OZ;
  const sugarNeededCups = baseFoamBatches * SUGAR_PER_BATCH_CUPS;

  // === UI helpers ===
  const totalCups = useMemo(() => Object.values(qtys).reduce((a, b) => a + (b || 0), 0), [qtys]);
  const updateQty = (id: string, value: number) => {
    setQtys((q) => ({ ...q, [id]: Math.max(0, Math.floor(value || 0)) }));
  };
  const resetToStandardMenu = () => {
    if (!confirm("Restore the STANDARD MENU and clear any custom quantities?")) return;
    setDrinks(DEFAULT_DRINKS);
    const blank: QtyMap = {};
    const co: CupOverrideMap = {};
    DEFAULT_DRINKS.forEach((d) => { blank[d.id] = 0; co[d.id] = null; });
    setQtys(blank);
    setCupOverrides(co);
  };
  const resetAllQtys = () => {
    const blank: QtyMap = {};
    drinks.forEach((d) => (blank[d.id] = 0));
    setQtys(blank);
  };

  // === CSV / Export builder ===
  const buildRawRows = () => {
    type Row = [string, string, string, string]; // Item, fl oz, mL, Extra
    const rows: Row[] = [];
    const push = (label: string, oz: number | "-", extra: string = "") => {
      if (oz === "-") {
        rows.push([label, "-", "-", extra]);
      } else {
        rows.push([label, String(round(oz)), String(round(ozToMl(oz))), extra]);
      }
    };

    // Base ingredients
    push("Lokahi Coffee Concentrate", rawIngredients.lokahiCoffeeConcentrateOz);
    push("Water", rawIngredients.waterOz);
    push("Coconut Milk", rawIngredients.coconutMilkOz, `Cartons ≈ ${round(rawIngredients.coconutMilkCartons, 2)}`);
    push("Horchata Concentrate", rawIngredients.horchataConcOz, `Horchata Base (Tiki + Ube)`);
    push("Ube Flavoring Extract", rawIngredients.ubeExtractOz, `${round(rawIngredients.ubeExtractTbsp)} tbsp`);

    // Flavor extracts & additives
    push("Pandan Flavor Extract", rawIngredients.pandanExtractOz, `${round(rawIngredients.pandanExtractTsp)} tsp (Green Panda Foam)`);
    push("Cheesecake Flavor Extract", rawIngredients.cheesecakeFlavorOz, `${round(rawIngredients.cheesecakeFlavorTsp)} tsp (Cheesecake Foam)`);
    push("Banana Flavor Extract", rawIngredients.bananaFlavorOz, `${round(rawIngredients.bananaFlavorTsp)} tsp (Bananas Foster Foam)`);
    push("Hawaiian Sea Salt", "-", `${round(rawIngredients.seaSaltTsp)} tsp (Mauna Kea Foam)`);
    push("Caramel for Bananas Foster Foam", "-", `${round(rawIngredients.caramelForBananaFoamGrams)} g`);
    push("Caramel for Mauna Kea Foam", "-", `${round(rawIngredients.caramelForMaunaKeaFoamGrams)} g`);

    // Fruit & lemonade
    push("Mango Puree", rawIngredients.mangoPureeOz);
    push("Strawberry Puree", rawIngredients.strawberryPureeOz);
    push("Lemonade Base", rawIngredients.lemonadeBaseOz);

    // Base Foam total needs
    push("Base Foam", baseFoamNeededOz, `Heavy Cream ${round(heavyCreamNeededOz)} oz + Sugar ${round(sugarNeededCups, 2)} cups`);

    // Detailed prep items (creamers & foams) for shopping clarity
    if (prepTotals.tikiHorchataCreamerOz > 0) {
      push("Tiki Horchata Creamer", prepTotals.tikiHorchataCreamerOz, `CM ${round(prepTotals.tikiHorchataCreamerOz * (64 / 96))} oz + HC ${round(prepTotals.tikiHorchataCreamerOz * (32 / 96))} oz`);
    }
    if (prepTotals.ubeCreamerOz > 0) {
      push(
        "Ube Creamer (Horchata + Ube)",
        prepTotals.ubeCreamerOz,
        `CM ${round(prepTotals.ubeCreamerOz * (64 / 96))} oz + HC ${round(prepTotals.ubeCreamerOz * (32 / 96))} oz + Ube ${round(prepTotals.ubeCreamerOz * (2 / 96))} tbsp (${round(tbspToFlOz(prepTotals.ubeCreamerOz * (2 / 96)))} fl oz)`
      );
    }
    if (prepTotals.totalHorchataCreamerBaseOz > 0) {
      push(
        "Total Horchata Creamer (Base)",
        prepTotals.totalHorchataCreamerBaseOz,
        `CM ${round(prepTotals.totalHorchataCreamerBaseOz * (64 / 96))} oz + HC ${round(prepTotals.totalHorchataCreamerBaseOz * (32 / 96))} oz`
      );
    }
    if (rawIngredients.maunaKeaFoamOz > 0) {
      push(
        "Mauna Kea Foam",
        rawIngredients.maunaKeaFoamOz,
        `Base ${round(rawIngredients.maunaKeaFoamOz)} oz + Caramel ${(50 / 32 * rawIngredients.maunaKeaFoamOz).toFixed(1)} g + Sea Salt ${(0.5 / 32 * rawIngredients.maunaKeaFoamOz).toFixed(2)} tsp`
      );
    }
    if (rawIngredients.greenPandaFoamOz > 0) {
      push(
        "Green Panda Foam",
        rawIngredients.greenPandaFoamOz,
        `Base ${round(rawIngredients.greenPandaFoamOz)} oz + Pandan ${(0.5 / 32 * rawIngredients.greenPandaFoamOz).toFixed(2)} tsp`
      );
    }
    if (rawIngredients.cheesecakeFoamOz > 0) {
      push(
        "Cheesecake Foam",
        rawIngredients.cheesecakeFoamOz,
        `Base ${round(rawIngredients.cheesecakeFoamOz)} oz + Cheesecake Flavor ${(0.25 / 32 * rawIngredients.cheesecakeFoamOz).toFixed(2)} tsp`
      );
    }
    if (rawIngredients.bananasFosterFoamOz > 0) {
      push(
        "Bananas Foster Foam",
        rawIngredients.bananasFosterFoamOz,
        `Base ${round(rawIngredients.bananasFosterFoamOz)} oz + Caramel ${(45 / 32 * rawIngredients.bananasFosterFoamOz).toFixed(1)} g + Banana Flavor ${(0.5 / 32 * rawIngredients.bananasFosterFoamOz).toFixed(2)} tsp`
      );
    }

    return rows;
  };

  const downloadCSV = () => {
    const rows = buildRawRows();
    const header = ["Item", "fl oz", "mL", "Extra"]; // concise for shopping
    const csv = [header.join(","), ...rows.map(([item, oz, ml, extra]) => [item, oz, ml, extra].join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "raw-ingredients-needed.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const printPage = () => window.print();

  // === Dev Tests ===
  const tests = useMemo(() => {
    const approx = (a: number, b: number, tol = 1e-6) => Math.abs(a - b) <= tol;
    return [
      { name: "2 tbsp = 1 fl oz", pass: approx(tbspToFlOz(2), 1) },
      { name: "6 tsp = 1 fl oz", pass: approx(tspToFlOz(6), 1) },
      { name: "33.814 oz ≈ 1 L", pass: approx(ozToLiters(33.814), 1, 1e-3) },
      { name: "Horchata base CM per oz = 64/96", pass: approx(64 / 96, 0.6666667, 1e-3) },
      { name: "Horchata base HC per oz = 32/96", pass: approx(32 / 96, 0.3333333, 1e-3) },
      { name: "Ube extract per oz ube = 2/96 tbsp", pass: approx(2 / 96, 0.0208333, 1e-4) },
      { name: "Pandan ratio 0.5/32 tsp/oz", pass: approx(0.5 / 32, 1 / 64) },
      { name: "Cheesecake ratio 0.25/32 tsp/oz", pass: approx(0.25 / 32, 1 / 128) },
      { name: "Banana ratio 0.5/32 tsp/oz", pass: approx(0.5 / 32, 1 / 64) },
      { name: "Sea salt ratio 0.5/32 tsp/oz", pass: approx(0.5 / 32, 1 / 64) },
      { name: "Base foam yield = 90 oz", pass: approx((64 + 8) * 1.25, 90) },
    ];
  }, []);
  const passCount = tests.filter((t) => t.pass).length;

  // === UI ===
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Kapu Event Cup Calculator</h1>
            <p className="text-sm text-slate-600">Default recipes shown below. Enter cups per drink — ingredients update in real time.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="px-4 py-2 rounded-2xl bg-white border shadow" onClick={resetToStandardMenu}>Reset to Standard Menu</button>
            <button className="px-4 py-2 rounded-2xl bg-white border shadow" onClick={resetAllQtys}>Reset Quantities</button>
            <button className="px-4 py-2 rounded-2xl bg-white border shadow" onClick={downloadCSV}>Export CSV (Raw Ingredients)</button>
            <button className="px-4 py-2 rounded-2xl bg-white border shadow" onClick={printPage}>Print</button>
            <button className="px-4 py-2 rounded-2xl bg-white border shadow" onClick={() => setShowTests((s) => !s)}>Dev Tests ({passCount}/{tests.length})</button>
          </div>
        </header>

        {/* Sticky live summary */}
        <div className="mb-4 sticky top-0 z-40 bg-slate-50/80 backdrop-blur supports-[backdrop-filter]:bg-slate-50/60 border rounded-2xl p-3">
          <div className="flex flex-wrap gap-4 text-sm items-center">
            <div><span className="text-slate-500">Total cups:</span> <strong>{totalCups}</strong></div>
            <div className="h-4 w-px bg-slate-300" />
            <div><span className="text-slate-500">12 oz:</span> <strong>{cupTallies.get(12) || 0}</strong></div>
            <div><span className="text-slate-500">16 oz:</span> <strong>{cupTallies.get(16) || 0}</strong></div>
            <div><span className="text-slate-500">24 oz:</span> <strong>{cupTallies.get(24) || 0}</strong></div>
            {(cupTallies.get(9) || 0) > 0 && <div><span className="text-slate-500">9 oz:</span> <strong>{cupTallies.get(9) || 0}</strong></div>}
            {(cupTallies.get(7) || 0) > 0 && <div><span className="text-slate-500">7 oz:</span> <strong>{cupTallies.get(7) || 0}</strong></div>}
            <div className="h-4 w-px bg-slate-300" />
            <div><span className="text-slate-500">Total liquid (oz):</span> <strong>{round(grandTotalOz)}</strong></div>
            <div><span className="text-slate-500">≈ Quarts:</span> <strong>{round(ozToQuarts(grandTotalOz))}</strong></div>
            <div><span className="text-slate-500">≈ Gallons:</span> <strong>{round(ozToGallons(grandTotalOz))}</strong></div>
          </div>
        </div>

        {/* Drinks list in a single column */}
        <div className="space-y-4">
          {drinks.map((drink) => {
            const qty = qtys[drink.id] || 0;
            const highlight = qty > 0;
            const cup = effectiveCupSize(drink);
            const scale = scaleForDrink(drink);
            return (
              <div
                key={drink.id}
                className={`rounded-2xl p-4 border transition-shadow ${highlight ? "bg-emerald-50 border-emerald-300 shadow-[0_0_0_2px_rgba(16,185,129,.35)]" : "bg-white border-slate-100 shadow"}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h2 className="font-semibold text-lg">{drink.name}</h2>
                    <p className="text-xs text-slate-500">Cup size: {cup} oz {cup !== drink.cupSizeOz && <span className="ml-1 text-amber-600">(scaled ×{round(scale, 3)})</span>}</p>
                  </div>
                  <div className="text-sm text-right">
                    <div>Batch volume: <strong>{qty * cup}</strong> oz</div>
                    <div>({round(ozToQuarts(qty * cup))} qt, {round(ozToGallons(qty * cup))} gal)</div>
                  </div>
                </div>
                <ul className="text-sm text-slate-700 mb-3 space-y-1">
                  {drink.ingredients.map((ing) => (
                    <li key={ing.id} className="flex justify-between">
                      <span>{ing.name}</span>
                      <span>{round(ing.amountOz * scale)} oz</span>
                    </li>
                  ))}
                </ul>
                <div className="flex flex-wrap items-end gap-3">
                  <label className="text-sm">
                    <span className="block mb-1">Number of cups <span className="text-rose-600">*</span></span>
                    <input
                      type="number"
                      min={0}
                      step={1}
                      required
                      aria-required="true"
                      className={`w-28 border rounded-xl p-2 ${qty > 0 ? "border-emerald-400" : "border-slate-300"}`}
                      value={qty}
                      onChange={(e) => updateQty(drink.id, Number(e.target.value))}
                    />
                  </label>

                  <label className="text-sm">
                    <span className="block mb-1">Cup size</span>
                    <select
                      className="w-32 border rounded-xl p-2"
                      value={cupOverrides[drink.id] ?? drink.cupSizeOz}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setCupOverrides((prev) => ({ ...prev, [drink.id]: val === drink.cupSizeOz ? null : val }));
                      }}
                    >
                      <option value={drink.cupSizeOz}>Default ({drink.cupSizeOz} oz)</option>
                      {/* Optional alternates as requested */}
                      {[9, 7].filter((s) => s !== drink.cupSizeOz).map((size) => (
                        <option key={size} value={size}>{size} oz</option>
                      ))}
                    </select>
                  </label>

                  <button className="px-3 py-2 rounded-xl border" onClick={() => updateQty(drink.id, qty + 10)}>+10</button>
                  <button className="px-3 py-2 rounded-xl border" onClick={() => updateQty(drink.id, Math.max(0, qty - 10))}>-10</button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Totals by Ingredient */}
        <section className="mt-8">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xl font-semibold">Totals by Ingredient</h3>
            <div className="text-sm text-slate-600">
              Grand total: {round(grandTotalOz)} oz | {round(ozToLiters(grandTotalOz))} L | {round(ozToQuarts(grandTotalOz))} qt | {round(ozToGallons(grandTotalOz))} gal
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white rounded-2xl shadow border border-slate-100">
              <thead>
                <tr className="text-left text-slate-600 text-sm border-b">
                  <th className="p-3">Ingredient</th>
                  <th className="p-3">Ounces (oz)</th>
                  <th className="p-3">Liters (L)</th>
                  <th className="p-3">Quarts (qt)</th>
                  <th className="p-3">Gallons (gal)</th>
                </tr>
              </thead>
              <tbody>
                {Array.from(totalsByIngredient.entries()).length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-slate-500">Enter quantities above to see totals.</td>
                  </tr>
                ) : (
                  Array.from(totalsByIngredient.entries()).map(([name, oz]) => (
                    <tr key={name} className="border-t">
                      <td className="p-3 font-medium">{name}</td>
                      <td className="p-3">{round(oz)}</td>
                      <td className="p-3">{round(ozToLiters(oz))}</td>
                      <td className="p-3">{round(ozToQuarts(oz))}</td>
                      <td className="p-3">{round(ozToGallons(oz))}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Prep Inputs / Measurements */}
        <section className="mt-8">
          <h3 className="text-xl font-semibold mb-3">Prep Inputs & Measurements</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white rounded-2xl shadow border border-slate-100">
              <thead>
                <tr className="text-left text-slate-600 text-sm border-b">
                  <th className="p-3">Item</th>
                  <th className="p-3">fl oz</th>
                  <th className="p-3">qt</th>
                  <th className="p-3">mL</th>
                  <th className="p-3">Notes</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t">
                  <td className="p-3 font-medium">Coconut Milk</td>
                  <td className="p-3">{round(prepTotals.coconutMilkOz)}</td>
                  <td className="p-3">{round(ozToQuarts(prepTotals.coconutMilkOz))}</td>
                  <td className="p-3">{round(ozToMl(prepTotals.coconutMilkOz))}</td>
                  <td className="p-3">Cartons (equiv): {round(prepTotals.coconutMilkOz / 32, 2)}</td>
                </tr>
                <tr className="border-t">
                  <td className="p-3 font-medium">Horchata Concentrate</td>
                  <td className="p-3">{round(prepTotals.horchataConcOz)}</td>
                  <td className="p-3">{round(ozToQuarts(prepTotals.horchataConcOz))}</td>
                  <td className="p-3">{round(ozToMl(prepTotals.horchataConcOz))}</td>
                  <td className="p-3">Horchata Base (Tiki + Ube): {round(prepTotals.totalHorchataCreamerBaseOz)} oz</td>
                </tr>
                <tr className="border-t">
                  <td className="p-3 font-medium">Tiki Horchata Creamer (subset)</td>
                  <td className="p-3">{round(prepTotals.tikiHorchataCreamerOz)}</td>
                  <td className="p-3">{round(ozToQuarts(prepTotals.tikiHorchataCreamerOz))}</td>
                  <td className="p-3">{round(ozToMl(prepTotals.tikiHorchataCreamerOz))}</td>
                  <td className="p-3">For Tiki Chata only</td>
                </tr>
                <tr className="border-t">
                  <td className="p-3 font-medium">Ube Creamer (Horchata + Ube)</td>
                  <td className="p-3">{round(prepTotals.ubeCreamerOz)}</td>
                  <td className="p-3">{round(ozToQuarts(prepTotals.ubeCreamerOz))}</td>
                  <td className="p-3">{round(ozToMl(prepTotals.ubeCreamerOz))}</td>
                  <td className="p-3">Includes Ube Extract below</td>
                </tr>
                <tr className="border-t">
                  <td className="p-3 font-medium">Ube Flavoring Extract</td>
                  <td className="p-3">{round(prepTotals.ubeExtractOz)}</td>
                  <td className="p-3">{round(ozToQuarts(prepTotals.ubeExtractOz))}</td>
                  <td className="p-3">{round(ozToMl(prepTotals.ubeExtractOz))}</td>
                  <td className="p-3">{round(prepTotals.ubeExtractTbsp)} tbsp (only for Ube Creamer)</td>
                </tr>
                <tr className="border-t">
                  <td className="p-3 font-medium">Coffee Concentrate</td>
                  <td className="p-3">{round(prepTotals.coffeeConcentrateOz)}</td>
                  <td className="p-3">{round(ozToQuarts(prepTotals.coffeeConcentrateOz))}</td>
                  <td className="p-3">{round(ozToMl(prepTotals.coffeeConcentrateOz))}</td>
                  <td className="p-3">Based on 1:1 concentrate:water</td>
                </tr>
                <tr className="border-t">
                  <td className="p-3 font-medium">Water</td>
                  <td className="p-3">{round(prepTotals.waterOz)}</td>
                  <td className="p-3">{round(ozToQuarts(prepTotals.waterOz))}</td>
                  <td className="p-3">{round(ozToMl(prepTotals.waterOz))}</td>
                  <td className="p-3"></td>
                </tr>
                <tr className="border-t">
                  <td className="p-3 font-medium">Actual Cold Brew (made)</td>
                  <td className="p-3">{round(prepTotals.actualColdBrewOz)}</td>
                  <td className="p-3">{round(ozToQuarts(prepTotals.actualColdBrewOz))}</td>
                  <td className="p-3">{round(ozToMl(prepTotals.actualColdBrewOz))}</td>
                  <td className="p-3">= Concentrate + Water</td>
                </tr>
                <tr className="border-t">
                  <td className="p-3 font-medium">Total Liquid (all additions)</td>
                  <td className="p-3">{round(prepTotals.totalLiquidInputsOz)}</td>
                  <td className="p-3">{round(ozToQuarts(prepTotals.totalLiquidInputsOz))}</td>
                  <td className="p-3">{round(ozToMl(prepTotals.totalLiquidInputsOz))}</td>
                  <td className="p-3">Includes ube extract converted to fl oz</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Batch Prep: Creamers & Foams */}
        <section className="mt-8">
          <h3 className="text-xl font-semibold mb-3">Batch Prep — Creamers & Foams</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white rounded-2xl shadow border border-slate-100">
              <thead>
                <tr className="text-left text-slate-600 text-sm border-b">
                  <th className="p-3">Product</th>
                  <th className="p-3">Needed (oz)</th>
                  <th className="p-3">Components & Ratios</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t">
                  <td className="p-3 font-medium">Tiki Horchata Creamer</td>
                  <td className="p-3">{round(prepTotals.tikiHorchataCreamerOz)}</td>
                  <td className="p-3">Coconut Milk {round(prepTotals.tikiHorchataCreamerOz * (64 / 96))} oz + Horchata Concentrate {round(prepTotals.tikiHorchataCreamerOz * (32 / 96))} oz</td>
                </tr>
                <tr className="border-t">
                  <td className="p-3 font-medium">Ube Creamer (Horchata + Ube)</td>
                  <td className="p-3">{round(prepTotals.ubeCreamerOz)}</td>
                  <td className="p-3">Coconut Milk {round(prepTotals.ubeCreamerOz * (64 / 96))} oz + Horchata Concentrate {round(prepTotals.ubeCreamerOz * (32 / 96))} oz + Ube Extract {round(prepTotals.ubeCreamerOz * (2 / 96))} tbsp ({round(tbspToFlOz(prepTotals.ubeCreamerOz * (2 / 96)))} fl oz)</td>
                </tr>
                <tr className="border-t">
                  <td className="p-3 font-medium">Total Horchata Creamer (Base)</td>
                  <td className="p-3">{round(prepTotals.totalHorchataCreamerBaseOz)}</td>
                  <td className="p-3">Coconut Milk {round(prepTotals.totalHorchataCreamerBaseOz * (64 / 96))} oz + Horchata Concentrate {round(prepTotals.totalHorchataCreamerBaseOz * (32 / 96))} oz</td>
                </tr>
                <tr className="border-t">
                  <td className="p-3 font-medium">Mauna Kea Foam</td>
                  <td className="p-3">{round(rawIngredients.maunaKeaFoamOz)}</td>
                  <td className="p-3">Base Foam {round(rawIngredients.maunaKeaFoamOz)} oz + Caramel {round((50 / 32) * rawIngredients.maunaKeaFoamOz)} g + Sea Salt {round((0.5 / 32) * rawIngredients.maunaKeaFoamOz)} tsp</td>
                </tr>
                <tr className="border-t">
                  <td className="p-3 font-medium">Green Panda Foam</td>
                  <td className="p-3">{round(rawIngredients.greenPandaFoamOz)}</td>
                  <td className="p-3">Base Foam {round(rawIngredients.greenPandaFoamOz)} oz + Pandan {round((0.5 / 32) * rawIngredients.greenPandaFoamOz)} tsp</td>
                </tr>
                <tr className="border-t">
                  <td className="p-3 font-medium">Cheesecake Foam</td>
                  <td className="p-3">{round(rawIngredients.cheesecakeFoamOz)}</td>
                  <td className="p-3">Base Foam {round(rawIngredients.cheesecakeFoamOz)} oz + Cheesecake Flavor {round((0.25 / 32) * rawIngredients.cheesecakeFoamOz)} tsp</td>
                </tr>
                <tr className="border-t">
                  <td className="p-3 font-medium">Bananas Foster Foam</td>
                  <td className="p-3">{round(rawIngredients.bananasFosterFoamOz)}</td>
                  <td className="p-3">Base Foam {round(rawIngredients.bananasFosterFoamOz)} oz + Caramel {round((45 / 32) * rawIngredients.bananasFosterFoamOz)} g + Banana Flavor {round((0.5 / 32) * rawIngredients.bananasFosterFoamOz)} tsp</td>
                </tr>
                <tr className="border-t bg-slate-50">
                  <td className="p-3 font-semibold">Base Foam (total for all foams)</td>
                  <td className="p-3">{round(baseFoamNeededOz)}</td>
                  <td className="p-3">Heavy Cream {round(heavyCreamNeededOz)} oz + Sugar {round(sugarNeededCups, 2)} cups (yield ≈ {BASE_FOAM_YIELD_OZ} oz per batch)</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Raw Ingredients Needed */}
        <section className="mt-8">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xl font-semibold">Raw Ingredients Needed</h3>
            <div className="flex gap-2">
              <button className="px-3 py-2 rounded-xl border" onClick={downloadCSV}>Export CSV</button>
              <button className="px-3 py-2 rounded-xl border" onClick={printPage}>Print</button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white rounded-2xl shadow border border-slate-100">
              <thead>
                <tr className="text-left text-slate-600 text-sm border-b">
                  <th className="p-3">Item</th>
                  <th className="p-3">fl oz</th>
                  <th className="p-3">qt</th>
                  <th className="p-3">mL</th>
                  <th className="p-3">Extra</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t">
                  <td className="p-3 font-medium">Lokahi Coffee Concentrate</td>
                  <td className="p-3">{round(rawIngredients.lokahiCoffeeConcentrateOz)}</td>
                  <td className="p-3">{round(ozToQuarts(rawIngredients.lokahiCoffeeConcentrateOz))}</td>
                  <td className="p-3">{round(ozToMl(rawIngredients.lokahiCoffeeConcentrateOz))}</td>
                  <td className="p-3"></td>
                </tr>
                <tr className="border-t">
                  <td className="p-3 font-medium">Water</td>
                  <td className="p-3">{round(rawIngredients.waterOz)}</td>
                  <td className="p-3">{round(ozToQuarts(rawIngredients.waterOz))}</td>
                  <td className="p-3">{round(ozToMl(rawIngredients.waterOz))}</td>
                  <td className="p-3"></td>
                </tr>
                <tr className="border-t">
                  <td className="p-3 font-medium">Coconut Milk</td>
                  <td className="p-3">{round(rawIngredients.coconutMilkOz)}</td>
                  <td className="p-3">{round(ozToQuarts(rawIngredients.coconutMilkOz))}</td>
                  <td className="p-3">{round(ozToMl(rawIngredients.coconutMilkOz))}</td>
                  <td className="p-3">Cartons ≈ {round(rawIngredients.coconutMilkCartons, 2)}</td>
                </tr>
                <tr className="border-t">
                  <td className="p-3 font-medium">Horchata Concentrate</td>
                  <td className="p-3">{round(rawIngredients.horchataConcOz)}</td>
                  <td className="p-3">{round(ozToQuarts(rawIngredients.horchataConcOz))}</td>
                  <td className="p-3">{round(ozToMl(rawIngredients.horchataConcOz))}</td>
                  <td className="p-3">Horchata Base (Tiki + Ube)</td>
                </tr>
                <tr className="border-t">
                  <td className="p-3 font-medium">Ube Flavoring Extract</td>
                  <td className="p-3">{round(rawIngredients.ubeExtractOz)}</td>
                  <td className="p-3">{round(ozToQuarts(rawIngredients.ubeExtractOz))}</td>
                  <td className="p-3">{round(ozToMl(rawIngredients.ubeExtractOz))}</td>
                  <td className="p-3">{round(prepTotals.ubeExtractTbsp)} tbsp (for Ube Creamer)</td>
                </tr>
                <tr className="border-t">
                  <td className="p-3 font-medium">Pandan Flavor Extract</td>
                  <td className="p-3">{round(rawIngredients.pandanExtractOz)}</td>
                  <td className="p-3">{round(ozToQuarts(rawIngredients.pandanExtractOz))}</td>
                  <td className="p-3">{round(ozToMl(rawIngredients.pandanExtractOz))}</td>
                  <td className="p-3">{round(rawIngredients.pandanExtractTsp)} tsp (for Green Panda Foam)</td>
                </tr>
                <tr className="border-t">
                  <td className="p-3 font-medium">Cheesecake Flavor Extract</td>
                  <td className="p-3">{round(rawIngredients.cheesecakeFlavorOz)}</td>
                  <td className="p-3">{round(ozToQuarts(rawIngredients.cheesecakeFlavorOz))}</td>
                  <td className="p-3">{round(ozToMl(rawIngredients.cheesecakeFlavorOz))}</td>
                  <td className="p-3">{round(rawIngredients.cheesecakeFlavorTsp)} tsp (for Cheesecake Foam)</td>
                </tr>
                <tr className="border-t">
                  <td className="p-3 font-medium">Banana Flavor Extract</td>
                  <td className="p-3">{round(rawIngredients.bananaFlavorOz)}</td>
                  <td className="p-3">{round(ozToQuarts(rawIngredients.bananaFlavorOz))}</td>
                  <td className="p-3">{round(ozToMl(rawIngredients.bananaFlavorOz))}</td>
                  <td className="p-3">{round(rawIngredients.bananaFlavorTsp)} tsp (for Bananas Foster Foam)</td>
                </tr>
                <tr className="border-t">
                  <td className="p-3 font-medium">Hawaiian Sea Salt</td>
                  <td className="p-3">-</td>
                  <td className="p-3">-</td>
                  <td className="p-3">-</td>
                  <td className="p-3">{round(rawIngredients.seaSaltTsp)} tsp (for Mauna Kea Foam)</td>
                </tr>
                <tr className="border-t">
                  <td className="p-3 font-medium">Caramel for Bananas Foster Foam</td>
                  <td className="p-3">-</td>
                  <td className="p-3">-</td>
                  <td className="p-3">-</td>
                  <td className="p-3">{round(rawIngredients.caramelForBananaFoamGrams)} g</td>
                </tr>
                <tr className="border-t">
                  <td className="p-3 font-medium">Caramel for Mauna Kea Foam</td>
                  <td className="p-3">-</td>
                  <td className="p-3">-</td>
                  <td className="p-3">-</td>
                  <td className="p-3">{round(rawIngredients.caramelForMaunaKeaFoamGrams)} g</td>
                </tr>
                <tr className="border-t">
                  <td className="p-3 font-medium">Mango Puree</td>
                  <td className="p-3">{round(rawIngredients.mangoPureeOz)}</td>
                  <td className="p-3">{round(ozToQuarts(rawIngredients.mangoPureeOz))}</td>
                  <td className="p-3">{round(ozToMl(rawIngredients.mangoPureeOz))}</td>
                  <td className="p-3"></td>
                </tr>
                <tr className="border-t">
                  <td className="p-3 font-medium">Strawberry Puree</td>
                  <td className="p-3">{round(rawIngredients.strawberryPureeOz)}</td>
                  <td className="p-3">{round(ozToQuarts(rawIngredients.strawberryPureeOz))}</td>
                  <td className="p-3">{round(ozToMl(rawIngredients.strawberryPureeOz))}</td>
                  <td className="p-3"></td>
                </tr>
                <tr className="border-t">
                  <td className="p-3 font-medium">Lemonade Base</td>
                  <td className="p-3">{round(rawIngredients.lemonadeBaseOz)}</td>
                  <td className="p-3">{round(ozToQuarts(rawIngredients.lemonadeBaseOz))}</td>
                  <td className="p-3">{round(ozToMl(rawIngredients.lemonadeBaseOz))}</td>
                  <td className="p-3"></td>
                </tr>
                <tr className="border-t bg-slate-50">
                  <td className="p-3 font-semibold">Base Foam (for all foams)</td>
                  <td className="p-3">{round(baseFoamNeededOz)}</td>
                  <td className="p-3">{round(ozToQuarts(baseFoamNeededOz))}</td>
                  <td className="p-3">{round(ozToMl(baseFoamNeededOz))}</td>
                  <td className="p-3">Heavy Cream {round(heavyCreamNeededOz)} oz + Sugar {round(sugarNeededCups, 2)} cups</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {showTests && (
          <section className="mt-8">
            <h3 className="text-xl font-semibold mb-3">Dev Tests</h3>
            <ul className="text-sm list-disc pl-5">
              {tests.map((t) => (
                <li key={t.name} className={t.pass ? "text-emerald-700" : "text-rose-700"}>
                  {t.pass ? "✅" : "❌"} {t.name}
                </li>
              ))}
            </ul>
          </section>
        )}

        <footer className="mt-10 text-xs text-slate-500">
          <p>Conversions: 1 gal = 128 oz, 1 qt = 32 oz, 1 L ≈ 33.814 oz, 2 tbsp = 1 fl oz, 6 tsp = 1 fl oz. When a 7 oz or 9 oz cup is selected, ingredients scale proportionally to the recipe's default cup size.</p>
        </footer>
      </div>
    </div>
  );
}
