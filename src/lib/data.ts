import { CATEGORIES } from "./categories";
import { addDays, addMonths, daysInMonth, diffDays, startOfDay, startOfMonth, toISODate } from "./dates";
import { createRng } from "./random";
import type { AccountId, CategoryId, Dataset, Transaction } from "./types";

const SEED = 20_250_611;
const HISTORY_MONTHS = 24;

interface Trip {
  start: Date;
  nights: number;
  place: string;
  flight: boolean;
  lodging: string;
  lodgingRange: [number, number];
  flightRange: [number, number];
}

interface AddOptions {
  hour?: number;
  recurring?: boolean;
  note?: string;
}

/**
 * Generates ~25 months of realistic, deterministic personal-finance activity
 * ending today: paychecks, freelance gigs, rent, seasonal utilities, weekly
 * groceries, coffee habits, weekend dining, holiday shopping spikes,
 * subscriptions and pre-booked trips.
 */
export function generateDataset(now: Date = new Date()): Dataset {
  const rng = createRng(SEED);
  const end = startOfDay(now);
  const start = startOfMonth(addMonths(end, -HISTORY_MONTHS));
  const txs: Transaction[] = [];
  let seq = 0;

  const add = (day: Date, category: CategoryId, merchant: string, amount: number, account: AccountId, opts: AddOptions = {}) => {
    const date = new Date(day);
    date.setHours(opts.hour ?? rng.int(8, 21), rng.int(0, 59), rng.int(0, 59), 0);
    const age = diffDays(date, end);
    const pending = age <= 2 && rng.chance(opts.recurring ? 0.15 : 0.55);
    if (date.getTime() > now.getTime() || amount <= 0) return; // nothing from the future
    seq += 1;
    txs.push({
      id: `TX-${String(100000 + seq)}`,
      date,
      merchant,
      category,
      account,
      type: CATEGORIES[category].type,
      amount: Math.round(amount * 100) / 100,
      status: pending ? "pending" : "cleared",
      recurring: Boolean(opts.recurring),
      note: opts.note,
    });
  };

  /** Mostly credit card, sometimes cash or debit. */
  const card = (cashChance = 0.06): AccountId => {
    const r = rng.next();
    if (r < cashChance) return "cash";
    if (r < cashChance + 0.07) return "checking";
    return "credit";
  };

  // ---- Pre-plan trips (summer vacation, December family visit, two weekend getaways per year)
  const trips: Trip[] = [];
  for (let y = start.getFullYear(); y <= end.getFullYear() + 1; y++) {
    trips.push({
      start: new Date(y, 6, rng.int(5, 20)),
      nights: rng.int(5, 8),
      place: rng.pick(["Lisbon", "Maui", "Mexico City", "Kyoto", "Barcelona"]),
      flight: true,
      lodging: "Airbnb",
      lodgingRange: [680, 1280],
      flightRange: [390, 840],
    });
    trips.push({
      start: new Date(y, 11, rng.int(19, 22)),
      nights: rng.int(4, 6),
      place: "Chicago",
      flight: true,
      lodging: "Marriott",
      lodgingRange: [320, 560],
      flightRange: [260, 490],
    });
    trips.push({
      start: new Date(y, 3, rng.int(8, 24)),
      nights: 2,
      place: "Lake Tahoe",
      flight: false,
      lodging: "Airbnb",
      lodgingRange: [340, 520],
      flightRange: [0, 0],
    });
    trips.push({
      start: new Date(y, 9, rng.int(4, 22)),
      nights: 2,
      place: "Napa Valley",
      flight: false,
      lodging: "Hyatt Regency",
      lodgingRange: [380, 610],
      flightRange: [0, 0],
    });
  }
  const tripDays = new Map<string, Trip>();
  const bookingDays = new Map<string, Trip>();
  for (const trip of trips) {
    if (trip.flight) bookingDays.set(toISODate(addDays(trip.start, -rng.int(28, 52))), trip);
    for (let i = 0; i <= trip.nights; i++) tripDays.set(toISODate(addDays(trip.start, i)), trip);
  }

  let nextGas = addDays(start, rng.int(1, 6));

  for (let day = new Date(start); day <= end; day = addDays(day, 1)) {
    const dom = day.getDate();
    const dow = day.getDay();
    const month = day.getMonth();
    const lastDom = daysInMonth(day);
    const weekend = dow === 0 || dow === 6;
    const elapsed = (day.getFullYear() - start.getFullYear()) * 12 + (month - start.getMonth());
    const creep = 1 + elapsed * 0.006; // gentle lifestyle inflation
    const key = toISODate(day);
    const trip = tripDays.get(key);
    const away = Boolean(trip);

    // ───────────── Income
    if (dom === 1 || dom === 15) {
      add(day, "salary", "Northwind Labs Payroll", elapsed >= 13 ? 2876.42 : 2712.18, "checking", {
        hour: 6,
        recurring: true,
        note: "Direct deposit",
      });
    }
    if (!weekend && rng.chance(0.032)) {
      add(day, "freelance", rng.pick(["Upwork", "Stripe Payout", "Studio Nine LLC", "Bloom & Co.", "Fiverr"]), rng.money(180, 1250), "checking", {
        note: "Client project",
      });
    }
    if (dom === lastDom) {
      add(day, "investments", "HYSA Interest", 12 + elapsed * 0.85 + rng.float(0, 6), "savings", {
        hour: 5,
        recurring: true,
        note: "Monthly interest",
      });
    }
    if ((month === 2 || month === 5 || month === 8 || month === 11) && dom === 20) {
      add(day, "investments", "Vanguard Dividends", rng.money(150, 430), "savings", { hour: 7, note: "Quarterly dividend" });
    }
    if (rng.chance(0.016)) {
      const p2p = rng.chance(0.4);
      add(
        day,
        "refunds",
        p2p ? rng.pick(["Venmo · Sam K.", "Zelle · Priya R.", "Venmo · Jordan"]) : rng.pick(["Amazon Refund", "Target Return", "REI Return"]),
        rng.money(14, 120),
        p2p ? "checking" : "credit",
        { note: p2p ? "Split repayment" : "Refund" },
      );
    }

    // ───────────── Housing
    if (dom === 1) {
      add(day, "housing", "Parkside Apartments", elapsed >= 12 ? 1725 : 1650, "checking", { hour: 9, recurring: true, note: "Rent · Autopay" });
    }
    if (dom === 5) add(day, "housing", "Lemonade Insurance", 17.5, "credit", { hour: 9, recurring: true, note: "Renter's insurance" });
    if (rng.chance(0.006)) {
      add(day, "housing", rng.pick(["Home Depot", "Ace Hardware", "TaskRabbit"]), rng.money(25, 180), card(), { note: "Home upkeep" });
    }

    // ───────────── Utilities (electric peaks in winter & summer)
    if (dom === 8) {
      const seasonal = 0.5 + 0.5 * Math.cos((2 * Math.PI * month) / 6);
      add(day, "utilities", "PG&E Electric", 58 + 56 * seasonal + rng.float(-7, 9), "credit", { hour: 10, recurring: true, note: "Autopay" });
    }
    if (dom === 12) add(day, "utilities", "Xfinity Internet", 69.99, "checking", { hour: 10, recurring: true, note: "Autopay" });
    if (dom === 18) add(day, "utilities", "Verizon Wireless", 85 + rng.float(0, 4), "checking", { hour: 10, recurring: true, note: "Autopay" });
    if (dom === 22 && month % 2 === 0) {
      add(day, "utilities", "City Water & Sewer", rng.money(52, 78), "checking", { hour: 10, recurring: true, note: "Bi-monthly bill" });
    }

    // ───────────── Groceries
    if (!away) {
      if (dow === 0 && rng.chance(0.82)) {
        add(
          day,
          "groceries",
          rng.weighted([
            ["Whole Foods Market", 3],
            ["Trader Joe's", 4],
            ["Safeway", 2],
          ] as const),
          rng.money(62, 148) * creep,
          card(0.02),
          { hour: rng.int(10, 17), note: "Weekly shop" },
        );
      }
      if ((dow === 3 || dow === 4) && rng.chance(0.33)) {
        add(day, "groceries", rng.pick(["Trader Joe's", "Safeway", "Sprouts Farmers Market", "Corner Market"]), rng.money(14, 54) * creep, card(0.1), {
          hour: rng.int(17, 20),
        });
      }
      if (dow === 6 && dom <= 7 && month % 2 === 0) {
        add(day, "groceries", "Costco Wholesale", rng.money(150, 290) * creep, "credit", { hour: rng.int(10, 15), note: "Bulk run" });
      }
    }

    // ───────────── Dining
    if (!away) {
      if (!weekend && rng.chance(0.42)) {
        add(
          day,
          "dining",
          rng.weighted([
            ["Starbucks", 4],
            ["Blue Bottle Coffee", 2],
            ["Philz Coffee", 2],
          ] as const),
          rng.money(4.75, 8.95),
          card(0.15),
          { hour: rng.int(7, 9) },
        );
      }
      if (!weekend && rng.chance(0.3)) {
        add(day, "dining", rng.pick(["Chipotle", "Sweetgreen", "Panera Bread", "Tender Greens", "Pho Saigon", "Mendocino Farms"]), rng.money(10.5, 18.5) * creep, card(0.1), {
          hour: rng.int(12, 13),
        });
      }
      if (rng.chance(weekend ? 0.36 : 0.12)) {
        const delivery = rng.chance(0.4);
        add(
          day,
          "dining",
          delivery
            ? rng.pick(["DoorDash", "Uber Eats"])
            : rng.pick(["Nopa", "Tacos El Gordo", "Sushi Ran", "Tartine Bakery", "Delfina", "Burma Superstar", "Little Star Pizza"]),
          (delivery ? rng.money(22, 48) : rng.money(34, 118)) * creep,
          card(0.05),
          { hour: rng.int(18, 21), note: delivery ? "Delivery" : undefined },
        );
      }
    }

    // ───────────── Transport
    if (!away && day >= nextGas) {
      add(
        day,
        "transport",
        rng.weighted([
          ["Shell", 3],
          ["Chevron", 3],
          ["Arco", 2],
        ] as const),
        rng.money(38, 62) * (1 + elapsed * 0.004),
        "credit",
        { hour: rng.int(7, 19), note: "Fuel" },
      );
      nextGas = addDays(day, rng.int(8, 12));
    }
    if (rng.chance(weekend ? 0.12 : 0.06)) add(day, "transport", rng.pick(["Uber", "Lyft"]), rng.money(11, 38), "credit", { hour: rng.int(8, 23) });
    if (!away && !weekend && rng.chance(0.05)) add(day, "transport", "Clipper Card", rng.pick([20, 25, 40]), "credit", { hour: 8, note: "Transit reload" });
    if (!away && rng.chance(0.05)) add(day, "transport", rng.pick(["SpotHero Parking", "City Parking Meter"]), rng.money(4, 26), card(0.3));
    if (dom === 25) add(day, "transport", "GEICO Auto Insurance", 118.4, "checking", { hour: 9, recurring: true, note: "Autopay" });
    if (rng.chance(0.004)) {
      const big = rng.chance(0.4);
      add(day, "transport", big ? "Firestone Auto Care" : "Jiffy Lube", big ? rng.money(160, 420) : rng.money(65, 120), "credit", { note: "Car maintenance" });
    }

    // ───────────── Shopping (holiday + Prime Day spikes)
    const holiday = month === 10 ? 1.7 : month === 11 ? 2.1 : month === 6 ? 1.25 : 1;
    if (rng.chance(0.07 * holiday)) add(day, "shopping", "Amazon", rng.money(12, 120), "credit", { hour: rng.int(9, 23) });
    if (!away && rng.chance(0.04 * holiday)) add(day, "shopping", "Target", rng.money(22, 110), "credit");
    if (!away && rng.chance(0.028 * holiday)) {
      const store = rng.pick(["Uniqlo", "IKEA", "Best Buy", "REI", "Sephora", "Etsy", "H&M", "Nordstrom Rack"]);
      const big = store === "IKEA" || store === "Best Buy" || store === "REI";
      add(day, "shopping", store, big ? rng.money(60, 340) : rng.money(24, 140), "credit", {
        note: holiday > 1.5 && rng.chance(0.5) ? "Holiday gifts" : undefined,
      });
    }
    if (rng.chance(0.0035)) add(day, "shopping", "Apple Store", rng.pick([129, 199, 249, 349, 999, 1299]), "credit", { note: "Electronics" });

    // ───────────── Entertainment & subscriptions
    if (dom === 3) add(day, "entertainment", "Netflix", 15.49, "credit", { hour: 4, recurring: true, note: "Subscription" });
    if (dom === 9) add(day, "entertainment", "Spotify Premium", 11.99, "credit", { hour: 4, recurring: true, note: "Subscription" });
    if (dom === 14) add(day, "entertainment", "Disney+", 13.99, "credit", { hour: 4, recurring: true, note: "Subscription" });
    if (dom === 27) add(day, "entertainment", "iCloud+ Storage", 2.99, "credit", { hour: 4, recurring: true, note: "Subscription" });
    if (elapsed >= 8 && dom === 19) add(day, "entertainment", "YouTube Premium", 13.99, "credit", { hour: 4, recurring: true, note: "Subscription" });
    if (!away && weekend && rng.chance(0.08)) add(day, "entertainment", "AMC Theatres", rng.money(16, 44), "credit", { hour: rng.int(14, 21) });
    if (rng.chance(0.011)) add(day, "entertainment", "Ticketmaster", rng.money(58, 240), "credit", { note: "Live event" });
    if (rng.chance(0.02)) {
      add(day, "entertainment", rng.pick(["Steam", "PlayStation Store", "Nintendo eShop"]), rng.pick([9.99, 19.99, 29.99, 59.99, 69.99]), "credit", {
        hour: rng.int(18, 23),
      });
    }
    if (rng.chance(0.015)) add(day, "entertainment", rng.pick(["Kindle Store", "Barnes & Noble", "Audible"]), rng.money(6, 32), "credit");

    // ───────────── Health & fitness
    if (dom === 2) add(day, "health", "Crunch Fitness", 44.99, "credit", { hour: 5, recurring: true, note: "Membership" });
    if (!away && rng.chance(0.04)) add(day, "health", rng.pick(["CVS Pharmacy", "Walgreens"]), rng.money(7, 48), card(0.1));
    if (!away && rng.chance(0.008)) add(day, "health", "One Medical", rng.pick([25, 30, 40]), "credit", { note: "Copay" });
    if ((month === 1 || month === 7) && dom === 16) add(day, "health", "Bright Smile Dental", 125, "credit", { note: "Cleaning copay" });
    if (!away && rng.chance(0.01)) add(day, "health", rng.pick(["ClassPass", "Massage Envy"]), rng.money(18, 95), "credit", { note: "Wellness" });

    // ───────────── Travel
    const booking = bookingDays.get(key);
    if (booking) {
      add(day, "travel", rng.pick(["Delta Air Lines", "United Airlines", "Alaska Airlines"]), rng.money(...booking.flightRange), "credit", {
        hour: rng.int(19, 23),
        note: `Flights · ${booking.place}`,
      });
    }
    if (trip) {
      const note = `Trip · ${trip.place}`;
      const dayIndex = diffDays(trip.start, day);
      if (dayIndex === 0) {
        add(day, "travel", trip.lodging, rng.money(...trip.lodgingRange), "credit", { hour: 15, note });
        if (trip.flight) add(day, "travel", rng.pick(["Hertz", "Enterprise Rent-A-Car"]), rng.money(140, 320), "credit", { hour: 13, note });
        else add(day, "transport", "Chevron", rng.money(44, 66), "credit", { hour: 9, note });
      }
      add(day, "dining", rng.pick(["Harbor Grill", "Night Market", "Trattoria Roma", "Taqueria Central", "Ramen House", "Corner Bistro"]), rng.money(18, 92), "credit", {
        hour: rng.int(12, 21),
        note,
      });
      if (rng.chance(0.45)) {
        add(day, "entertainment", rng.pick(["Museum Pass", "City Walking Tour", "Wine Tasting", "Kayak Rental"]), rng.money(22, 95), "credit", {
          hour: rng.int(10, 16),
          note,
        });
      }
    }
  }

  txs.sort((a, b) => a.date.getTime() - b.date.getTime());
  return { transactions: txs, start, end };
}
