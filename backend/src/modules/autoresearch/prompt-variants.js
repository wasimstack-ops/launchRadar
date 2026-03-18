/**
 * Autoresearch — Prompt Variants
 *
 * Each variant defines a different scoring configuration to test.
 * The experiment loop scores real ideas with each variant and picks
 * the one that produces the best score quality (variance + distribution).
 */

const VARIANTS = [
  {
    id: 'baseline',
    description: 'Current production weights — the control group',
    temperature: 0.4,
    weights: {
      marketFit: 20,
      problemUrgency: 15,
      distributionPotential: 15,
      technicalFeasibility: 10,
      monetizationClarity: 10,
      defensibility: 10,
      founderAdvantage: 10,
      timing: 10,
    },
  },
  {
    id: 'market-heavy',
    description: 'Heavier weight on market fit and monetization — investor-focused',
    temperature: 0.4,
    weights: {
      marketFit: 25,
      problemUrgency: 12,
      distributionPotential: 12,
      technicalFeasibility: 8,
      monetizationClarity: 15,
      defensibility: 10,
      founderAdvantage: 10,
      timing: 8,
    },
  },
  {
    id: 'balanced',
    description: 'Equal-ish weights across all dimensions — holistic scoring',
    temperature: 0.4,
    weights: {
      marketFit: 15,
      problemUrgency: 14,
      distributionPotential: 13,
      technicalFeasibility: 12,
      monetizationClarity: 12,
      defensibility: 12,
      founderAdvantage: 11,
      timing: 11,
    },
  },
  {
    id: 'high-temp',
    description: 'Baseline weights with higher temperature — tests scoring diversity',
    temperature: 0.65,
    weights: {
      marketFit: 20,
      problemUrgency: 15,
      distributionPotential: 15,
      technicalFeasibility: 10,
      monetizationClarity: 10,
      defensibility: 10,
      founderAdvantage: 10,
      timing: 10,
    },
  },
  {
    id: 'distribution-focused',
    description: 'Higher weight on distribution and defensibility — GTM-focused scoring',
    temperature: 0.4,
    weights: {
      marketFit: 18,
      problemUrgency: 12,
      distributionPotential: 20,
      technicalFeasibility: 8,
      monetizationClarity: 10,
      defensibility: 15,
      founderAdvantage: 9,
      timing: 8,
    },
  },
];

const TOTAL_SCORE = 100;

/**
 * Verify all variants sum to TOTAL_SCORE.
 */
for (const variant of VARIANTS) {
  const total = Object.values(variant.weights).reduce((sum, v) => sum + v, 0);
  if (total !== TOTAL_SCORE) {
    throw new Error(`Variant "${variant.id}" weights sum to ${total}, expected ${TOTAL_SCORE}`);
  }
}

module.exports = { VARIANTS };
