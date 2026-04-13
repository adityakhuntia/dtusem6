import { useStore } from '@/store/useStore';
import { useState } from 'react';
import { Upload } from 'lucide-react';

const DEFAULT_SYLLABUS = `# MC302 – Mathematical Modelling and Simulation

## Unit 1: Mathematical Modelling Basics
- Concept of mathematical modelling
- Modelling approaches: empirical, simulation, deterministic, statistical
- Classification of models: black box, white box
- QSM space
- Qualitative and quantitative approaches
- Conceptual and physical models
- Stationary and non-stationary models
- Distributed and lumped models
- Compartment models

## Unit 2: Stability and Dynamical Systems
- Steady state solution
- Long term behaviour
- Phase plane analysis
- Linearization
- Stability analysis
- Routh-Hurwitz criteria
- Lyapunov functions

## Unit 3: Population Models
- Single population models
- Interacting species models
- Extended population models
- Prey-predator model
- Growth models
- Decay models
- Lotka-Volterra model
- Allee effect

## Unit 4: Epidemic Models
- SI model
- SIS model
- SIR model
- Lanchester combat model
- Case studies

## Unit 5: Bifurcation and Chaos
- Saddle node bifurcation
- Transcritical bifurcation
- Pitchfork bifurcation
- Hopf bifurcation (forward & backward)
- Introduction to chaos theory
- Nonlinear dynamics
- Case studies

---

# MC304 – Financial Engineering

## Unit 1: Basics of Financial Markets
- Basic notions and assumptions
- No-arbitrage principle
- One-step binomial model
- Risk and return
- Forward contracts
- Call and put options
- Managing risk with options

## Unit 2: Option Pricing Models
- Single-period binomial model
- Multi-period binomial model
- Cox-Ross-Rubinstein (CRR) model
- Black-Scholes formula
- CRR as limit of Black-Scholes

## Unit 3: Stochastic Calculus & SDEs
- Brownian motion
- Geometric Brownian motion
- Martingales theory
- Stochastic calculus
- Stochastic differential equations
- Ito's formula
- Feynman-Kac theorem
- Applications in option pricing
- Black-Scholes PDE

## Unit 4: Portfolio Theory
- Markowitz model
- Portfolio optimization
- CAPM
- Limitations of Markowitz model
- New measures of risk

---

# MC314 – Quantum Information Theory

## Unit 1: Quantum Formalism
- Hilbert space
- Dirac notation
- Operators on Hilbert space
- Postulates of quantum mechanics
- Composite systems

## Unit 2: Quantum Computation
- Qubits
- Quantum gates
- Universal gate sets
- Quantum Fourier transform
- Quantum algorithms

## Unit 3: Quantum States & Representations
- Density operator
- Ensembles of quantum states
- Bloch sphere
- Reduced density operator
- Schmidt decomposition
- Purification

## Unit 4: Quantum Noise & Operations
- Environments
- Operator sum representation
- Kraus representation theorem
- Freedom in operator sum representation
- Examples of single qubit quantum noise

## Unit 5: Entanglement Theory
- EPR paradox
- Bell's inequality
- Maximally entangled states
- Non-maximally entangled states
- Non-locality
- Separability problem
- Entanglement measures
- Entanglement in quantum communication

---

# Data Warehousing & Data Mining

## Unit 1: Data Warehousing
- Basics of data warehousing
- Requirement collection
- Data warehouse architecture
- Design
- Implementation & maintenance
- OLAP in data warehouse
- Data warehousing vs web
- Data cube technology
- Data warehousing to data mining

## Unit 2: Data Mining Basics
- Data mining primitives
- Basics of data mining
- Query language
- Architectures of data mining systems

## Unit 3: Association Rule Mining
- Association rule mining
- Single dimensional boolean rules
- Multilevel association rules
- Multidimensional association rules
- Association from relational databases
- Correlation analysis
- Constraint-based mining

## Unit 4: Classification & Prediction
- Classification and prediction
- Decision tree induction
- Bayesian classification
- Backpropagation
- Classification using association rules
- Other classification methods
- Prediction
- Classifier accuracy

## Unit 5: Clustering & Advanced Topics
- Types of clustering data
- Partitioning methods
- Density-based methods
- Grid-based methods
- Model-based clustering
- Outlier analysis
- Multidimensional data analysis
- Spatial data mining
- Time-series mining
- Text mining
- Web mining

---

# BT346 – Genomics and Proteomics

## Unit 1: Tools in Genomics and Genome Editing
- Next Generation Sequencing techniques
- Genome sequencing
- DNA fingerprinting
- CRISPR-Cas9
- ZFN
- TALEN

## Unit 2: Transcriptomics & Functional Genomics Tools
- Sequence alignment
- Expressed Sequence Tag (EST)
- Serial Analysis of Gene Expression (SAGE)
- Total gene expression analysis
- DNA microarray technology
- Oligonucleotide synthesis
- Arabidopsis knock-out strategies
- Real-time PCR

## Unit 3: Proteomics & Protein Engineering
- Protein sequencing
- 2D gel electrophoresis
- Mass spectrometry
- Protein engineering
- Rational protein design
- Directed evolution

## Unit 4: Interactomics
- Chromatin immunoprecipitation (ChIP)
- Gel retardation assay
- DNase I footprinting
- Modification interference assay
- DNA pull-down assay
- Microplate detection
- Reporter assays
- Co-immunoprecipitation
- Yeast two-hybrid
- GFP tagging
- Intein splicing
- TAP tagging
- Protein chips
- Synthetic lethal screens

## Unit 5: Pharmacogenomics & Personalized Medicine
- Single nucleotide polymorphism (SNP)
- Principles of pharmacogenomics
- Case studies in personalized medicine`;

