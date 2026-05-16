// ═══════════════════════════════════════════════════════════════════
//  TN-GridSense Backend — Economic & ROI Engine (Phase 3)
//  Cost modeling, savings projections, payback analysis
// ═══════════════════════════════════════════════════════════════════

// ─── Cost Constants (₹ INR) ──────────────────────────────────

const COSTS = {
    // Per-pole hardware
    HARDWARE_BOM: 2500,           // ESP32 + sensors + enclosure
    INSTALLATION: 1500,           // Field crew labor
    COMM_MONTHLY: 200,            // WiFi/cellular subscription

    // Transformer failure costs
    AVG_TRANSFORMER_COST: 350000, // Average distribution transformer (₹3.5L)
    OUTAGE_COST_PER_HOUR: 50000,  // Revenue loss + penalty per hour
    AVG_OUTAGE_HOURS: 8,          // Average outage duration
    AVG_AFFECTED_CONSUMERS: 200,  // Per transformer

    // Annual costs
    MAINTENANCE_PER_POLE_YEAR: 500,  // Cleaning, calibration
    BACKEND_INFRA_MONTHLY: 25000,    // Cloud/server costs

    // TNEB metrics
    TN_ANNUAL_REVENUE_CR: 40000,     // ₹40,000 Crore annual revenue
    TN_CURRENT_ATC_LOSS: 18,         // 18% current AT&C loss
    TRANSFORMER_FAILURE_RATE: 0.08,  // 8% annual failure rate
    TN_TOTAL_TRANSFORMERS: 500000,   // ~5 lakh distribution transformers

    // GridSense improvement factors
    FAILURE_REDUCTION: 0.35,         // 35% reduction in failures
    DIAGNOSTIC_TIME_SAVED_HOURS: 3,  // Hours saved per dispatch
    DISPATCHES_PER_YEAR_PER_1000: 120, // Avg dispatches per 1000 poles/year
    CREW_HOURLY_RATE: 800,           // Field crew cost per hour
};

// ─── Types ───────────────────────────────────────────────────

export interface CostModel {
    poles: number;
    breakdown: {
        hardware: number;
        installation: number;
        annualComm: number;
        annualMaintenance: number;
        annualInfra: number;
        totalCapex: number;
        totalAnnualOpex: number;
    };
    perPole: {
        capex: number;
        annualOpex: number;
    };
}

export interface SavingsProjection {
    poles: number;
    currentLossPercent: number;
    scenarios: {
        conservative: SavingsScenario;  // 1% recovery
        moderate: SavingsScenario;      // 2% recovery
        optimistic: SavingsScenario;    // 3% recovery
    };
    transformerSavings: {
        currentAnnualFailures: number;
        preventedFailures: number;
        annualSavingsCr: number;
    };
    dispatchSavings: {
        dispatchesPerYear: number;
        hoursSaved: number;
        annualSavingsCr: number;
    };
}

interface SavingsScenario {
    recoveryPercent: number;
    annualRecoveryCr: number;
    monthlyRecoveryCr: number;
}

export interface PaybackAnalysis {
    poles: number;
    discountRate: number;
    totalCapex: number;
    annualSavings: number;
    simplePaybackMonths: number;
    npvYear5: number;
    roiYear5Percent: number;
    yearByYear: YearProjection[];
}

interface YearProjection {
    year: number;
    cumulativeCost: number;
    cumulativeSavings: number;
    netPosition: number;
    npv: number;
}

export interface BeforeAfterComparison {
    metric: string;
    unit: string;
    withoutGridSense: number[];  // 5 years
    withGridSense: number[];     // 5 years
    savingsYear5: number;
}

// ─── Cost Model Calculator ───────────────────────────────────

export function calculateCostModel(poles: number): CostModel {
    const hardware = poles * COSTS.HARDWARE_BOM;
    const installation = poles * COSTS.INSTALLATION;
    const annualComm = poles * COSTS.COMM_MONTHLY * 12;
    const annualMaintenance = poles * COSTS.MAINTENANCE_PER_POLE_YEAR;
    const annualInfra = COSTS.BACKEND_INFRA_MONTHLY * 12;

    const totalCapex = hardware + installation;
    const totalAnnualOpex = annualComm + annualMaintenance + annualInfra;

    return {
        poles,
        breakdown: {
            hardware,
            installation,
            annualComm,
            annualMaintenance,
            annualInfra,
            totalCapex,
            totalAnnualOpex,
        },
        perPole: {
            capex: Math.round(totalCapex / poles),
            annualOpex: Math.round(totalAnnualOpex / poles),
        },
    };
}

