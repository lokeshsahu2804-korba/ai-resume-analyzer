/**
 * Job Listings Database Seed Script (scripts/seedJobs.js)
 * Populates MongoDB Atlas with 22 realistic software engineering, AI, cloud, and data science job listings.
 * 
 * Usage: node src/scripts/seedJobs.js
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load server environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

const Job = require('../models/Job');
const { normalizeSkills } = require('../services/job.service');

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('ERROR: MONGODB_URI is not defined in server/.env');
  process.exit(1);
}

const SEED_JOBS = [
  {
    title: 'Lead Full Stack Engineer',
    company: 'Stripe',
    location: 'Remote (India)',
    type: 'full-time',
    experienceLevel: 'senior',
    description:
      'Design, architect, and scale global developer payment infrastructure, high-availability checkout APIs, and interactive analytics dashboards using TypeScript, Node.js, and React.',
    requirements: {
      skills: ['TypeScript', 'Node.js', 'React', 'REST APIs', 'AWS', 'GraphQL', 'Docker', 'System Design'],
      experience: '5+ years designing resilient web services and distributed systems',
      education: 'Bachelor or Master in Computer Science or related engineering field'
    },
    salary: { min: 3500000, max: 4800000, currency: 'INR' },
    applicationUrl: 'https://stripe.com/jobs/lead-full-stack',
    source: 'seed_dataset'
  },
  {
    title: 'Senior Node.js Backend Architect',
    company: 'Razorpay',
    location: 'Bengaluru (Hybrid)',
    type: 'full-time',
    experienceLevel: 'senior',
    description:
      'Architect sub-100ms financial transaction engines, optimize high-throughput MongoDB collections, and implement low-latency Redis caching for millions of concurrent merchant transactions.',
    requirements: {
      skills: ['Node.js', 'Express', 'MongoDB', 'Redis', 'Microservices', 'Kafka', 'System Design'],
      experience: '5+ years building high-load transactional backend architectures',
      education: 'B.Tech / B.E. in Computer Science or Information Technology'
    },
    salary: { min: 3200000, max: 4500000, currency: 'INR' },
    applicationUrl: 'https://razorpay.com/careers/backend-architect',
    source: 'seed_dataset'
  },
  {
    title: 'AI Full Stack Developer',
    company: 'Swiggy',
    location: 'Bengaluru',
    type: 'full-time',
    experienceLevel: 'mid',
    description:
      'Build generative AI customer-assist bots and personalized discovery engines integrating modern LLMs, Python FastAPI microservices, and React Next.js interfaces.',
    requirements: {
      skills: ['Python', 'FastAPI', 'React', 'Next.js', 'PyTorch', 'Vector Databases', 'Docker', 'PostgreSQL'],
      experience: '3+ years full-stack development with practical LLM and ML API integration',
      education: 'Bachelor of Science / B.Tech in Computer Science or Data Science'
    },
    salary: { min: 2500000, max: 3500000, currency: 'INR' },
    applicationUrl: 'https://careers.swiggy.com/ai-developer',
    source: 'seed_dataset'
  },
  {
    title: 'Lead DevOps & Cloud Engineer',
    company: 'Postman',
    location: 'Remote (India)',
    type: 'full-time',
    experienceLevel: 'lead',
    description:
      'Lead our cloud infrastructure group, manage multi-region AWS Kubernetes clusters, automate GitOps release pipelines with Terraform, and enforce zero-trust security controls.',
    requirements: {
      skills: ['AWS', 'Kubernetes', 'Terraform', 'Docker', 'CI/CD', 'GitHub Actions', 'Prometheus', 'Grafana'],
      experience: '7+ years cloud infrastructure, site reliability, and container orchestration',
      education: 'B.Tech / M.Tech in Computer Science or equivalent'
    },
    salary: { min: 4000000, max: 5500000, currency: 'INR' },
    applicationUrl: 'https://postman.com/careers/lead-devops',
    source: 'seed_dataset'
  },
  {
    title: 'Frontend Design Systems Architect',
    company: 'Canva',
    location: 'Remote',
    type: 'full-time',
    experienceLevel: 'senior',
    description:
      'Architect accessible, cross-platform reusable component systems, optimize bundle sizes, and deliver silky-smooth 60fps canvas interactions using modern TypeScript and React.',
    requirements: {
      skills: ['React', 'TypeScript', 'CSS', 'TailwindCSS', 'Web Performance', 'Storybook', 'Figma'],
      experience: '5+ years building modular design systems and web applications',
      education: 'Bachelor in Design, Computer Science, or equivalent'
    },
    salary: { min: 3000000, max: 4200000, currency: 'INR' },
    applicationUrl: 'https://canva.com/careers/frontend-architect',
    source: 'seed_dataset'
  },
  {
    title: 'Data Platform Engineer',
    company: 'Zomato',
    location: 'Gurugram (Hybrid)',
    type: 'full-time',
    experienceLevel: 'mid',
    description:
      'Design real-time streaming data pipelines processing over 2 billion daily delivery and telemetry events using Apache Spark, Kafka, Python, and PostgreSQL.',
    requirements: {
      skills: ['Python', 'SQL', 'Apache Spark', 'Kafka', 'PostgreSQL', 'Airflow', 'AWS S3', 'Snowflake'],
      experience: '3+ years building scalable ETL pipelines and streaming architectures',
      education: 'Degree in Computer Science, Mathematics, or Data Engineering'
    },
    salary: { min: 2200000, max: 3200000, currency: 'INR' },
    applicationUrl: 'https://zomato.com/careers/data-engineer',
    source: 'seed_dataset'
  },
  {
    title: 'Senior Mobile Engineer (React Native)',
    company: 'CRED',
    location: 'Bengaluru',
    type: 'full-time',
    experienceLevel: 'senior',
    description:
      'Build ultra-smooth, gamified mobile financial experiences on iOS and Android with React Native, TypeScript, native Swift/Kotlin bridging, and Redux Toolkit.',
    requirements: {
      skills: ['React Native', 'TypeScript', 'JavaScript', 'Redux', 'iOS', 'Android', 'REST APIs'],
      experience: '4+ years building production consumer mobile apps with high visual polish',
      education: 'B.E. / B.Tech in Computer Science or related discipline'
    },
    salary: { min: 2800000, max: 4000000, currency: 'INR' },
    applicationUrl: 'https://cred.club/careers/mobile-engineer',
    source: 'seed_dataset'
  },
  {
    title: 'Senior Security & DevSecOps Engineer',
    company: 'PhonePe',
    location: 'Bengaluru',
    type: 'full-time',
    experienceLevel: 'senior',
    description:
      'Secure payment processing gateways, implement automated static and dynamic vulnerability scanning in CI/CD, conduct penetration testing, and maintain ISO/PCI-DSS compliance.',
    requirements: {
      skills: ['Security', 'OAuth2', 'JWT', 'AWS Security', 'Penetration Testing', 'Docker', 'Go', 'Python'],
      experience: '5+ years in application security, threat modeling, and cryptography',
      education: 'Bachelor or Master in Cybersecurity or Computer Science'
    },
    salary: { min: 3500000, max: 5000000, currency: 'INR' },
    applicationUrl: 'https://phonepe.com/careers/secops',
    source: 'seed_dataset'
  },
  {
    title: 'Distributed Systems Backend Engineer',
    company: 'Groww',
    location: 'Bengaluru',
    type: 'full-time',
    experienceLevel: 'mid',
    description:
      'Build high-performance stock order routing engines, optimize PostgreSQL schemas, and implement idempotent event-driven message consumers in Go and Java.',
    requirements: {
      skills: ['Go', 'Java', 'PostgreSQL', 'Redis', 'Kafka', 'Microservices', 'Docker'],
      experience: '3+ years developing low-latency distributed systems',
      education: 'B.Tech in Computer Science or related'
    },
    salary: { min: 2400000, max: 3400000, currency: 'INR' },
    applicationUrl: 'https://groww.in/careers/distributed-backend',
    source: 'seed_dataset'
  },
  {
    title: 'Cloud Infrastructure & SRE Engineer',
    company: 'Zepto',
    location: 'Mumbai',
    type: 'full-time',
    experienceLevel: 'mid',
    description:
      'Maintain 99.99% availability for 10-minute grocery delivery dispatch systems, configure Kubernetes auto-scalers, and manage multi-AZ AWS VPCs and databases.',
    requirements: {
      skills: ['Kubernetes', 'Docker', 'AWS', 'Linux', 'Terraform', 'CI/CD', 'Prometheus'],
      experience: '3+ years site reliability and infrastructure engineering',
      education: 'B.E. in Computer Science or IT'
    },
    salary: { min: 2000000, max: 3000000, currency: 'INR' },
    applicationUrl: 'https://zeptonow.com/careers/sre',
    source: 'seed_dataset'
  },
  {
    title: 'Junior Full Stack Engineer',
    company: 'Innovaccer',
    location: 'Noida (Hybrid)',
    type: 'full-time',
    experienceLevel: 'entry',
    description:
      'Develop modern healthcare data visualization dashboards and RESTful API endpoints using Node.js, Express, React, and MongoDB.',
    requirements: {
      skills: ['JavaScript', 'Node.js', 'React', 'Express', 'MongoDB', 'HTML', 'CSS', 'Git'],
      experience: '0-2 years software development or strong project portfolio',
      education: 'B.Tech / B.E. / MCA in Computer Science (2024-2026 Batch)'
    },
    salary: { min: 1000000, max: 1600000, currency: 'INR' },
    applicationUrl: 'https://innovaccer.com/careers/junior-dev',
    source: 'seed_dataset'
  },
  {
    title: 'Senior Machine Learning & NLP Engineer',
    company: 'Flipkart',
    location: 'Bengaluru',
    type: 'full-time',
    experienceLevel: 'senior',
    description:
      'Fine-tune deep learning recommendation models, semantic product search, and multilingual sentiment extractors processing millions of e-commerce catalog queries daily.',
    requirements: {
      skills: ['Python', 'PyTorch', 'TensorFlow', 'NLP', 'Machine Learning', 'Transformers', 'FastAPI', 'AWS'],
      experience: '5+ years machine learning modeling and production deployment',
      education: 'M.Tech / M.S. or Ph.D. in Computer Science, AI, or Computational Linguistics'
    },
    salary: { min: 3800000, max: 5200000, currency: 'INR' },
    applicationUrl: 'https://flipkartcareers.com/ml-engineer',
    source: 'seed_dataset'
  },
  {
    title: 'QA Automation Lead',
    company: 'BrowserStack',
    location: 'Mumbai (Remote)',
    type: 'full-time',
    experienceLevel: 'senior',
    description:
      'Design enterprise end-to-end automated testing frameworks covering web, mobile, and API layers using Playwright, Cypress, TypeScript, and Dockerized test runners.',
    requirements: {
      skills: ['TypeScript', 'JavaScript', 'Playwright', 'Cypress', 'Selenium', 'CI/CD', 'Docker', 'REST APIs'],
      experience: '5+ years software test automation architecture',
      education: 'Bachelor in Computer Science or Information Systems'
    },
    salary: { min: 2600000, max: 3600000, currency: 'INR' },
    applicationUrl: 'https://browserstack.com/careers/qa-lead',
    source: 'seed_dataset'
  },
  {
    title: 'Site Reliability & Platform Engineer',
    company: 'Meesho',
    location: 'Bengaluru',
    type: 'full-time',
    experienceLevel: 'mid',
    description:
      'Manage high-velocity deployment pipelines, optimize cost and resource allocations across 500+ microservices on AWS EKS, and build chaos engineering tests.',
    requirements: {
      skills: ['AWS', 'Kubernetes', 'Helm', 'Terraform', 'Golang', 'Python', 'Datadog'],
      experience: '3+ years SRE and cloud platform operations',
      education: 'B.Tech / B.E. in Engineering'
    },
    salary: { min: 2200000, max: 3200000, currency: 'INR' },
    applicationUrl: 'https://meesho.io/careers/sre-mid',
    source: 'seed_dataset'
  },
  {
    title: 'Senior Python Backend Engineer',
    company: 'Dream11',
    location: 'Mumbai',
    type: 'full-time',
    experienceLevel: 'senior',
    description:
      'Engineer real-time sports gaming leaderboards handling 10M+ concurrent user socket connections with Python, FastAPI, Redis Cluster, and Cassandra.',
    requirements: {
      skills: ['Python', 'FastAPI', 'Redis', 'Cassandra', 'Kafka', 'System Design', 'Docker'],
      experience: '5+ years building hyper-scale real-time backend services',
      education: 'B.Tech / B.E. in Computer Science'
    },
    salary: { min: 3000000, max: 4500000, currency: 'INR' },
    applicationUrl: 'https://dreamsports.group/careers/python-senior',
    source: 'seed_dataset'
  },
  {
    title: 'Lead React & Next.js Engineer',
    company: 'Lenskart',
    location: 'Gurugram',
    type: 'full-time',
    experienceLevel: 'lead',
    description:
      'Lead the e-commerce storefront engineering team, optimize Core Web Vitals, implement 3D virtual try-on web canvas features, and mentor junior engineers.',
    requirements: {
      skills: ['React', 'Next.js', 'TypeScript', 'Redux', 'Web Performance', 'GraphQL', 'TailwindCSS'],
      experience: '7+ years frontend engineering and team leadership',
      education: 'Bachelor or Master in Computer Science'
    },
    salary: { min: 3600000, max: 4800000, currency: 'INR' },
    applicationUrl: 'https://lenskart.com/careers/lead-frontend',
    source: 'seed_dataset'
  },
  {
    title: 'Data Scientist & Recommender Specialist',
    company: 'InMobi',
    location: 'Bengaluru',
    type: 'full-time',
    experienceLevel: 'mid',
    description:
      'Develop algorithmic ad ranking models, user propensity scoring, and real-time CTR prediction pipelines with Python, Scikit-Learn, PyTorch, and Spark.',
    requirements: {
      skills: ['Python', 'SQL', 'Machine Learning', 'Data Science', 'PyTorch', 'Spark', 'FastAPI'],
      experience: '3+ years applied predictive modeling in digital advertising or e-commerce',
      education: 'Master or Bachelor in Statistics, Data Science, or Computer Science'
    },
    salary: { min: 2500000, max: 3800000, currency: 'INR' },
    applicationUrl: 'https://inmobi.com/careers/data-scientist',
    source: 'seed_dataset'
  },
  {
    title: 'Microservices Node.js Developer',
    company: 'Urban Company',
    location: 'Gurugram',
    type: 'full-time',
    experienceLevel: 'mid',
    description:
      'Build partner allocation algorithms, customer booking workflows, and geocoding services using Node.js, Express, MongoDB, and Redis.',
    requirements: {
      skills: ['Node.js', 'Express', 'MongoDB', 'Redis', 'REST APIs', 'AWS', 'Git'],
      experience: '2-4 years backend development',
      education: 'B.Tech / B.E. / MCA in Computer Science'
    },
    salary: { min: 2000000, max: 2800000, currency: 'INR' },
    applicationUrl: 'https://urbancompany.com/careers/backend-mid',
    source: 'seed_dataset'
  },
  {
    title: 'Junior Frontend Developer',
    company: 'Freshworks',
    location: 'Chennai (Hybrid)',
    type: 'full-time',
    experienceLevel: 'entry',
    description:
      'Develop intuitive customer support ticketing components, responsive form layouts, and interactive analytics widgets using React, JavaScript, and CSS.',
    requirements: {
      skills: ['JavaScript', 'React', 'HTML', 'CSS', 'TailwindCSS', 'Git', 'REST APIs'],
      experience: '0-2 years frontend web development experience',
      education: 'Bachelor in Computer Science or related degree'
    },
    salary: { min: 800000, max: 1400000, currency: 'INR' },
    applicationUrl: 'https://freshworks.com/careers/junior-frontend',
    source: 'seed_dataset'
  },
  {
    title: 'Staff Cloud Security Architect',
    company: 'Cisco',
    location: 'Bengaluru',
    type: 'full-time',
    experienceLevel: 'lead',
    description:
      'Define global enterprise cloud security blueprints, architect micro-segmentation policies, and implement federated identity & SAML/OIDC systems.',
    requirements: {
      skills: ['Security', 'Cloud Architecture', 'AWS', 'Kubernetes', 'OAuth2', 'SAML', 'Python', 'Go'],
      experience: '8+ years cloud security architecture and enterprise governance',
      education: 'Master or Bachelor in Information Security or Computer Science'
    },
    salary: { min: 4500000, max: 6500000, currency: 'INR' },
    applicationUrl: 'https://cisco.com/careers/cloud-security-architect',
    source: 'seed_dataset'
  },
  {
    title: 'Go & Kubernetes Platform Engineer',
    company: 'Zerodha',
    location: 'Bengaluru (Remote)',
    type: 'full-time',
    experienceLevel: 'senior',
    description:
      'Build internal developer platforms, custom Kubernetes CRDs, and low-latency financial stream processors in Go with minimal third-party dependencies.',
    requirements: {
      skills: ['Go', 'Kubernetes', 'Docker', 'Linux', 'PostgreSQL', 'Redis', 'gRPC'],
      experience: '4+ years systems programming in Go and container orchestration',
      education: 'Self-taught or Computer Science Degree'
    },
    salary: { min: 3400000, max: 4800000, currency: 'INR' },
    applicationUrl: 'https://zerodha.com/careers/go-engineer',
    source: 'seed_dataset'
  },
  {
    title: 'Senior Product Engineer',
    company: 'Hasura',
    location: 'Remote (India)',
    type: 'full-time',
    experienceLevel: 'senior',
    description:
      'Build instant GraphQL engine connectors, real-time database subscriptions, and developer console experiences using Haskell, Go, React, and TypeScript.',
    requirements: {
      skills: ['TypeScript', 'React', 'Go', 'GraphQL', 'PostgreSQL', 'Docker', 'REST APIs'],
      experience: '4+ years full-stack product engineering',
      education: 'Bachelor of Science / Engineering'
    },
    salary: { min: 3200000, max: 4600000, currency: 'INR' },
    applicationUrl: 'https://hasura.io/careers/product-engineer',
    source: 'seed_dataset'
  }
];

async function seedDatabase() {
  console.log('Connecting to MongoDB Atlas for Job Seeding...');
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to database successfully.');

  console.log('Purging existing seed job postings...');
  const deleteResult = await Job.deleteMany({ source: 'seed_dataset' });
  console.log(`Removed ${deleteResult.deletedCount} previous seed jobs.`);

  console.log(`Normalizing skills and preparing ${SEED_JOBS.length} demo tech job postings...`);
  const jobsToInsert = SEED_JOBS.map((j) => ({
    ...j,
    skillsNormalized: normalizeSkills(j.requirements.skills)
  }));

  const inserted = await Job.insertMany(jobsToInsert);
  console.log(`Successfully seeded ${inserted.length} realistic technology jobs into MongoDB Atlas!`);

  const totalCount = await Job.countDocuments();
  console.log(`Total active jobs in database: ${totalCount}`);

  await mongoose.connection.close();
  console.log('MongoDB connection closed cleanly.');
}

if (require.main === module) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Seed execution failed:', err);
      process.exit(1);
    });
}

module.exports = { seedDatabase, SEED_JOBS };
