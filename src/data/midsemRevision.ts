// Midsem syllabus already covered — to be marked as 'Done' (with revision schedule)
// in bulk via the store's bulkMarkForRevisionByName action.
// courseHint is a substring of the actual course name in the user's syllabus
// (the matcher normalizes punctuation/case).

export interface MidsemItem {
  courseHint: string;
  topic: string;
}

export const MIDSEM_REVISION_ITEMS: MidsemItem[] = [
  // DWDM
  { courseHint: 'data warehousing', topic: 'Data warehouse architecture' },
  { courseHint: 'data warehousing', topic: 'Design' },
  { courseHint: 'data warehousing', topic: 'Implementation & maintenance' },
  { courseHint: 'data warehousing', topic: 'OLAP in data warehouse' },
  { courseHint: 'data warehousing', topic: 'Basics of data mining' },
  { courseHint: 'data warehousing', topic: 'Architectures of data mining systems' },
  { courseHint: 'data warehousing', topic: 'Decision tree induction' },
  { courseHint: 'data warehousing', topic: 'Bayesian classification' },
  { courseHint: 'data warehousing', topic: 'Classification using association rules' },
  { courseHint: 'data warehousing', topic: 'Classifier accuracy' },

  // BT — Genomics
  { courseHint: 'genomics', topic: 'Next Generation Sequencing techniques' },
  { courseHint: 'genomics', topic: 'DNA fingerprinting' },
  { courseHint: 'genomics', topic: 'CRISPR-Cas9' },
  { courseHint: 'genomics', topic: 'ZFN' },
  { courseHint: 'genomics', topic: 'TALEN' },
  { courseHint: 'genomics', topic: 'Sequence alignment' },
  { courseHint: 'genomics', topic: 'Expressed Sequence Tag (EST)' },
  { courseHint: 'genomics', topic: 'Serial Analysis of Gene Expression (SAGE)' },
  { courseHint: 'genomics', topic: 'DNA microarray technology' },
  { courseHint: 'genomics', topic: 'Arabidopsis knock-out strategies' },
  { courseHint: 'genomics', topic: 'Real-time PCR' },

  // HU — Engineering Economics (almost all marked TRUE)
  { courseHint: 'engineering economics', topic: 'Concept of mathematical modelling' }, // safe-noop if not present
  { courseHint: 'economics', topic: 'Nature and significance of economics' },
  { courseHint: 'economics', topic: 'Goods and utility' },
  { courseHint: 'economics', topic: 'Basic concept of demand and supply' },
  { courseHint: 'economics', topic: 'Price elasticity of demand' },
  { courseHint: 'economics', topic: 'Cross elasticity of demand' },
  { courseHint: 'economics', topic: 'Production function' },
  { courseHint: 'economics', topic: 'Production process and factors of production' },
  { courseHint: 'economics', topic: 'Monopoly' },
  { courseHint: 'economics', topic: 'Perfect competition' },
  { courseHint: 'economics', topic: 'Oligopoly' },
  { courseHint: 'economics', topic: 'Monopolistic competition' },
  { courseHint: 'economics', topic: 'Cost concepts' },
  { courseHint: 'economics', topic: 'E-commerce' },
  { courseHint: 'economics', topic: 'Money' },
  { courseHint: 'economics', topic: 'Commercial bank' },
  { courseHint: 'economics', topic: 'Central bank' },
  { courseHint: 'economics', topic: 'Tax and subsidy' },
  { courseHint: 'economics', topic: 'Direct and indirect' },
  { courseHint: 'economics', topic: 'Monetary policy' },
  { courseHint: 'economics', topic: 'Fiscal policy' },
  { courseHint: 'economics', topic: 'Inflation' },
  { courseHint: 'economics', topic: 'Business cycle' },
  { courseHint: 'economics', topic: 'IPR' },
  { courseHint: 'economics', topic: 'International trade' },
  { courseHint: 'economics', topic: 'Terms of trade' },
  { courseHint: 'economics', topic: 'Gain from international trade' },
  { courseHint: 'economics', topic: 'Free trade vs' },
  { courseHint: 'economics', topic: 'Dumping' },

  // QIT
  { courseHint: 'quantum', topic: 'Density operator' },
  { courseHint: 'quantum', topic: 'Bloch sphere' },
  { courseHint: 'quantum', topic: 'Reduced density operator' },
  { courseHint: 'quantum', topic: 'Schmidt decomposition' },

  // FE
  { courseHint: 'financial engineering', topic: 'Single-period binomial model' },
  { courseHint: 'financial engineering', topic: 'Multi-period binomial model' },
  { courseHint: 'financial engineering', topic: 'Cox-Ross-Rubinstein (CRR) model' },

  // MMS
  { courseHint: 'mathematical modelling', topic: 'black box' },
  { courseHint: 'mathematical modelling', topic: 'QSM space' },
  { courseHint: 'mathematical modelling', topic: 'Conceptual and physical models' },
  { courseHint: 'mathematical modelling', topic: 'Stationary and non-stationary models' },
  { courseHint: 'mathematical modelling', topic: 'Distributed and lumped models' },
  { courseHint: 'mathematical modelling', topic: 'Phase plane analysis' },
  { courseHint: 'mathematical modelling', topic: 'Linearization' },
  { courseHint: 'mathematical modelling', topic: 'Routh-Hurwitz criteria' },
  { courseHint: 'mathematical modelling', topic: 'Lyapunov functions' },
  { courseHint: 'mathematical modelling', topic: 'Prey-predator model' },
  { courseHint: 'mathematical modelling', topic: 'Growth models' },
  { courseHint: 'mathematical modelling', topic: 'Decay models' },
  { courseHint: 'mathematical modelling', topic: 'Lotka-Volterra model' },
];