// ─── AT&C Savings Calculator ─────────────────────────────────

export function calculateSavings(
    poles: number,
    currentLossPercent: number = COSTS.TN_CURRENT_ATC_LOSS
): SavingsProjection {
    const annualRevenue = COSTS.TN_ANNUAL_REVENUE_CR;

    // Scale factor: poles / total state transformers
    const coverageFactor = Math.min(1, poles / COSTS.TN_TOTAL_TRANSFORMERS);

    const makeScenario = (recoveryPct: number): SavingsScenario => ({
        recoveryPercent: recoveryPct,
        annualRecoveryCr: Math.round(annualRevenue * (recoveryPct / 100) * coverageFactor * 10) / 10,
        monthlyRecoveryCr: Math.round(annualRevenue * (recoveryPct / 100) * coverageFactor / 12 * 10) / 10,
    });

    // Transformer failure savings
    const monitoredTransformers = poles; // 1 pole ≈ 1 transformer
    const currentAnnualFailures = Math.round(monitoredTransformers * COSTS.TRANSFORMER_FAILURE_RATE);
    const preventedFailures = Math.round(currentAnnualFailures * COSTS.FAILURE_REDUCTION);
    const failureSavings = preventedFailures * (
        COSTS.AVG_TRANSFORMER_COST +
        COSTS.OUTAGE_COST_PER_HOUR * COSTS.AVG_OUTAGE_HOURS
    );

    // Dispatch savings
    const dispatchesPerYear = Math.round(poles / 1000 * COSTS.DISPATCHES_PER_YEAR_PER_1000);
    const hoursSaved = dispatchesPerYear * COSTS.DIAGNOSTIC_TIME_SAVED_HOURS;
    const dispatchSav = hoursSaved * COSTS.CREW_HOURLY_RATE;

    return {
        poles,
        currentLossPercent,
        scenarios: {
            conservative: makeScenario(1),
            moderate: makeScenario(2),
            optimistic: makeScenario(3),
        },
        transformerSavings: {
            currentAnnualFailures,
            preventedFailures,
            annualSavingsCr: Math.round(failureSavings / 1e7 * 100) / 100, // Convert to Cr
        },
        dispatchSavings: {
            dispatchesPerYear,
            hoursSaved,
            annualSavingsCr: Math.round(dispatchSav / 1e7 * 100) / 100,
        },
    };
}

// ─── Payback Period Engine ───────────────────────────────────

export function calculatePayback(
    poles: number,
    discountRate: number = 10  // percent
): PaybackAnalysis {
    const cost = calculateCostModel(poles);
    const savings = calculateSavings(poles);

    const totalCapex = cost.breakdown.totalCapex;
    const annualOpex = cost.breakdown.totalAnnualOpex;

    // Use moderate AT&C savings + transformer + dispatch savings
    const annualSavings = (
        savings.scenarios.moderate.annualRecoveryCr * 1e7 +
        savings.transformerSavings.annualSavingsCr * 1e7 +
        savings.dispatchSavings.annualSavingsCr * 1e7
    );

    const netAnnualBenefit = annualSavings - annualOpex;

    // Simple payback
    const simplePaybackMonths = netAnnualBenefit > 0
        ? Math.round(totalCapex / netAnnualBenefit * 12)
        : 999;

    // Year-by-year projection with NPV
    const r = discountRate / 100;
    const yearByYear: YearProjection[] = [];
    let cumulativeCost = totalCapex;
    let cumulativeSavings = 0;
    let npvTotal = -totalCapex;

    for (let year = 1; year <= 5; year++) {
        cumulativeCost += annualOpex;
        cumulativeSavings += annualSavings;
        const discountFactor = 1 / Math.pow(1 + r, year);
        npvTotal += (annualSavings - annualOpex) * discountFactor;

        yearByYear.push({
            year,
            cumulativeCost: Math.round(cumulativeCost),
            cumulativeSavings: Math.round(cumulativeSavings),
            netPosition: Math.round(cumulativeSavings - cumulativeCost),
            npv: Math.round(npvTotal),
        });
    }

    return {
        poles,
        discountRate,
        totalCapex,
        annualSavings: Math.round(annualSavings),
        simplePaybackMonths,
        npvYear5: Math.round(npvTotal),
        roiYear5Percent: Math.round((npvTotal / totalCapex) * 100),
        yearByYear,
    };
}