export default function SyllabusImport() {
  const { importSyllabus, topics } = useStore();
  const [text, setText] = useState('');
  const [showInput, setShowInput] = useState(false);

  const handleImport = () => {
    if (text.trim()) {
      importSyllabus(text);
      setText('');
      setShowInput(false);
    }
  };

  const handleLoadDefault = () => {
    importSyllabus(DEFAULT_SYLLABUS);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      importSyllabus(content);
    };
    reader.readAsText(file);
  };

  if (topics.length > 0 && !showInput) return null;

  return (
    <div className="bg-card border rounded-lg p-6 space-y-4">
      <h2 className="text-lg font-semibold text-foreground">Import Syllabus</h2>
      <p className="text-sm text-muted-foreground">Load your syllabus to auto-populate the tracker.</p>

      <div className="flex gap-2 flex-wrap">
        <button
          onClick={handleLoadDefault}
          className="px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:opacity-90 transition"
        >
          Load Default Syllabus
        </button>
        <button
          onClick={() => setShowInput(!showInput)}
          className="px-4 py-2 text-sm rounded-md bg-secondary text-secondary-foreground hover:opacity-90 transition"
        >
          Paste Custom
        </button>
        <label className="px-4 py-2 text-sm rounded-md bg-secondary text-secondary-foreground hover:opacity-90 transition cursor-pointer flex items-center gap-1">
          <Upload size={14} /> Upload File
          <input type="file" accept=".md,.txt,.json" className="hidden" onChange={handleFileUpload} />
        </label>
      </div>

      {showInput && (
        <div className="space-y-2">
          <textarea
            className="w-full h-48 border rounded-md p-3 text-sm bg-background text-foreground resize-y font-mono"
            placeholder="Paste your syllabus in markdown format..."
            value={text}
            onChange={e => setText(e.target.value)}
          />
          <button
            onClick={handleImport}
            disabled={!text.trim()}
            className="px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:opacity-90 transition disabled:opacity-50"
          >
            Import
          </button>
        </div>
      )}
    </div>
  );
}