// ─── Before vs After Comparison ──────────────────────────────

export function calculateComparison(poles: number): BeforeAfterComparison[] {
    const cost = calculateCostModel(poles);
    const savings = calculateSavings(poles);
    const coverageFactor = Math.min(1, poles / COSTS.TN_TOTAL_TRANSFORMERS);

    const metrics: BeforeAfterComparison[] = [];

    // AT&C Loss %
    metrics.push({
        metric: "AT&C Loss",
        unit: "%",
        withoutGridSense: [18, 18, 17.8, 17.5, 17.3],
        withGridSense: [18, 16.5, 15.5, 14.8, 14.2],
        savingsYear5: 3.1,
    });

    // Annual Transformer Failures
    const baseFailures = Math.round(COSTS.TN_TOTAL_TRANSFORMERS * COSTS.TRANSFORMER_FAILURE_RATE * coverageFactor);
    const reduced = Math.round(baseFailures * (1 - COSTS.FAILURE_REDUCTION));
    metrics.push({
        metric: "Transformer Failures",
        unit: "per year",
        withoutGridSense: [baseFailures, baseFailures, baseFailures + 50, baseFailures + 100, baseFailures + 150],
        withGridSense: [baseFailures, reduced + 20, reduced, reduced - 10, reduced - 20],
        savingsYear5: baseFailures + 150 - (reduced - 20),
    });

    // Outage Hours
    const baseOutageHours = baseFailures * COSTS.AVG_OUTAGE_HOURS;
    const reducedOutageHours = reduced * 4; // Faster resolution with GridSense
    metrics.push({
        metric: "Annual Outage Hours",
        unit: "hours",
        withoutGridSense: [baseOutageHours, baseOutageHours + 100, baseOutageHours + 200, baseOutageHours + 300, baseOutageHours + 400],
        withGridSense: [baseOutageHours, reducedOutageHours + 50, reducedOutageHours, reducedOutageHours - 50, reducedOutageHours - 100],
        savingsYear5: (baseOutageHours + 400) - (reducedOutageHours - 100),
    });

    // Maintenance Cost (₹ Lakhs)
    const baseMaintCostLakh = Math.round(baseFailures * COSTS.AVG_TRANSFORMER_COST / 1e5);
    const reducedMaintLakh = Math.round(reduced * COSTS.AVG_TRANSFORMER_COST / 1e5);
    metrics.push({
        metric: "Maintenance Cost",
        unit: "₹ Lakhs/year",
        withoutGridSense: [baseMaintCostLakh, baseMaintCostLakh + 20, baseMaintCostLakh + 40, baseMaintCostLakh + 60, baseMaintCostLakh + 80],
        withGridSense: [baseMaintCostLakh, reducedMaintLakh + 10, reducedMaintLakh, reducedMaintLakh - 5, reducedMaintLakh - 10],
        savingsYear5: (baseMaintCostLakh + 80) - (reducedMaintLakh - 10),
    });

    // Revenue Recovery (₹ Crores)
    const annualRecovery = savings.scenarios.moderate.annualRecoveryCr;
    metrics.push({
        metric: "Revenue Recovered",
        unit: "₹ Crores/year",
        withoutGridSense: [0, 0, 0, 0, 0],
        withGridSense: [0, annualRecovery * 0.5, annualRecovery * 0.8, annualRecovery, annualRecovery * 1.1],
        savingsYear5: Math.round(annualRecovery * 1.1 * 10) / 10,
    });

    return metrics;
}

console.log("✔ Economic & ROI Engine Initialized");
